"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group } from "three";
import { TRIAD, glow } from "./colors";
import { RING } from "./layout";

// 영역의 끝. 세 영역의 고리가 서로 다른 축으로 기울어 맞물린다. 마지막 방에서 화면을 감싼다.
const TILTS: [number, number, number][] = [
  [0, 0, 0],
  [0.62, 0.18, 0],
  [-0.24, 0.66, 0],
];
const SPEEDS = [0.05, -0.07, 0.04];

export function DomainRing({ reduced }: { reduced: boolean }) {
  const spins = useRef<(Group | null)[]>([]);
  const colors = useMemo(() => TRIAD.map((c) => glow(c, 2.4)), []);

  useFrame((_, delta) => {
    if (reduced) return;
    spins.current.forEach((g, i) => {
      if (g) g.rotation.z += delta * SPEEDS[i];
    });
  });

  return (
    <group position={RING.center}>
      {colors.map((color, i) => (
        <group key={i} rotation={TILTS[i]}>
          <group
            ref={(el) => {
              spins.current[i] = el;
            }}
          >
            {/* 고리 한쪽이 끊겨 있다. 완전한 원이 아니라 서로를 밀어내는 호다. */}
            <mesh>
              <torusGeometry args={[RING.radius + i * 0.45, 0.022, 8, 256, Math.PI * 1.86]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
