// 각 장면 오른쪽 가장자리에 세로로 흐르는 텍스처 문자. 방의 영역 색을 아주 옅게 띤다.
export function VerticalMark({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      // 3D 공간에서는 카메라 가까이 떠서 시차가 가장 크다
      data-z="-1.6"
      className="pointer-events-none absolute top-28 right-4 font-mincho text-sm tracking-[0.4em] text-domain/70 [writing-mode:vertical-rl] md:right-10"
    >
      {children}
    </span>
  );
}
