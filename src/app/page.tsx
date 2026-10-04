import { Frame } from "@/components/Frame";
import { SmoothScroll } from "@/components/SmoothScroll";
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
      <main className="relative z-10">
        <Identity />
        <Dossier />
        <Works />
        <TrophyRoom />
        <Contact />
      </main>
    </>
  );
}
