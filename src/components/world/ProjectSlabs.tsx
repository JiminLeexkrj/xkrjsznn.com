"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, EdgesGeometry, Group, LineBasicMaterial, MathUtils, PointLight, Vector3 } from "three";
import { projects } from "@/content/projects";
import { world } from "@/lib/world-store";
import { RED } from "./colors";
import { WORKS_ROOM, waypoints } from "./layout";

const SIZE: [number, number, number] = [2.4, 3.6, 0.12];
const viewer = waypoints.find((w) => w.section === "works")!.position;

// Works 방에 떠 있는 검은 석판. 프로젝트 하나에 하나씩, 목록에 마우스를 올리면 그 석판이 돌아선다.
export function ProjectSlabs({ reduced }: { reduced: boolean }) {
  const groups = useRef<(Group | null)[]>([]);
  const edges = useRef<(LineBasicMaterial | null)[]>([]);
  const light = useRef<PointLight>(null);
  const edgeGeometry = useMemo(() => new EdgesGeometry(new BoxGeometry(...SIZE)), []);

  const slots = useMemo(() => {
    const forward = WORKS_ROOM.clone().sub(viewer).setY(0).normalize();
    const right = new Vector3(-forward.z, 0, forward.x);
    return projects.map((_, i) => {
      const t = i - (projects.length - 1) / 2;
      const base = WORKS_ROOM.clone()
        .addScaledVector(right, t * 3.4)
        .addScaledVector(forward, Math.abs(t) * 1.2);
      const facing = Math.atan2(viewer.x - base.x, viewer.z - base.z);
      return { base, facing, idleYaw: facing + (i % 2 ? 0.35 : -0.35), toward: forward.clone().negate() };
    });
  }, []);

  useFrame(({ clock }, delta) => {
    const hovered = world.hoveredProject;
    const time = clock.elapsedTime;
    slots.forEach((slot, i) => {
      const group = groups.current[i];
      const edge = edges.current[i];
      if (!group || !edge) return;
      const active = hovered === i;
      const float = reduced ? 0 : Math.sin(time * 0.6 + i * 1.7) * 0.12;
      const lift = active ? 1.4 : 0;

      group.position.x = MathUtils.damp(group.position.x, slot.base.x + slot.toward.x * lift, 5, delta);
      group.position.z = MathUtils.damp(group.position.z, slot.base.z + slot.toward.z * lift, 5, delta);
      group.position.y = MathUtils.damp(group.position.y, slot.base.y + float + (active ? 0.25 : 0), 5, delta);
      group.rotation.y = MathUtils.damp(group.rotation.y, active ? slot.facing : slot.idleYaw, 4, delta);
      const scale = MathUtils.damp(group.scale.x, active ? 1.1 : 1, 5, delta);
      group.scale.setScalar(scale);

      const intensity = hovered === null ? 1.4 : active ? 9 : 0.4;
      const current = edge.userData.intensity ?? 1.4;
      edge.userData.intensity = MathUtils.damp(current, intensity, 6, delta);
      edge.color.copy(RED).multiplyScalar(edge.userData.intensity);
    });

    const l = light.current!;
    l.intensity = MathUtils.damp(l.intensity, hovered === null ? 0 : 60, 5, delta);
    if (hovered !== null) {
      const slot = slots[hovered];
      l.position.set(slot.base.x + slot.toward.x * 3.2, slot.base.y + 0.5, slot.base.z + slot.toward.z * 3.2);
    }
  });

  return (
    <>
      {slots.map((slot, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={slot.base}
          rotation-y={slot.idleYaw}
        >
          <mesh>
            <boxGeometry args={SIZE} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.85} roughness={0.2} />
          </mesh>
          <lineSegments geometry={edgeGeometry}>
            <lineBasicMaterial
              ref={(el) => {
                edges.current[i] = el;
              }}
              color={RED}
              toneMapped={false}
            />
          </lineSegments>
        </group>
      ))}
      <pointLight ref={light} color={RED} intensity={0} distance={12} decay={2} />
    </>
  );
}
