import { awards, reservedPlinths, type Medal } from "@/content/awards";
import { Chamber } from "../Chamber";

// 크롬 금속처럼 보이도록 원뿔 그라디언트로 반사광을 흉내 낸다
const medalSurface: Record<Medal, string> = {
  gold: "conic-gradient(from 210deg, #fff3c4, #a67c1a, #f7d774, #5c400b, #ffe9a3, #8a6512, #fff3c4)",
  silver: "conic-gradient(from 210deg, #ffffff, #7d7d7d, #e8e8e8, #3d3d3d, #f5f5f5, #8f8f8f, #ffffff)",
  bronze: "conic-gradient(from 210deg, #f4c89a, #7a3f17, #e0a06a, #3d1c08, #f0b98a, #8c4a1e, #f4c89a)",
};

const plinthHeight: Record<Medal, string> = {
  gold: "h-56 md:h-80",
  silver: "h-44 md:h-64",
  bronze: "h-36 md:h-52",
};

export function TrophyRoom() {
  const sorted = [...awards].sort((a, b) => b.year - a.year);

  return (
    <Chamber id="trophies" title="Trophies" mark="戦績">
      <ul className="mt-auto grid grid-cols-2 items-end gap-x-4 gap-y-14 sm:grid-cols-3 md:gap-x-8 lg:grid-cols-5">
        {sorted.map((award) => (
          <li key={`${award.event}-${award.year}-${award.prize}`} className="flex flex-col">
            <div
              aria-hidden
              className="mx-auto mb-4 aspect-square w-16 rounded-full shadow-[inset_0_0_0_3px_rgba(0,0,0,0.35),0_0_40px_rgba(217,211,199,0.08)] md:w-24"
              style={{ background: medalSurface[award.medal] }}
            />
            <div
              aria-hidden
              className={`${plinthHeight[award.medal]} mx-auto w-3/5 border-t border-[#3a3835] bg-gradient-to-b from-[#2a2826] to-concrete`}
            />
            <div lang="ko" className="mt-4 text-center font-ko">
              <p className="text-lg font-bold md:text-xl">{award.prize}</p>
              <p className="mt-1 text-sm text-ash">{award.event}</p>
              <p className="mt-1 wdth-75 text-sm text-ash tabular-nums">{award.year}</p>
              {award.detail && <p className="mt-3 text-sm">{award.detail}</p>}
            </div>
          </li>
        ))}
        {Array.from({ length: reservedPlinths }, (_, i) => (
          <li key={`reserved-${i}`} className="flex flex-col">
            <div aria-hidden className="mx-auto mb-4 aspect-square w-16 md:w-24" />
            <div aria-hidden className="mx-auto h-28 w-3/5 border border-dashed border-ash/40 md:h-40" />
            <p lang="ko" className="mt-4 text-center font-ko text-sm text-ash">
              다음 자리
            </p>
          </li>
        ))}
      </ul>
    </Chamber>
  );
}
