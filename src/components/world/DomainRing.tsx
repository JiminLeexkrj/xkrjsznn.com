"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group } from "three";
import { RED, glow } from "./colors";
import { RING } from "./layout";

// 영역의 경계. 어디서든 길 끝에 보이고, 마지막에 카메라가 이 고리를 통과한다.
export function DomainRing({ reduced }: { reduced: boolean }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const bright = useMemo(() => glow(RED, 7), []);
  const dim = useMemo(() => glow(RED, 1.6), []);

  useFrame((_, delta) => {
    if (reduced) return;
    outer.current!.rotation.z += delta * 0.04;
    inner.current!.rotation.z -= delta * 0.07;
  });

  return (
    <group position={RING.center}>
      <group ref={outer}>
        <mesh>
          <torusGeometry args={[RING.radius, 0.08, 12, 256]} />
          <meshBasicMaterial color={bright} toneMapped={false} />
        </mesh>
      </group>
      <group ref={inner} rotation-x={0.06}>
        <mesh>
          <torusGeometry args={[RING.radius + 1.1, 0.025, 8, 256]} />
          <meshBasicMaterial color={dim} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
