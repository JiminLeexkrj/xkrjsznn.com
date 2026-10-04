"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { RED, glow } from "./colors";
import { createConcreteTexture } from "./concrete-texture";
import type { Slab } from "./layout";

// 판마다 크기가 제각각이라 UV를 쓰면 질감이 늘어난다.
// 월드 좌표로 세 방향에서 투영해 어느 면이든 같은 밀도의 콘크리트가 되게 한다.
function createConcreteMaterial() {
  const texture = createConcreteTexture();
  const material = new MeshStandardMaterial({ color: "#77716a", roughness: 0.92, metalness: 0.04 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uConcrete = { value: texture };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;",
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        mat4 instanceWorld = modelMatrix * instanceMatrix;
        vWorldPos = (instanceWorld * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize(mat3(instanceWorld) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uConcrete;\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;",
      )
      .replace(
        "#include <map_fragment>",
        `vec3 blend = abs(normalize(vWorldNormal));
        blend /= blend.x + blend.y + blend.z;
        vec3 p = vWorldPos * 0.18;
        float concrete = texture2D(uConcrete, p.zy).r * blend.x
          + texture2D(uConcrete, p.xz).r * blend.y
          + texture2D(uConcrete, p.xy).r * blend.z;
        diffuseColor.rgb *= 0.45 + concrete * 1.1;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "float roughnessFactor = roughness * (0.8 + concrete * 0.3);",
      );
  };
  return material;
}

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
