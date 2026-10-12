// pdf.js는 브라우저에서만 돈다. 서버 렌더링 중에 불러오면 DOM이 없어 깨지므로, 쓰는 순간에 불러온다.

import type { PDFDocumentLoadingTask, PDFPageProxy } from "pdfjs-dist";

let loading: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfjs() {
  loading ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), {
      type: "module",
    });
    return pdfjs;
  });
  return loading;
}

/** 문서는 돌려받은 작업의 promise로 받고, 다 쓰면 작업을 destroy()해 워커의 메모리를 비운다 */
export async function openPdf(source: string | ArrayBuffer): Promise<PDFDocumentLoadingTask> {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument(typeof source === "string" ? { url: source } : { data: new Uint8Array(source) });
}

/** 페이지의 글자를 줄 단위로 */
export async function pageText(page: PDFPageProxy) {
  const content = await page.getTextContent();
  let text = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    text += item.str + (item.hasEOL ? "\n" : " ");
  }
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 모델에게 보낼 페이지 그림. 긴 변을 1600px 안팎으로 맞춘 JPEG. */
export async function pageImage(page: PDFPageProxy) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(1600 / Math.max(base.width, base.height), 3);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  const url = canvas.toDataURL("image/jpeg", 0.85);
  canvas.width = canvas.height = 0;
  return url;
}
