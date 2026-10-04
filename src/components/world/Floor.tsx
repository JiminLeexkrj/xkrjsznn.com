"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { RED, glow } from "./colors";
import { positionCurve } from "./layout";

/** 카메라 경로를 따라 바닥에 깔린 리본. offset만큼 옆으로 떨어져 있다. */
function ribbon(offset: number, width: number) {
  const points = positionCurve.getSpacedPoints(300);
  // 출발점보다 앞쪽, 끝점보다 뒤쪽으로 곧게 늘린다
  const first = points[0];
  const last = points[points.length - 1];
  points.unshift(new Vector3(first.x, 0, first.z + 40));
  points.push(new Vector3(last.x, 0, last.z - 60));

  const positions: number[] = [];
  const indices: number[] = [];
  points.forEach((p, i) => {
    const next = points[Math.min(i + 1, points.length - 1)];
    const prev = points[Math.max(i - 1, 0)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const cx = p.x + nx * offset;
    const cz = p.z + nz * offset;
    positions.push(cx - nx * width, 0.012, cz - nz * width, cx + nx * width, 0.012, cz + nz * width);
    if (i < points.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function Floor({ lite }: { lite: boolean }) {
  const lines = useMemo(() => [ribbon(-1.5, 0.025), ribbon(1.5, 0.025)], []);
  const lineColor = useMemo(() => glow(RED, 4), []);

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -40]}>
        {/* 진입 장면이 펼쳐지는 입구 너머까지 덮는다 */}
        <planeGeometry args={[560, 560]} />
        {lite ? (
          <meshStandardMaterial color="#040303" roughness={0.9} metalness={0.3} />
        ) : (
          <MeshReflectorMaterial
            resolution={1024}
            blur={[400, 120]}
            mixBlur={1}
            mixStrength={7}
            mixContrast={1.1}
            depthScale={1.2}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.4}
            mirror={0.85}
            roughness={0.7}
            metalness={0.8}
            color="#040303"
          />
        )}
      </mesh>
      {lines.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial color={lineColor} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
