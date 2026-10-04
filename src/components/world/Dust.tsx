"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial } from "three";
import { DUST } from "./colors";
import { rng } from "./layout";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.y = mod(p.y + uTime * (0.08 + aSeed * 0.12), 24.0);
  p.x += sin(uTime * 0.17 + aSeed * 6.283) * 0.6;
  p.z += cos(uTime * 0.11 + aSeed * 6.283) * 0.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.5 + aSeed * 2.5) * uPixelRatio * (14.0 / -mv.z);
  vAlpha = smoothstep(55.0, 6.0, -mv.z) * smoothstep(0.3, 2.0, -mv.z);
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.55;
  gl_FragColor = vec4(uColor * a, a);
}`;

// 공기 중에 떠다니는 먼지. 공간에 부피가 있다는 감각을 준다.
export function Dust({ count }: { count: number }) {
  const material = useRef<ShaderMaterial>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rand = rng(7);
    const positions: number[] = [];
    const seeds: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push((rand() - 0.5) * 40, rand() * 24, 140 - rand() * 290);
      seeds.push(rand());
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: DUST.clone() } }),
    [],
  );

  useFrame((_, delta) => {
    const m = material.current!;
    m.uniforms.uTime.value += delta;
    m.uniforms.uPixelRatio.value = dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
