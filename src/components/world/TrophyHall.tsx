"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Raycaster,
  TorusGeometry,
  Vector2,
} from "three";
import { awardsByYear, reservedPlinths, type Medal } from "@/content/awards";
import { world } from "@/lib/world-store";
import { DUST, RED, glow } from "./colors";
import { createConcreteMaterial } from "./concrete-material";
import { TROPHY_HALL, waypoints } from "./layout";
import { createMedalEnvironment } from "./medal-environment";
import { createMedalFace } from "./medal-face";

const awards = awardsByYear();
const RADIUS = 0.8;
const viewer = waypoints.find((w) => w.section === "trophies")!.position;

const tint: Record<Medal, string> = { gold: "#f2c96a", silver: "#e9e9e9", bronze: "#d58e5c" };
const plinthHeight: Record<Medal | "reserved", number> = { gold: 1.7, silver: 1.4, bronze: 1.15, reserved: 0.9 };

/** 관람자를 향해 오목하게 휜 반원 위의 자리들 */
function layoutSlots(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : MathUtils.lerp(-0.95, 0.95, i / (count - 1));
    // 왼쪽은 HTML 목록 자리라 조금 오른쪽으로 비켜 선다
    const x = TROPHY_HALL.x + 2 + Math.sin(t) * 6.4;
    const z = TROPHY_HALL.z + 2 - Math.cos(t) * 5;
    return { x, z, facing: Math.atan2(viewer.x - x, viewer.z - z) };
  });
}

/** 각도를 목표에 가장 가까운 바퀴로 옮긴다. 돌던 메달이 한 바퀴 더 돌지 않게 한다. */
function nearestTurn(current: number, target: number) {
  return target + Math.round((current - target) / (Math.PI * 2)) * Math.PI * 2;
}

export function TrophyHall({ reduced }: { reduced: boolean }) {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => createMedalEnvironment(gl), [gl]);
  const faces = useMemo(() => awards.map((a) => createMedalFace(a)), []);
  const concrete = useMemo(() => createConcreteMaterial("#6f6a63"), []);
  const slots = useMemo(() => layoutSlots(awards.length + reservedPlinths), []);
  const coinGeometry = useMemo(() => new CylinderGeometry(RADIUS, RADIUS, 0.1, 96).rotateX(Math.PI / 2), []);
  const rimGeometry = useMemo(() => new TorusGeometry(RADIUS, 0.045, 16, 96), []);
  const lineColor = useMemo(() => glow(RED, 5), []);
  const waitingColor = useMemo(() => glow(RED, 1.5), []);

  const materials = useMemo(
    () =>
      awards.map((award, i) => {
        const base = { color: new Color(tint[award.medal]), metalness: 1, envMap: env, envMapIntensity: 1.4 };
        const side = new MeshStandardMaterial({ ...base, roughness: 0.16 });
        const face = new MeshStandardMaterial({
          ...base,
          roughness: 0.22,
          map: faces[i].texture,
          bumpMap: faces[i].texture,
          bumpScale: 4,
        });
        // 원기둥의 재질 순서: 옆면, 윗면, 아랫면. 윗면이 앞을 보도록 돌려 두었다.
        return { coin: [side, face, face], rim: side };
      }),
    [env, faces],
  );

  // 웹폰트가 늦게 도착했으면 다시 새긴다
  useEffect(() => {
    let alive = true;
    void document.fonts.ready.then(() => {
      if (alive) faces.forEach((f) => f.draw());
    });
    return () => {
      alive = false;
    };
  }, [faces]);

  useEffect(
    () => () => {
      env.dispose();
      faces.forEach((f) => f.texture.dispose());
      materials.forEach((m) => {
        m.coin[0].dispose();
        m.coin[1].dispose();
      });
      concrete.dispose();
    },
    [env, faces, materials, concrete],
  );

  const medals = useRef<(Group | null)[]>([]);
  const coins = useRef<(Mesh | null)[]>([]);
  const waiting = useRef<(Group | null)[]>([]);
  const light = useRef<PointLight>(null);
  const raycaster = useMemo(() => new Raycaster(), []);
  const pointer = useMemo(() => new Vector2(), []);
  const lastActive = useRef<number | null>(null);

  useFrame(({ camera, clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const time = clock.elapsedTime;

    // 메달에 직접 마우스를 올려도, 아래 목록에 올려도 같은 메달이 반응한다
    raycaster.setFromCamera(pointer.set(world.pointer.x, world.pointer.y), camera);
    const targets = coins.current.filter((c): c is Mesh => c !== null);
    const hit = raycaster.intersectObjects(targets, false)[0];
    const pointed = hit ? coins.current.indexOf(hit.object as Mesh) : null;
    const active = world.hoveredAward ?? pointed;

    if (active !== lastActive.current) {
      lastActive.current = active;
      document.querySelectorAll<HTMLElement>("[data-award-index]").forEach((el) => {
        el.toggleAttribute("data-active", Number(el.dataset.awardIndex) === active);
      });
    }

    medals.current.forEach((group, i) => {
      if (!group) return;
      const slot = slots[i];
      const isActive = active === i;
      const baseY = plinthHeight[awards[i].medal] + 1.15;
      const bob = reduced ? 0 : Math.sin(time * 0.9 + i * 1.3) * 0.08;
      group.position.y = MathUtils.damp(group.position.y, baseY + bob + (isActive ? 0.25 : 0), 5, delta);

      if (isActive || reduced) {
        const target = slot.facing + (isActive ? world.pointer.x * 0.5 : 0);
        group.rotation.y = MathUtils.damp(group.rotation.y, nearestTurn(group.rotation.y, target), 6, delta);
        group.rotation.x = MathUtils.damp(group.rotation.x, isActive ? -world.pointer.y * 0.35 : 0, 6, delta);
      } else {
        group.rotation.y += delta * (0.5 + i * 0.07);
        group.rotation.x = MathUtils.damp(group.rotation.x, 0, 4, delta);
      }
      const scale = MathUtils.damp(group.scale.x, isActive ? 1.18 : 1, 6, delta);
      group.scale.setScalar(scale);
    });

    waiting.current.forEach((ring, i) => {
      if (!ring) return;
      if (!reduced) ring.rotation.y = time * 0.3 + i;
    });

    const l = light.current!;
    l.intensity = MathUtils.damp(l.intensity, active === null ? 0 : 14, 6, delta);
    if (active !== null) {
      const slot = slots[active];
      l.position.set(slot.x + Math.sin(slot.facing) * 2, plinthHeight[awards[active].medal] + 1.8, slot.z + Math.cos(slot.facing) * 2);
    }
  });

  return (
    <group>
      {slots.map((slot, i) => {
        const award = awards[i];
        const height = plinthHeight[award ? award.medal : "reserved"];
        return (
          <group key={i} position={[slot.x, 0, slot.z]} rotation-y={slot.facing}>
            <mesh material={concrete} position={[0, height / 2, 0]}>
              <boxGeometry args={[1.3, height, 1.3]} />
            </mesh>
            {/* 받침대 앞면 윗단의 가는 붉은 선 */}
            <mesh position={[0, height - 0.12, 0.655]}>
              <boxGeometry args={[1.0, 0.018, 0.01]} />
              <meshBasicMaterial color={lineColor} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {awards.map((award, i) => {
        const slot = slots[i];
        return (
          <group
            key={`${award.event}-${award.year}-${award.prize}`}
            ref={(el) => {
              medals.current[i] = el;
            }}
            position={[slot.x, plinthHeight[award.medal] + 1.15, slot.z]}
            rotation-y={slot.facing}
          >
            <mesh
              ref={(el) => {
                coins.current[i] = el;
              }}
              geometry={coinGeometry}
              material={materials[i].coin}
            />
            <mesh geometry={rimGeometry} material={materials[i].rim} />
          </group>
        );
      })}

      {/* 아직 비어 있는 자리. 메달 대신 희미한 고리가 떠 있다. */}
      {slots.slice(awards.length).map((slot, i) => (
        <group
          key={`waiting-${i}`}
          ref={(el) => {
            waiting.current[i] = el;
          }}
          position={[slot.x, plinthHeight.reserved + 1.15, slot.z]}
        >
          <mesh>
            <torusGeometry args={[RADIUS, 0.012, 8, 96]} />
            <meshBasicMaterial color={waitingColor} toneMapped={false} />
          </mesh>
        </group>
      ))}

      <pointLight ref={light} color={DUST} intensity={0} distance={6} decay={1.5} />
    </group>
  );
}
