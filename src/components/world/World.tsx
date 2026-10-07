"use client";

import { SpotLight } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { useEntered, useGL } from "@/lib/entered";
import { CameraRig } from "./CameraRig";
import { DUST, EMBER, FROST, HOLLOW, domainAt } from "./colors";
import { DomainRing } from "./DomainRing";
import { Dust } from "./Dust";
import { Effects } from "./Effects";
import { Floor } from "./Floor";
import { GLChambers } from "./gl-text/GLChambers";
import { IntroShards } from "./IntroShards";
import { TROPHY_HALL, generateMonoliths } from "./layout";
import { Monoliths } from "./Monoliths";
import { ProjectSlabs } from "./ProjectSlabs";
import { TrophyHall } from "./TrophyHall";

type Quality = { lite: boolean; reduced: boolean; staged: boolean };

const TERRITORIES = [
  { z: -4, x: -9, color: HOLLOW },
  { z: -44, x: 10, color: FROST },
  { z: -84, x: -6, color: EMBER },
];

function Scene({ lite, reduced, staged }: Quality) {
  const slabs = useMemo(() => generateMonoliths(lite ? 0.6 : 1), [lite]);

  return (
    <>
      <CameraRig reduced={reduced} />

      <ambientLight intensity={0.22} color={DUST} />
      <hemisphereLight args={["#4a423c", "#000000", 0.45]} />
      {/* 등 뒤에서 비추는 빛과, 영역 끝에서 오는 역광. 기둥의 모서리가 살아난다. */}
      <directionalLight position={[14, 30, 30]} intensity={1.9} color={DUST} />
      <directionalLight position={[-8, 14, -170]} intensity={1.6} color="#e8c9b8" />
      {/* 길 위의 낮은 불빛. 그 자리가 속한 영역의 색이다. */}
      {[4, -26, -52, -100, -124].map((z) => (
        <pointLight key={z} position={[0, 0.6, z]} color={domainAt(z)} intensity={10} distance={16} decay={1.6} />
      ))}
      {/* 세 영역이 높은 곳에서 기둥 숲을 옅게 물들인다. 경계에서 색이 서로 밀어낸다. */}
      {TERRITORIES.map(({ z, x, color }) => (
        <pointLight key={z} position={[x, 13, z]} color={color} intensity={lite ? 30 : 36} distance={34} decay={1.4} />
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
      {/* 무대 방식에서는 프로젝트가 글을 품은 석판으로 직접 선다. 그 밖에서는 HTML 목록 뒤의 장식으로 둔다. */}
      {!staged && <ProjectSlabs reduced={reduced} />}
      <TrophyHall reduced={reduced} />
      <IntroShards count={lite ? 46 : 80} reduced={reduced} />
      {/* 장면의 글자와 선. 무대 방식일 때만 3D로 옮긴다. 움직임 줄이기 설정에서는 HTML 그대로 둔다. */}
      {staged && <GLChambers />}
      {!reduced && <Dust count={lite ? 1000 : 2600} />}
      <Effects lite={lite} />
    </>
  );
}

// 화면 뒤에 고정된 3D 영역. 진입 화면도 이 세계 안에서 펼쳐지고, HTML 장면들은 이 위로 스크롤된다.
export default function World() {
  const entered = useEntered();
  const gl = useGL();
  const [ready, setReady] = useState(false);
  const [quality] = useState<Quality>(() => ({
    lite: matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    staged: Boolean(document.documentElement.dataset.stage),
  }));

  return (
    <div
      aria-hidden
      // 장면이 3D로 옮겨지면 링크와 수상 줄을 캔버스에서 직접 누른다
      className={`fixed inset-0 z-0 transition-opacity duration-[1800ms] ease-out ${gl ? "" : "pointer-events-none"} ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas
        dpr={quality.lite ? [1, 1.25] : [1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.1, far: 240, position: [0, 7.3, 100] }}
        onCreated={() => setReady(true)}      >
        {/* 순수한 검정보다 아주 조금 뜬 안개. 먼 기둥이 실루엣으로 떠올라 깊이가 생긴다. */}
        <color attach="background" args={["#0d0b0a"]} />
        <fogExp2 attach="fog" args={["#0d0b0a", 0.024]} />
        <Scene {...quality} />
      </Canvas>
      {/* HTML 글자가 위에 떠 있는 동안에만, 글이 놓이는 왼쪽을 살짝 가라앉혀 읽기 쉽게 한다 */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.6),rgba(0,0,0,0.15)_55%,transparent)] transition-opacity duration-1000 ${
          entered && !gl ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
