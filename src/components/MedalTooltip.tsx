"use client";

import { useEffect, useRef, useState } from "react";
import { awardsByYear, type Medal } from "@/content/awards";
import { world } from "@/lib/world-store";

const awards = awardsByYear();
const OFFSET = 22;

const swatch: Record<Medal, string> = {
  gold: "conic-gradient(from 210deg, #fff3c4, #a67c1a, #f7d774, #5c400b, #fff3c4)",
  silver: "conic-gradient(from 210deg, #ffffff, #7d7d7d, #e8e8e8, #3d3d3d, #ffffff)",
  bronze: "conic-gradient(from 210deg, #f4c89a, #7a3f17, #e0a06a, #3d1c08, #f4c89a)",
};

// 3D 홀의 메달에 커서를 올리면 커서 옆에 뜨는 라벨. 상자 대신 호박빛 가는 선 하나와 글만 있다.
// 커서를 따라가되 화면 오른쪽·아래 끝에서는 반대편으로 넘어간다.
export function MedalTooltip() {
  const [index, setIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let shown: number | null = null;
    const frame = () => {
      const pointed = world.pointedAward;
      if (pointed !== shown) {
        shown = pointed;
        setIndex(pointed);
      }
      const el = ref.current;
      if (el && shown !== null) {
        const { x, y } = world.pointerPx;
        const flipX = x + OFFSET + el.offsetWidth > window.innerWidth - 16;
        const flipY = y + OFFSET + el.offsetHeight > window.innerHeight - 16;
        const left = flipX ? x - OFFSET - el.offsetWidth : x + OFFSET;
        const top = flipY ? y - OFFSET - el.offsetHeight : y + OFFSET;
        el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const award = index === null ? null : awards[index];

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed top-0 left-0 z-50 max-w-72 border-l border-ember/70 bg-void/55 py-2.5 pr-4 pl-3.5 backdrop-blur-sm transition-opacity duration-200 ${
        award ? "opacity-100" : "opacity-0"
      }`}
    >
      {award && (
        <div lang="ko" className="font-ko">
          <p className="flex items-center gap-2 text-base font-bold text-ember">
            <span className="size-2.5 rounded-full" style={{ background: swatch[award.medal] }} />
            {award.prize}
          </p>
          <p className="mt-1 text-sm leading-snug text-dust">{award.event}</p>
          <p className="mt-1 wdth-75 font-sans text-xs text-ash tabular-nums">{award.year}</p>
          {award.detail && <p className="mt-2 text-xs leading-relaxed text-ash">{award.detail}</p>}
        </div>
      )}
    </div>
  );
}
