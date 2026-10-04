"use client";

import dynamic from "next/dynamic";

// three.js는 무거우므로 진입 화면과 HTML이 먼저 뜬 뒤에 따로 불러온다
const World = dynamic(() => import("./World"), { ssr: false });

export function WorldLoader() {
  return <World />;
}
