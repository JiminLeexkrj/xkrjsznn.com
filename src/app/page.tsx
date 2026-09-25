import Image from "next/image";
import logo from "../../public/logo.png";

// Anton 대문자(X, K, N 등 평평한 글자)의 높이 / font-size. 이 높이를 화면 위아래 끝에 맞춤
// S, J의 둥근 부분은 1.8%쯤 더 튀어나와 화면 밖으로 살짝 잘림
const CAP_HEIGHT = 0.859375;
// 마지막 글자 뒤 여백을 뺀 잉크 폭 / 전체 advance 폭
const INK_WIDTH_RATIO = 0.9922;
const VIEW = 1000;
const FONT_SIZE = VIEW / CAP_HEIGHT;

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <h1 className="sr-only">XKRJSZNN</h1>

      {/* 글자를 화면 위아래 끝까지 늘리기 위해 SVG를 비율 무시(none)로 확장 */}
      <svg
        aria-hidden
        className="absolute inset-x-[1%] inset-y-0 h-full w-[98%]"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="none"
      >
        <text
          x={0}
          y={VIEW}
          textLength={VIEW / INK_WIDTH_RATIO}
          lengthAdjust="spacingAndGlyphs"
          fontSize={FONT_SIZE}
          className="font-display"
          fill="currentColor"
        >
          XKRJSZNN
        </text>
      </svg>

      <Image
        src={logo}
        alt="xkrjsznn 로고"
        preload
        sizes="70vw"
        draggable={false}
        className="absolute top-1/2 left-1/2 h-auto w-[min(70vw,122dvh)] -translate-x-1/2 -translate-y-1/2 select-none"
      />
    </main>
  );
}
