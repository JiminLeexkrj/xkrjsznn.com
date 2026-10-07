import { Frame } from "@/components/Frame";
import { MedalTooltip } from "@/components/MedalTooltip";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Stage } from "@/components/Stage";
import { Contact } from "@/components/chambers/Contact";
import { Dossier } from "@/components/chambers/Dossier";
import { Identity } from "@/components/chambers/Identity";
import { TrophyRoom } from "@/components/chambers/TrophyRoom";
import { Works } from "@/components/chambers/Works";
import { Intro } from "@/components/intro/Intro";
import { WorldLoader } from "@/components/world/WorldLoader";

export default function Home() {
  return (
    <>
      <Intro />
      <SmoothScroll />
      <WorldLoader />
      <Frame />
      {/* main 밖에 둔다. 장면이 3D로 옮겨지면 main은 투명해진다. */}
      <MedalTooltip />
      <main className="relative z-10">
        {/* 순서는 timeline.ts의 STOPS와 같다 */}
        <Stage>
          <Identity />
          <Dossier />
          <Works />
          <TrophyRoom />
          <Contact />
        </Stage>
      </main>
    </>
  );
}
