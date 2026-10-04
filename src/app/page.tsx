import { Frame } from "@/components/Frame";
import { Contact } from "@/components/chambers/Contact";
import { Dossier } from "@/components/chambers/Dossier";
import { Identity } from "@/components/chambers/Identity";
import { TrophyRoom } from "@/components/chambers/TrophyRoom";
import { Works } from "@/components/chambers/Works";

export default function Home() {
  return (
    <>
      <Frame />
      <main>
        <Identity />
        <Dossier />
        <Works />
        <TrophyRoom />
        <Contact />
      </main>
    </>
  );
}
