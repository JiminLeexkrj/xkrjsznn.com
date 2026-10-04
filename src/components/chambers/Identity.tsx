import { profile } from "@/content/profile";
import { VerticalMark } from "../VerticalMark";

const [first, ...rest] = profile.name.en.split(" ");

export function Identity() {
  return (
    <section
      id="identity"
      aria-labelledby="identity-title"
      className="relative flex min-h-svh flex-col justify-end overflow-hidden px-4 pt-28 pb-8 md:px-10 md:pb-10"
    >
      <VerticalMark>無形</VerticalMark>

      <p
        lang="ko"
        aria-hidden
        className="absolute top-24 right-12 font-ko text-[min(17vw,17svh)] leading-none font-black whitespace-nowrap text-blood [writing-mode:vertical-rl] md:top-28 md:right-24"
      >
        {profile.name.ko}
      </p>

      <h1
        id="identity-title"
        className="relative text-[clamp(4.5rem,19vw,20rem)] leading-[0.78] font-black uppercase"
      >
        <span className="block wdth-125">{first}</span>
        <span className="block wdth-62">{rest.join(" ")}</span>
        <span className="sr-only"> ({profile.name.ko})</span>
      </h1>

      <div className="relative mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-3 md:mt-12">
        <p className="wdth-112 text-lg md:text-2xl">{profile.role}</p>
        <p lang="ko" className="font-ko text-base text-ash md:text-lg">
          {profile.status}
        </p>
      </div>
    </section>
  );
}
