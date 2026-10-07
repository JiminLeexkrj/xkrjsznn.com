import type Lenis from "lenis";

// 관성 스크롤 인스턴스. 무대 방식에서 메뉴가 특정 방으로 이동할 때 쓴다.
export const scroller: { lenis: Lenis | null } = { lenis: null };

export function scrollToY(y: number, immediate = false) {
  if (scroller.lenis) scroller.lenis.scrollTo(y, { immediate, duration: immediate ? 0 : 1.8 });
  else window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });
}
