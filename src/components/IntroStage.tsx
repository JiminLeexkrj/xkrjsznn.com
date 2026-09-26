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
// 로딩과 등장 애니메이션 동안에는 data-scroll-locked로 스크롤을 막음
export default function IntroStage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const [locked, setLocked] = useState(true);

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

  // 등장 애니메이션이 모두 끝나면 스크롤 잠금을 풂(모션 줄이기 설정이면 애니메이션이 없어 바로 풀림)
  useEffect(() => {
    if (!playing || !ref.current) return;
    let cancelled = false;
    const animations = ref.current.getAnimations({ subtree: true });
    Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => {
      if (!cancelled) setLocked(false);
    });
    return () => {
      cancelled = true;
    };
  }, [playing]);

  return (
    <main
      ref={ref}
      data-intro={playing ? "play" : "wait"}
      data-scroll-locked={locked || undefined}
      className={className}
    >
      {children}
    </main>
  );
}
