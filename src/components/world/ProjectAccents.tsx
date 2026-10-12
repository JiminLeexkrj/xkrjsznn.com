"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Box3, Color, Euler, Mesh, MeshBasicMaterial, Quaternion, Ray, Vector3 } from "three";
import { projects } from "@/content/projects";
import { world } from "@/lib/world-store";
import { type Slab, rng, waypoints } from "./layout";

/** 프로젝트마다 빛이 피어오르는 기둥 수. 몇 개만 골라 절제한다. */
const PER_PROJECT = 5;
/** 빛줄이 기둥 하나를 다 타고 오르는 시간과, 기둥 사이의 시차(초) */
const RISE = 0.5;
const STAGGER = 0.08;

const works = waypoints.find((w) => w.section === "works")!;

type Seam = {
  project: number;
  order: number;
  /** 빛줄 아래 끝(바닥)의 월드 좌표 */
  base: Vector3;
  up: Vector3;
  height: number;
  quaternion: Quaternion;
};

/**
 * Works 방에서 보이는 기둥 가운데, 프로젝트마다 겹치지 않게 몇 개를 고른다.
 * 고른 기둥의 카메라 쪽 면에 세로 빛줄 하나를 붙인다.
 */
function pickSeams(slabs: Slab[]): Seam[] {
  const eye = works.position;
  const forward = works.target.clone().sub(eye).setY(0).normalize();
  const rand = rng(77);

  const candidates = slabs
    .map((s) => {
      const [x, y, z] = s.position;
      const [w, h, d] = s.size;
      const bottom = y - h / 2;
      const toSlab = new Vector3(x, 0, z).sub(new Vector3(eye.x, 0, eye.z));
      const along = toSlab.dot(forward);
      const angle = Math.acos(Math.min(1, along / toSlab.length()));
      return { s, w, h, d, bottom, along, angle };
    })
    // 땅에 선 기둥만, 글 뒤쪽 시야 안에서
    .filter((c) => c.bottom < 0.5 && c.h > 5 && c.along > 8 && c.along < 55 && c.angle < 0.58)
    .map((c) => ({ ...c, key: rand() }))
    .sort((a, b) => a.key - b.key);

  // 다른 기둥에 가려 카메라에서 안 보이는 기둥은 뺀다. 기둥을 회전을 무시한 상자로 어림한다.
  const boxes = slabs.map((s) => {
    const [x, y, z] = s.position;
    const [w, h, d] = s.size;
    const r = Math.max(w, d) / 2;
    return new Box3(new Vector3(x - r, y - h / 2, z - r), new Vector3(x + r, y + h / 2, z + r));
  });
  const visible = (target: Vector3, self: Slab) => {
    const toTarget = target.clone().sub(eye);
    const ray = new Ray(eye.clone(), toTarget.clone().normalize());
    const distance = toTarget.length();
    const hit = new Vector3();
    return slabs.every(
      (other, k) => other === self || !ray.intersectBox(boxes[k], hit) || hit.distanceTo(eye) > distance - 0.6,
    );
  };
  const seen = candidates.filter((c) => {
    const [x, , z] = c.s.position;
    return [1.2, 3.5, 6].every((y) => visible(new Vector3(x, Math.min(y, c.bottom + c.h - 0.5), z), c.s));
  });

  const seams: Seam[] = [];
  seen.slice(0, PER_PROJECT * projects.length).forEach((c, i) => {
    const [x, , z] = c.s.position;
    const quaternion = new Quaternion().setFromEuler(new Euler(...c.s.rotation));
    // 기둥의 네 옆면 가운데 카메라를 가장 정면으로 보는 면
    const toEye = new Vector3(eye.x - x, 0, eye.z - z).normalize();
    const faces = [
      { normal: new Vector3(1, 0, 0), half: c.w / 2, span: c.d },
      { normal: new Vector3(-1, 0, 0), half: c.w / 2, span: c.d },
      { normal: new Vector3(0, 0, 1), half: c.d / 2, span: c.w },
      { normal: new Vector3(0, 0, -1), half: c.d / 2, span: c.w },
    ].map((f) => ({ ...f, world: f.normal.clone().applyQuaternion(quaternion) }));
    const face = faces.reduce((a, b) => (b.world.dot(toEye) > a.world.dot(toEye) ? b : a));
    // 면 위에서 가운데보다 조금 비켜난 자리
    const sideways = new Vector3(face.normal.z, 0, -face.normal.x).applyQuaternion(quaternion);
    const offset = (rand() - 0.5) * face.span * 0.5;
    const height = Math.min(c.h * 0.9, 9 + rand() * 7);
    const base = new Vector3(x, c.bottom + 0.05, z)
      .addScaledVector(face.world, face.half + 0.012)
      .addScaledVector(sideways, offset);
    // 기둥의 회전에 면의 국소 회전을 곱한다. 기운 기둥에서도 빛줄이 기둥 축을 따라 선다.
    const local = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), face.normal);
    seams.push({
      project: i % projects.length,
      order: Math.floor(i / projects.length),
      base,
      up: new Vector3(0, 1, 0).applyQuaternion(quaternion),
      height,
      quaternion: quaternion.clone().multiply(local),
    });
  });
  return seams;
}

// 프로젝트에 마우스를 올리면, 그 프로젝트의 상징 색이 기둥 몇 개를 타고 바닥에서 위로 피어오른다.
export function ProjectAccents({ slabs, reduced }: { slabs: Slab[]; reduced: boolean }) {
  const seams = useMemo(() => pickSeams(slabs), [slabs]);
  const colors = useMemo(() => projects.map((p) => new Color(p.color).multiplyScalar(4.5)), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const state = useRef({ hovered: null as number | null, since: 0, levels: seams.map(() => 0) });

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const s = state.current;
    const hovered = world.hoveredProject;
    if (hovered !== s.hovered) {
      s.hovered = hovered;
      s.since = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - s.since;

    seams.forEach((seam, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const on = hovered === seam.project;
      let level = s.levels[i];
      if (on) {
        // 기둥마다 조금씩 늦게, 바닥에서 위로 그어진다
        const t = reduced ? 1 : Math.min(1, Math.max(0, (elapsed - seam.order * STAGGER) / RISE));
        level = Math.max(level, 1 - Math.pow(1 - t, 3));
      } else {
        level = reduced ? 0 : Math.max(0, level - delta * 3.2);
      }
      s.levels[i] = level;

      mesh.visible = level > 0.002;
      const length = seam.height * level;
      mesh.scale.set(0.06, Math.max(1e-4, length), 1);
      mesh.position.copy(seam.base).addScaledVector(seam.up, length / 2);
      (mesh.material as MeshBasicMaterial).opacity = on ? 1 : level;
    });
  });

  return (
    <>
      {seams.map((seam, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          quaternion={seam.quaternion}
          visible={false}
        >
          <planeGeometry />
          <meshBasicMaterial color={colors[seam.project]} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
