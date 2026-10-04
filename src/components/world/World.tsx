"use client";

import { SpotLight } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { useEntered } from "@/lib/entered";
import { CameraRig } from "./CameraRig";
import { DUST, RED } from "./colors";
import { DomainRing } from "./DomainRing";
import { Dust } from "./Dust";
import { Effects } from "./Effects";
import { Floor } from "./Floor";
import { IntroShards } from "./IntroShards";
import { TROPHY_HALL, generateMonoliths } from "./layout";
import { Monoliths } from "./Monoliths";
import { ProjectSlabs } from "./ProjectSlabs";
import { TrophyHall } from "./TrophyHall";

type Quality = { lite: boolean; reduced: boolean };

function Scene({ lite, reduced }: Quality) {
  const slabs = useMemo(() => generateMonoliths(lite ? 0.6 : 1), [lite]);

  return (
    <>
      <CameraRig reduced={reduced} />

      <ambientLight intensity={0.22} color={DUST} />
      <hemisphereLight args={["#4a423c", "#000000", 0.45]} />
      {/* 등 뒤에서 비추는 빛과, 영역 끝에서 오는 역광. 기둥의 모서리가 살아난다. */}
      <directionalLight position={[14, 30, 30]} intensity={1.9} color={DUST} />
      <directionalLight position={[-8, 14, -170]} intensity={1.6} color="#e8c9b8" />
      {[4, -26, -52, -100, -124].map((z) => (
        <pointLight key={z} position={[0, 0.6, z]} color={RED} intensity={22} distance={18} decay={1.6} />
      ))}

      {/* 위에서 떨어지는 빛기둥 */}
      <SpotLight
        position={[12, 26, -12]}
        target-position={[10, 0, -16]}
        color="#d9d3c7"
        intensity={260}
        angle={0.3}
        penumbra={0.9}
        distance={45}
        attenuation={26}
        anglePower={6}
        opacity={lite ? 0 : 0.12}
        volumetric={!lite}
      />
      <SpotLight
        position={[TROPHY_HALL.x, 30, TROPHY_HALL.z]}
        target-position={[TROPHY_HALL.x, 0, TROPHY_HALL.z]}
        color="#d9d3c7"
        intensity={420}
        angle={0.38}
        penumbra={0.8}
        distance={50}
        attenuation={34}
        anglePower={4}
        opacity={lite ? 0 : 0.14}
        volumetric={!lite}
      />

      <Monoliths slabs={slabs} />
      <Floor lite={lite} />
      <DomainRing reduced={reduced} />
      <ProjectSlabs reduced={reduced} />
      <TrophyHall reduced={reduced} />
      <IntroShards count={lite ? 46 : 80} reduced={reduced} />
      {!reduced && <Dust count={lite ? 1000 : 2600} />}
      <Effects lite={lite} />
    </>
  );
}

// 화면 뒤에 고정된 3D 영역. 진입 화면도 이 세계 안에서 펼쳐지고, HTML 장면들은 이 위로 스크롤된다.
export default function World() {
  const entered = useEntered();
  const [ready, setReady] = useState(false);
  const [quality] = useState<Quality>(() => ({
    lite: matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-[1800ms] ease-out ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas
        dpr={quality.lite ? [1, 1.25] : [1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.1, far: 240, position: [0, 7.3, 100] }}
        onCreated={() => setReady(true)}
      >
        {/* 순수한 검정보다 아주 조금 뜬 안개. 먼 기둥이 실루엣으로 떠올라 깊이가 생긴다. */}
        <color attach="background" args={["#0d0b0a"]} />
        <fogExp2 attach="fog" args={["#0d0b0a", 0.024]} />
        <Scene {...quality} />
      </Canvas>
      {/* 글이 놓이는 왼쪽을 살짝 가라앉혀 읽기 쉽게 한다 */}
      <div
        className={`absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.6),rgba(0,0,0,0.15)_55%,transparent)] transition-opacity duration-1000 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
