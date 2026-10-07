"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { scroller } from "@/lib/scroll";
import { world } from "@/lib/world-store";

// 관성 있는 스크롤. 카메라가 스크롤을 따라 움직이므로 뚝뚝 끊기지 않게 한다.
export function SmoothScroll() {
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") world.pointerSeen = true;
      world.pointerPx.x = e.clientX;
      world.pointerPx.y = e.clientY;
      world.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      world.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => window.removeEventListener("pointermove", onPointerMove);
    }

    const root = document.documentElement;
    // 무대 방식에서는 장면이 화면에 고정되어 있으므로 앵커 이동은 Stage가 맡는다
    const lenis = new Lenis({ autoRaf: true, anchors: !root.dataset.stage, lerp: 0.085 });
    scroller.lenis = lenis;
    // 진입 화면이 떠 있는 동안은 스크롤을 막는다
    if (!root.dataset.entered) lenis.stop();
    const observer = new MutationObserver(() => {
      if (root.dataset.entered) lenis.start();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-entered"] });

    return () => {
      observer.disconnect();
      lenis.destroy();
      scroller.lenis = null;
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return null;
}
