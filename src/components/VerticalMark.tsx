// 각 장면 오른쪽 가장자리에 세로로 흐르는 텍스처 문자
export function VerticalMark({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-28 right-4 font-mincho text-sm tracking-[0.4em] text-ash [writing-mode:vertical-rl] md:right-10"
    >
      {children}
    </span>
  );
}
