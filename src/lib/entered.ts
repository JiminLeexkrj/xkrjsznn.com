"use client";

import { useSyncExternalStore } from "react";

// 진입 화면을 지나 영역이 열렸는지. <html data-entered>가 기준이다.

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-entered"] });
  return () => observer.disconnect();
}

const getSnapshot = () => Boolean(document.documentElement.dataset.entered);

export function useEntered() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
