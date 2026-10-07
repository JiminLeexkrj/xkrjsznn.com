"use client";

import { useEffect, useRef } from "react";
import { scrollToY } from "@/lib/scroll";
import { STEP, STOPS, shape, timeline } from "@/lib/timeline";
import { world } from "@/lib/world-store";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * 장면 하나를 진행값과의 거리(d)에 맞춰 놓는다.
 * d < 0: 아직 앞에 있는 방. 깊은 곳에서 작고 흐릿하게 다가온다.
 * d = 0: 카메라가 서 있는 방. 그대로 읽힌다.
 * d > 0: 지나온 방. 카메라 옆을 스치며 커지고 사라진다.
 */
function place(el: HTMLElement, d: number, blurOn: boolean) {
  const s = el.style;
  const k = Math.abs(d);
  // 멀리 있는 방은 투명하게만 둔다. visibility로 숨기면 키보드 초점이 닿지 않는다.
  if (k > 0.985) {
    s.opacity = "0";
    s.pointerEvents = "none";
    return;
  }
  if (k < 0.002) {
    s.transform = "none";
    s.opacity = "1";
    s.filter = "none";
    s.pointerEvents = "auto";
    return;
  }

  let z: number, x: number, opacity: number, blur: number, dim: number;
  if (d < 0) {
    z = -1500 * k;
    x = 0;
    opacity = 1 - smoothstep(0.25, 0.95, k);
    blur = 9 * k;
    dim = 1 - 0.55 * k;
  } else {
    // 카메라 옆을 스치도록 크게 다가오며 왼쪽으로 빠진다
    z = 760 * k;
    x = -10 * k;
    opacity = 1 - smoothstep(0.05, 0.75, k);
    blur = 10 * k;
    dim = 1;
  }
  s.transform = `translate3d(${x.toFixed(3)}vw, 0, ${z.toFixed(1)}px)`;
  s.opacity = opacity.toFixed(3);
  s.filter = blurOn ? `blur(${blur.toFixed(2)}px) brightness(${dim.toFixed(3)})` : `brightness(${dim.toFixed(3)})`;
  s.pointerEvents = k < 0.25 ? "auto" : "none";
}

/**
 * 장면들을 담는 무대.
 * 무대 방식에서는 장면이 화면에 고정되고, 스크롤은 시간축이 되어 카메라와 장면을 함께 움직인다.
 * 움직임 줄이기 설정이나 스크립트가 없으면 장면은 평범하게 위아래로 흐른다.
 */
export function Stage({ children }: { children: React.ReactNode }) {
  const rigRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const staged = Boolean(root.dataset.stage);
    timeline.staged = staged;
    const panels = STOPS.map((id) => document.getElementById(id)!);
    const rig = rigRef.current!;
    const blurOn = !matchMedia("(pointer: coarse)").matches;

    // 방 하나를 지나는 데 드는 스크롤 거리. 주소창이 접혀도 흔들리지 않게 큰 화면 높이(lvh)를 쓴다.
    let stepPx = 1;
    // 일반 스크롤일 때 각 장면이 시작되는 위치
    let anchors: number[] = [];
    const measure = () => {
      stepPx = probeRef.current!.offsetHeight * STEP;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      let previous = 0;
      anchors = panels.map((el, i) => {
        const top = i === panels.length - 1 ? max : el.offsetTop;
        previous = Math.min(max, Math.max(previous, top));
        return previous;
      });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);

    const rawPosition = (y: number) => {
      if (staged) return y / stepPx;
      let segment = 0;
      while (segment < anchors.length - 2 && y >= anchors[segment + 1]) segment++;
      const span = anchors[segment + 1] - anchors[segment];
      return segment + (span > 0 ? Math.min(1, Math.max(0, (y - anchors[segment]) / span)) : 1);
    };

    const tilt = { x: 0, y: 0 };
    let handedOff = false;
    let last = performance.now();
    let raf = 0;
    const frame = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      timeline.position = shape(rawPosition(window.scrollY));

      if (staged && root.dataset.gl === "on") {
        // 장면이 3D 공간으로 옮겨졌다. 보이지 않는 HTML 층은 제자리에 두고 더는 움직이지 않는다.
        if (!handedOff) {
          handedOff = true;
          panels.forEach((el) => el.removeAttribute("style"));
          rig.style.transform = "none";
        }
      } else if (staged) {
        panels.forEach((el, i) => place(el, timeline.position - i, blurOn));
        // 카메라가 마우스 쪽으로 고개를 돌리면 글자 층도 같은 각도로 돈다
        const ease = 1 - Math.exp(-4 * dt);
        tilt.x += (world.pointer.x - tilt.x) * ease;
        tilt.y += (world.pointer.y - tilt.y) * ease;
        rig.style.transform = `translate3d(${(-tilt.x * 16).toFixed(2)}px, ${(tilt.y * 10).toFixed(2)}px, 0) rotateY(${(-tilt.x * 2.4).toFixed(3)}deg) rotateX(${(-tilt.y * 1.6).toFixed(3)}deg)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    if (!staged) {
      return () => {
        cancelAnimationFrame(raf);
        resize.disconnect();
      };
    }

    // 메뉴나 로고를 누르면 그 방으로 날아간다
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const index = link ? STOPS.indexOf(link.hash.slice(1) as (typeof STOPS)[number]) : -1;
      if (index < 0) return;
      e.preventDefault();
      scrollToY(index * stepPx);
    };
    // 키보드로 다른 방의 링크에 초점이 가면 그 방으로 이동해 보이게 한다
    const onFocus = (e: FocusEvent) => {
      const index = panels.findIndex((el) => el.contains(e.target as Node));
      if (index >= 0 && Math.round(timeline.position) !== index) scrollToY(index * stepPx);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("focusin", onFocus);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <>
      <div className="stage">
        <div ref={rigRef} className="stage-rig">
          {children}
        </div>
      </div>
      <div aria-hidden className="stage-track" style={{ "--stops": STOPS.length, "--step": STEP } as React.CSSProperties}>
        <div ref={probeRef} className="h-lvh" />
      </div>
    </>
  );
}
