"use client";

import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction, type ChromaticAberrationEffect } from "postprocessing";
import { useRef } from "react";
import { Vector2 } from "three";
import { world } from "@/lib/world-store";

const offset = new Vector2();

export function Effects({ lite }: { lite: boolean }) {
  const aberration = useRef<ChromaticAberrationEffect>(null);

  // 빠르게 스크롤할 때만 색이 갈라진다
  useFrame(() => {
    const v = world.velocity;
    aberration.current?.offset.set(v * 0.006, v * 0.0025);
  });

  if (lite) {
    return (
      <EffectComposer multisampling={0} resolutionScale={0.5}>
        <Bloom mipmapBlur intensity={1} luminanceThreshold={0.92} luminanceSmoothing={0.2} />
        <Vignette darkness={0.6} offset={0.3} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.92} luminanceSmoothing={0.2} radius={0.75} />
      <ChromaticAberration
        ref={aberration}
        blendFunction={BlendFunction.NORMAL}
        offset={offset}
        radialModulation
        modulationOffset={0.25}
      />
      <Vignette darkness={0.6} offset={0.3} />
    </EffectComposer>
  );
}
