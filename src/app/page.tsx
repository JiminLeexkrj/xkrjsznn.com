import type { CSSProperties } from "react";
import Image from "next/image";
import IntroStage from "@/components/IntroStage";
import logo from "../../public/logo.png";

// Anton 대문자(X, K, N 등 평평한 글자)의 높이 / font-size. 이 높이를 화면 위아래 끝에 맞춤
// S, J의 둥근 부분은 1.8%쯤 더 튀어나와 화면 밖으로 살짝 잘림
const CAP_HEIGHT = 0.859375;
const VIEW = 1000;
const FONT_SIZE = VIEW / CAP_HEIGHT;

// Anton 1000px 기준 글자별 advance 폭(커닝 없음). 글자를 하나씩 움직이기 위해 따로 배치
const LETTERS = [
  ["X", 483.887],
  ["K", 472.168],
  ["R", 476.563],
  ["J", 466.309],
  ["S", 461.426],
  ["Z", 410.156],
  ["N", 498.047],
  ["N", 498.047],
] as const;
// 마지막 N의 오른쪽 여백을 뺀 잉크 폭. 이 폭을 뷰박스 가로에 맞춤
const INK_WIDTH = 3737.305;
const SCALE = VIEW / INK_WIDTH;

const layout = LETTERS.reduce<{ char: string; x: number; width: number }[]>(
  (acc, [char, advance]) => {
    const prev = acc.at(-1);
    const x = prev ? prev.x + prev.width : 0;
    return [...acc, { char, x, width: advance * SCALE }];
  },
  [],
);

export default function Home() {
  return (
    <IntroStage className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <h1 className="sr-only">XKRJSZNN</h1>
      {/* 자바스크립트가 꺼져 있으면 애니메이션 없이 바로 보여줌 */}
      <noscript>
        <style>{`.intro-logo, .intro-letter { visibility: visible !important; }`}</style>
      </noscript>

      {/* 글자를 화면 위아래 끝까지 늘리기 위해 SVG를 비율 무시(none)로 확장 */}
      <svg
        aria-hidden
        className="absolute inset-x-[1%] inset-y-0 h-full w-[98%]"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="none"
      >
        {layout.map(({ char, x, width }, i) => (
          <g
            key={i}
            className="intro-letter"
            // 홀수번째 글자는 위에서, 짝수번째 글자는 아래에서 들어옴(SVG 안에서 px = 뷰박스 단위)
            // S, J의 둥근 끝이 출발 전에 보이지 않도록 화면 높이보다 조금 더 바깥에서 출발
            style={{ "--from": `${(i % 2 === 0 ? -1 : 1) * VIEW * 1.1}px` } as CSSProperties}
          >
            <text
              x={x}
              y={VIEW}
              textLength={width}
              lengthAdjust="spacingAndGlyphs"
              fontSize={FONT_SIZE}
              className="font-display"
              fill="currentColor"
            >
              {char}
            </text>
          </g>
        ))}
      </svg>

      <Image
        src={logo}
        alt="xkrjsznn 로고"
        preload
        sizes="70vw"
        draggable={false}
        className="intro-logo absolute top-1/2 left-1/2 h-auto w-[min(70vw,122dvh)] -translate-x-1/2 -translate-y-1/2 select-none"
      />
    </IntroStage>
  );
}
