"use client";

import { useSyncExternalStore } from "react";

// <html data-*> 상태를 구독한다.
// entered: 진입 화면을 지나 영역이 열렸는지
// gl: 장면의 글자와 요소가 3D 공간으로 옮겨졌는지

function useRootFlag(name: "entered" | "gl" | "stage") {
  return useSyncExternalStore(
    (callback) => {
      const observer = new MutationObserver(callback);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: [`data-${name}`] });
      return () => observer.disconnect();
    },
    () => Boolean(document.documentElement.dataset[name]),
    () => false,
  );
}

/** 장면이 3D 공간으로 옮겨졌다고 표시한다. CSS가 HTML 층을 감추고 캔버스가 입력을 받는다. */
export function markGLReady() {
  document.documentElement.dataset.gl = "on";
}

export const useEntered = () => useRootFlag("entered");
export const useGL = () => useRootFlag("gl");
