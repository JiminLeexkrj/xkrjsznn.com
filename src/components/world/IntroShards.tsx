"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Quaternion,
  Vector3,
} from "three";
import { IMPLODE, burstProgress, intro } from "@/lib/intro-store";
import { DUST, TRIAD } from "./colors";
import { createConcreteMaterial } from "./concrete-material";
import { INTRO, rng } from "./layout";

type Shard = {
  size: [number, number, number];
  /** 소용돌이 위의 처음 각도와 반지름 */
  theta: number;
  radius: number;
  depth: number;
  omega: number;
  axis: Vector3;
  spin: number;
  phase: number;
  /** 폭발할 때 날아가는 방향과 거리 */
  out: Vector3;
  distance: number;
  crack: boolean;
};

// 영역이 생기기 전, 허공에 흩어져 떠도는 기둥의 파편들
function makeShards(count: number): Shard[] {
  const rand = rng(1312);
  return Array.from({ length: count }, () => {
    const kind = rand();
    const size: [number, number, number] =
      kind < 0.45
        ? [0.22 + rand() * 0.45, 1.2 + rand() * 3, 0.22 + rand() * 0.45] // 부러진 기둥
        : kind < 0.8
          ? [0.7 + rand() * 1.6, 0.7 + rand() * 1.6, 0.12 + rand() * 0.22] // 깨진 판
          : [0.4 + rand() * 0.8, 0.4 + rand() * 0.8, 0.4 + rand() * 0.8]; // 덩어리
    const theta = rand() * Math.PI * 2;
    return {
      size,
      theta,
      radius: 2.4 + Math.pow(rand(), 0.7) * 9,
      depth: (rand() - 0.5) * 7,
      // 대부분 같은 방향으로 돌아 소용돌이가 되고, 몇 개만 거슬러 돈다
      omega: (0.07 + rand() * 0.12) * (rand() < 0.88 ? 1 : -1),
      axis: new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      spin: 0.2 + rand() * 0.8,
      phase: rand() * 10,
      // 사방으로 퍼져 공중에 걸린다. 카메라는 그 파편 구름을 뚫고 지나간다.
      out: new Vector3(Math.cos(theta), Math.sin(theta) * 0.6, (rand() - 0.45) * 0.9).normalize(),
      distance: 12 + rand() * 26,
      crack: rand() < 0.3,
    };
  });
}

const smooth = (t: number) => t * t * (3 - 2 * t);
/** 세 고리가 처음에 기울어 있는 각도(x, y). 누를수록 풀려 한 면으로 겹친다. */
const RING_TILTS: [number, number][] = [
  [0, 0],
  [0.9, 0.25],
  [-0.35, 0.95],
];
/** 균열은 꼭짓점 색(영역)에 이 밝기를 곱해 빛난다 */
const CRACK_GLOW = new Color(4, 4, 4);

export function IntroShards({ count, reduced }: { count: number; reduced: boolean }) {
  const shards = useMemo(() => makeShards(count), [count]);
  const cracked = useMemo(() => shards.flatMap((s, i) => (s.crack ? [i] : [])), [shards]);
  const material = useMemo(() => createConcreteMaterial("#7d766e"), []);
  // 이미 들어온 뒤에 불러와졌다면 이 장면은 필요 없다
  const [hidden] = useState(() => Boolean(document.documentElement.dataset.entered));

  const group = useRef<Group>(null);
  const bodies = useRef<InstancedMesh>(null);
  const cracks = useRef<InstancedMesh>(null);
  const core = useRef<Mesh>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const light = useRef<PointLight>(null);
  const state = useRef({ frames: 0, hold: 0, swirl: 0, built: false });

  const tmp = useMemo(
    () => ({
      m: new Matrix4(),
      base: new Matrix4(),
      local: new Matrix4(),
      q: new Quaternion(),
      p: new Vector3(),
      s: new Vector3(),
      one: new Vector3(),
      identity: new Quaternion(),
    }),
    [],
  );

  // 파편의 균열은 세 영역의 색을 나눠 갖는다
  useLayoutEffect(() => {
    cracked.forEach((_, k) => cracks.current!.setColorAt(k, TRIAD[k % 3]));
    if (cracks.current!.instanceColor) cracks.current!.instanceColor.needsUpdate = true;
  }, [cracked]);

  useFrame((_, rawDelta) => {
    const st = state.current;
    const delta = Math.min(rawDelta, 0.1);
    // 셰이더가 컴파일되고 몇 프레임 그려진 뒤에야 준비된 것으로 알린다
    if (++st.frames === 3) intro.ready = true;

    const b = burstProgress();
    if (hidden || b >= 1) {
      group.current!.visible = false;
      return;
    }

    const entered = Boolean(document.documentElement.dataset.entered);
    const animate = !reduced && (!entered || b > 0);
    if (!animate && st.built) return;
    st.built = true;

    st.hold = MathUtils.damp(st.hold, intro.hold, 10, delta);
    const h = smooth(st.hold);
    if (animate) st.swirl += delta * (1 + st.hold * st.hold * 10);
    const t = st.swirl;

    const implode = b > 0 ? Math.min(1, b / IMPLODE) : 0;
    const blast = b > IMPLODE ? (b - IMPLODE) / (1 - IMPLODE) : 0;
    // 처음엔 터져 나가고, 곧 느려져 떠 있다
    const blastEase = 1 - Math.pow(1 - blast, 5) + blast * 0.25;
    const shake = !reduced && st.hold > 0.55 && blast === 0 ? ((st.hold - 0.55) / 0.45) * 0.14 : 0;
    const { m, base, local, q, p, s, one, identity } = tmp;

    shards.forEach((shard, i) => {
      if (blast > 0) {
        p.copy(shard.out).multiplyScalar(0.3 + blastEase * shard.distance).add(INTRO.center);
      } else {
        const angle = shard.theta + t * shard.omega;
        const r = shard.radius * MathUtils.lerp(1, 0.07, h) * (1 - implode * 0.95);
        p.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.55, shard.depth * (1 - h * 0.9) * (1 - implode));
        p.add(INTRO.center);
        if (shake) p.set(p.x + (Math.random() - 0.5) * shake, p.y + (Math.random() - 0.5) * shake, p.z);
      }
      q.setFromAxisAngle(shard.axis, shard.phase + t * shard.spin * 0.6 + blast * 14 * shard.spin);
      const scale =
        blast > 0 ? MathUtils.lerp(0.3, 1.15, Math.min(1, blast * 3)) : (1 - h * 0.35) * (1 - implode * 0.65);
      s.set(shard.size[0] * scale, shard.size[1] * scale, shard.size[2] * scale);
      m.compose(p, q, s);
      bodies.current!.setMatrixAt(i, m);

      if (shard.crack) {
        base.compose(p, q, one.setScalar(scale));
        local.compose(
          s.set(shard.size[0] / 2 + 0.01, 0, 0),
          identity,
          one.set(0.03, shard.size[1] * 0.75, 0.03),
        );
        cracks.current!.setMatrixAt(cracked.indexOf(i), base.multiply(local));
      }
    });
    bodies.current!.instanceMatrix.needsUpdate = true;
    cracks.current!.instanceMatrix.needsUpdate = true;

    // 가운데의 씨앗. 세 영역이 눌려 모일수록 하얗게 달아오르고, 압축되는 순간 터진다.
    const coreMat = core.current!.material as MeshBasicMaterial;
    if (blast > 0) {
      core.current!.scale.setScalar(MathUtils.lerp(2.2, 0, Math.min(1, blast * 4)));
      coreMat.color.copy(DUST).multiplyScalar(30);
    } else {
      core.current!.scale.setScalar(MathUtils.lerp(0.35, 1.1, h) * (1 + implode * 1.2));
      coreMat.color.copy(DUST).multiplyScalar(1.2 + h * 6 + implode * 24);
    }

    // 세 영역의 고리. 서로 다른 축으로 기운 채 돌며 조여들다가, 각자 다른 빠르기의 충격파로 퍼진다.
    TRIAD.forEach((domainColor, k) => {
      const ring = rings.current[k];
      if (!ring) return;
      const speed = 1 + k * 0.35;
      const radius =
        blast > 0
          ? MathUtils.lerp(0.6, 40 + k * 8, 1 - Math.pow(2, -2.8 * speed * blast))
          : MathUtils.lerp(6.5 + k * 0.5, 1.2 + k * 0.15, h) * (1 - implode * 0.55);
      ring.scale.set(radius, radius, 1);
      ring.rotation.z = t * (0.05 + k * 0.02) * (k % 2 ? -1 : 1);
      // 누를수록 기울기가 풀려 한 면으로 겹친다. 맞부딪히는 순간이다.
      const tilt = 1 - h * 0.85 - implode * 0.15;
      ring.rotation.x = RING_TILTS[k][0] * tilt;
      ring.rotation.y = RING_TILTS[k][1] * tilt;
      (ring.material as MeshBasicMaterial).color.copy(domainColor).multiplyScalar((2 + h * 2.5) * Math.pow(1 - blast, 1.2));
    });

    // 빛은 세 영역을 번갈아 돈다. 누를수록 빨리 돈다.
    const l = light.current!;
    const phase = (t * 0.35) % 3;
    const from = TRIAD[Math.floor(phase)];
    const to = TRIAD[(Math.floor(phase) + 1) % 3];
    l.color.copy(from).lerp(to, phase % 1);
    if (blast > 0) {
      l.color.copy(DUST);
      l.intensity = 500 * Math.pow(1 - blast, 3);
    } else {
      l.intensity = 6 + h * 70 + implode * 300;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={bodies} args={[undefined, material, shards.length]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={cracks} args={[undefined, undefined, cracked.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={CRACK_GLOW} toneMapped={false} />
      </instancedMesh>
      <mesh ref={core} position={INTRO.center}>
        <sphereGeometry args={[0.3, 32, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </mesh>
      {TRIAD.map((_, k) => (
        <mesh
          key={k}
          ref={(el) => {
            rings.current[k] = el;
          }}
          position={INTRO.center}
        >
          <torusGeometry args={[1, 0.0055, 8, 192, Math.PI * 1.86]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
      ))}
      <pointLight ref={light} position={INTRO.center} distance={40} decay={1.4} />
    </group>
  );
}
