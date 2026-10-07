"use client";

import type { Award, Medal } from "@/content/awards";
import { world } from "@/lib/world-store";

// 목록 옆의 작은 견본. 3D 메달과 같은 금속색이다.
const swatch: Record<Medal, string> = {
  gold: "conic-gradient(from 210deg, #fff3c4, #a67c1a, #f7d774, #5c400b, #fff3c4)",
  silver: "conic-gradient(from 210deg, #ffffff, #7d7d7d, #e8e8e8, #3d3d3d, #ffffff)",
  bronze: "conic-gradient(from 210deg, #f4c89a, #7a3f17, #e0a06a, #3d1c08, #f4c89a)",
};

// 마우스를 올리면 3D 홀의 해당 메달이 돌아선다. 메달에 마우스를 올리면 이 줄이 강조된다.
export function AwardRow({ award, index }: { award: Award; index: number }) {
  return (
    <li
      data-award-index={index}
      lang="ko"
      onPointerEnter={() => {
        world.hoveredAward = index;
      }}
      onPointerLeave={() => {
        if (world.hoveredAward === index) world.hoveredAward = null;
      }}
      className="group grid grid-cols-[0.75rem_3rem_1fr_auto] items-baseline gap-x-3 border-b border-dust/15 py-3 font-ko transition-colors data-[active]:text-domain md:gap-x-4"
    >
      <span
        aria-hidden
        data-gl-swatch={award.medal}
        className="size-3 translate-y-0.5 rounded-full transition-transform group-data-[active]:scale-125"
        style={{ background: swatch[award.medal] }}
      />
      <span className="font-bold">{award.prize}</span>
      <span className="text-sm text-ash group-data-[active]:text-dust md:text-base">{award.event}</span>
      <span className="wdth-75 text-sm text-ash tabular-nums">{award.year}</span>
      {award.detail && <p className="col-start-3 col-end-5 mt-1 text-sm text-ash">{award.detail}</p>}
    </li>
  );
}
