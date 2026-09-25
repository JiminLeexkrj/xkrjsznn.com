"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// 느린 네트워크에서도 검은 화면에 멈춰 있지 않도록 이 시간이 지나면 준비 여부와 관계없이 시작
const MAX_WAIT_MS = 2500;

function waitForImage(img: HTMLImageElement | null) {
  if (!img) return Promise.resolve();
  if (img.complete) return img.decode().catch(() => {});
  return new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

// 폰트와 로고가 모두 준비된 뒤에 data-intro="play"로 바꿔 등장 애니메이션을 시작함
export default function IntroStage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ready = Promise.all([
      document.fonts.ready,
      waitForImage(ref.current?.querySelector("img") ?? null),
    ]);
    const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS));
    Promise.race([ready, timeout]).then(() => {
      if (!cancelled) setPlaying(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main ref={ref} data-intro={playing ? "play" : "wait"} className={className}>
      {children}
    </main>
  );
}
