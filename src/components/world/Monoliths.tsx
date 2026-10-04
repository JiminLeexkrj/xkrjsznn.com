"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import { RED, glow } from "./colors";
import { createConcreteMaterial } from "./concrete-material";
import type { Slab } from "./layout";

export function Monoliths({ slabs }: { slabs: Slab[] }) {
  const bodies = useRef<InstancedMesh>(null);
  const cracks = useRef<InstancedMesh>(null);
  const material = useMemo(() => createConcreteMaterial(), []);
  const slitted = useMemo(() => slabs.filter((s) => s.slit !== 0), [slabs]);
  const crackColor = useMemo(() => glow(RED, 6), []);

  useLayoutEffect(() => {
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const color = new Color();

    slabs.forEach((s, i) => {
      rotation.setFromEuler(new Euler(...s.rotation));
      matrix.compose(new Vector3(...s.position), rotation, new Vector3(...s.size));
      bodies.current!.setMatrixAt(i, matrix);
      bodies.current!.setColorAt(i, color.setScalar(s.shade));
    });
    bodies.current!.instanceMatrix.needsUpdate = true;
    bodies.current!.instanceColor!.needsUpdate = true;

    // 길 쪽 면에 박힌 가느다란 붉은 균열
    const local = new Matrix4();
    slitted.forEach((s, i) => {
      rotation.setFromEuler(new Euler(...s.rotation));
      matrix.compose(new Vector3(...s.position), rotation, new Vector3(1, 1, 1));
      const height = Math.min(s.size[1] * 0.55, 9);
      local.compose(
        new Vector3(s.slit * (s.size[0] / 2 + 0.01), -s.size[1] / 2 + 0.4 + height / 2, 0),
        new Quaternion(),
        new Vector3(0.035, height, 0.035),
      );
      cracks.current!.setMatrixAt(i, matrix.clone().multiply(local));
    });
    cracks.current!.instanceMatrix.needsUpdate = true;
  }, [slabs, slitted]);

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, material, slabs.length]}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={cracks} args={[undefined, undefined, slitted.length]}>
        <boxGeometry />
        <meshBasicMaterial color={crackColor} toneMapped={false} />
      </instancedMesh>
    </>
  );
}
