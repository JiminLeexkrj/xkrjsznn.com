"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { world } from "@/lib/world-store";

// 관성 있는 스크롤. 카메라가 스크롤을 따라 움직이므로 뚝뚝 끊기지 않게 한다.
export function SmoothScroll() {
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      world.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      world.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => window.removeEventListener("pointermove", onPointerMove);
    }

    const root = document.documentElement;
    const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.085 });
    // 진입 화면이 떠 있는 동안은 스크롤을 막는다
    if (!root.dataset.entered) lenis.stop();
    const observer = new MutationObserver(() => {
      if (root.dataset.entered) lenis.start();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-entered"] });

    return () => {
      observer.disconnect();
      lenis.destroy();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return null;
}
