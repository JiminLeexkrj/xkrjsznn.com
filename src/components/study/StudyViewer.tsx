"use client";

import Link from "next/link";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveLastPage } from "@/app/me/study/actions";
import { openPdf, pageImage, pageText } from "@/lib/pdfjs";
import { Explanation } from "./Explanation";

/** 동시에 쓰는 해설 수. 지금 보는 페이지는 이 수와 상관없이 바로 시작한다. */
const CONCURRENCY = 2;

const ERRORS: Record<string, string> = {
  login: "로그인이 끊겼습니다. 다시 로그인한 뒤 새로고침하세요.",
  "not-configured": "서버에 OPENAI_API_KEY가 설정되지 않았습니다.",
  "openai-key": "OpenAI API 키가 올바르지 않습니다. 키를 확인하세요.",
  "openai-limit": "OpenAI 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도하거나 결제 잔액을 확인하세요.",
  openai: "모델이 해설을 쓰지 못했습니다. 다시 시도하세요.",
};
const errorText = (code: string) => ERRORS[code] ?? `해설을 만들지 못했습니다. (${code})`;

// 이 오류는 다른 페이지에서도 똑같이 나므로 자동 해설을 멈춘다
const FATAL = new Set(["login", "not-configured", "openai-key", "openai-limit"]);

/** 해설을 쓸 순서. 지금 페이지부터 끝까지, 그다음 처음부터 지금 페이지 앞까지. */
const order = (from: number, count: number) => Array.from({ length: count }, (_, i) => ((from - 1 + i) % count) + 1);

type StudyViewerProps = {
  documentId: string;
  projectId: string;
  projectName: string;
  title: string;
  pageCount: number;
  initialPage: number;
  pdfUrl: string;
  initialExplanations: Record<number, string>;
};

export function StudyViewer({
  documentId,
  projectId,
  projectName,
  title,
  pageCount,
  initialPage,
  pdfUrl,
  initialExplanations,
}: StudyViewerProps) {
  const clamp = useCallback((n: number) => Math.min(pageCount, Math.max(1, Math.trunc(n) || 1)), [pageCount]);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(() => clamp(initialPage));
  const [explanations, setExplanations] = useState(initialExplanations);
  const [failed, setFailed] = useState<Record<number, string>>({});
  const [working, setWorking] = useState<number[]>([]);
  const [auto, setAuto] = useState(true);
  const [halted, setHalted] = useState<string | null>(null);

  // 쓰는 중인 페이지. 상태는 화면용이고, 겹쳐 시작하지 않게 막는 것은 이 ref가 한다.
  const inflight = useRef(new Set<number>());
  const texts = useRef(new Map<number, Promise<string>>());
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);

  // ---------- PDF 열기 ----------

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    openPdf(pdfUrl)
      .then((t) => {
        task = t;
        if (cancelled) t.destroy();
        return t.promise;
      })
      .then(
        (doc) => !cancelled && setPdf(doc),
        () => !cancelled && setLoadError(true),
      );
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [pdfUrl]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStage((s) => (s && Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 화면 칸에 꽉 맞춰 그린다. 다른 캔버스에 다 그린 뒤 옮겨서 넘길 때 깜빡이지 않게 한다.
  useEffect(() => {
    if (!pdf || !stage || stage.w < 10 || stage.h < 10) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    (async () => {
      const p = await pdf.getPage(page);
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      const fit = Math.min(stage.w / base.width, stage.h / base.height);
      const dpr = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale: fit * dpr });
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.floor(viewport.width);
      offscreen.height = Math.floor(viewport.height);
      task = p.render({ canvas: offscreen, viewport });
      try {
        await task.promise;
      } catch {
        return; // 다른 페이지로 넘어가 취소됨
      }
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      canvas.style.width = `${offscreen.width / dpr}px`;
      canvas.style.height = `${offscreen.height / dpr}px`;
      canvas.getContext("2d")?.drawImage(offscreen, 0, 0);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, page, stage]);

  // ---------- 페이지 넘기기 ----------

  const go = useCallback((n: number) => setPage(clamp(n)), [clamp]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => clamp(p - 1));
      else if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => clamp(p + 1));
      else if (e.key === "Home") setPage(1);
      else if (e.key === "End") setPage(pageCount);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clamp, pageCount]);

  // 주소에 페이지를 담고, 잠시 머물면 보던 페이지로 저장한다
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("p", String(page));
    window.history.replaceState(window.history.state, "", url);
    panelRef.current?.scrollTo({ top: 0 });
    const timer = setTimeout(() => saveLastPage(documentId, page), 800);
    return () => clearTimeout(timer);
  }, [page, documentId]);

  // ---------- 해설 쓰기 ----------

  const textOf = useCallback(
    (n: number) => {
      if (!pdf || n < 1 || n > pageCount) return Promise.resolve("");
      let text = texts.current.get(n);
      if (!text) {
        text = pdf
          .getPage(n)
          .then(pageText)
          .catch(() => "");
        texts.current.set(n, text);
      }
      return text;
    },
    [pdf, pageCount],
  );

  const generate = useCallback(
    async (n: number, force = false) => {
      if (!pdf || inflight.current.has(n)) return;
      inflight.current.add(n);
      setWorking([...inflight.current]);
      setFailed((f) => {
        if (!(n in f)) return f;
        const rest = { ...f };
        delete rest[n];
        return rest;
      });
      try {
        const p = await pdf.getPage(n);
        const [image, text, prevText, nextText] = await Promise.all([pageImage(p), textOf(n), textOf(n - 1), textOf(n + 1)]);
        const res = await fetch("/api/study/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, page: n, image, text, prevText, nextText, force }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || typeof body.content !== "string") throw new Error(body.error ?? `HTTP ${res.status}`);
        setExplanations((e) => ({ ...e, [n]: body.content }));
      } catch (err) {
        const code = err instanceof Error ? err.message : "openai";
        if (FATAL.has(code)) setHalted(code);
        setFailed((f) => ({ ...f, [n]: code }));
      } finally {
        inflight.current.delete(n);
        setWorking([...inflight.current]);
      }
    },
    [pdf, documentId, textOf],
  );

  // 비어 있는 페이지를 지금 페이지 가까운 곳부터 채운다. 실패한 페이지는 직접 다시 시도할 때까지 건너뛴다.
  useEffect(() => {
    if (!pdf || !auto || halted) return;
    const missing = (n: number) => !(n in explanations) && !(n in failed) && !inflight.current.has(n);
    if (missing(page)) generate(page);
    const slots = CONCURRENCY - inflight.current.size;
    if (slots <= 0) return;
    for (const n of order(page, pageCount).filter(missing).slice(0, slots)) generate(n);
  }, [pdf, auto, halted, page, pageCount, explanations, failed, working, generate]);

  function resume() {
    setHalted(null);
    setFailed((f) => Object.fromEntries(Object.entries(f).filter(([, code]) => !FATAL.has(code))));
    setAuto(true);
  }

  // ---------- 화면 ----------

  const done = Object.keys(explanations).length;
  const current = explanations[page];
  const isWorking = working.includes(page);
  const error = failed[page];
  const navButton =
    "flex size-9 items-center justify-center border border-concrete text-lg transition-colors hover:border-violet disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="relative left-1/2 w-[calc(100vw-2rem)] max-w-[120rem] -translate-x-1/2 sm:w-[calc(100vw-4rem)]">
      <header className="flex flex-wrap items-end gap-x-8 gap-y-3 pb-4">
        <div className="min-w-0 flex-1 basis-64">
          <Link href={`/me/study/${projectId}`} className="font-ko text-xs text-ash hover:text-bone">
            ← {projectName}
          </Link>
          <h1 className="mt-1 truncate font-ko text-xl" title={title}>
            {title}
          </h1>
        </div>

        <nav aria-label="페이지 넘기기" className="flex items-center gap-2">
          <button type="button" className={navButton} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="이전 페이지">
            ‹
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("page");
              go(Number(value));
              (document.activeElement as HTMLElement | null)?.blur();
            }}
            className="flex items-center gap-1.5 font-ko text-sm tabular-nums"
          >
            <input
              key={page}
              name="page"
              type="number"
              min={1}
              max={pageCount}
              defaultValue={page}
              aria-label="페이지 번호"
              className="w-14 border-b border-concrete bg-transparent py-1 text-center outline-none focus:border-violet [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-ash">/ {pageCount}</span>
          </form>
          <button
            type="button"
            className={navButton}
            onClick={() => go(page + 1)}
            disabled={page >= pageCount}
            aria-label="다음 페이지"
          >
            ›
          </button>
        </nav>

        <div className="flex items-center gap-4 font-ko text-xs text-ash">
          <span className="tabular-nums" aria-live="polite">
            해설 {done}/{pageCount}
            {working.length > 0 && <span className="text-violet"> · 쓰는 중</span>}
          </span>
          {done < pageCount && !halted && (
            <button type="button" onClick={() => setAuto((a) => !a)} className="underline-offset-4 hover:text-bone hover:underline">
              {auto ? "자동 해설 멈추기" : "자동 해설 이어 하기"}
            </button>
          )}
        </div>
      </header>

      {halted && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-blood bg-pit px-4 py-3 font-ko text-sm">
          <span>{errorText(halted)} 자동 해설을 멈췄습니다.</span>
          <button type="button" onClick={resume} className="text-violet hover:text-bone">
            다시 시도
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div ref={stageRef} className="relative flex h-[62svh] items-center justify-center overflow-hidden bg-pit lg:h-[calc(100svh-9.5rem)]">
          <canvas ref={canvasRef} role="img" aria-label={`${title} ${page}쪽`} className="bg-white" />
          {!pdf && (
            <p className="absolute font-ko text-sm text-ash">
              {loadError ? "PDF를 열지 못했습니다. 새로고침해 보세요." : "PDF를 여는 중…"}
            </p>
          )}
        </div>

        <section
          ref={panelRef}
          aria-labelledby="explanation-heading"
          className="overflow-y-auto border border-concrete px-5 py-6 sm:px-8 lg:h-[calc(100svh-9.5rem)]"
        >
          <div className="mb-6 flex items-baseline gap-4">
            <h2 id="explanation-heading" className="font-ko text-sm text-ash tabular-nums">
              {page}쪽 해설
            </h2>
            {current && !isWorking && (
              <button
                type="button"
                onClick={() => generate(page, true)}
                className="ml-auto font-ko text-xs text-ash hover:text-bone"
              >
                다시 쓰기
              </button>
            )}
          </div>

          {isWorking ? (
            <div className="font-ko text-ash" aria-live="polite">
              <p>{current ? "새로 쓰는 중입니다…" : "이 페이지의 해설을 쓰는 중입니다…"}</p>
              <div aria-hidden className="mt-6 flex flex-col gap-3">
                {[92, 100, 76, 88, 54].map((w) => (
                  <span key={w} className="h-3 animate-pulse bg-concrete" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          ) : current ? (
            <Explanation content={current} />
          ) : error ? (
            <div className="font-ko text-sm">
              <p className="text-blood">{errorText(error)}</p>
              <button type="button" onClick={() => generate(page)} className="mt-3 text-violet hover:text-bone">
                이 페이지 다시 시도
              </button>
            </div>
          ) : (
            <div className="font-ko text-sm text-ash">
              <p>{auto && !halted ? "곧 이 페이지 차례입니다." : "아직 해설이 없습니다."}</p>
              {(!auto || halted) && pdf && (
                <button type="button" onClick={() => generate(page)} className="mt-3 text-violet hover:text-bone">
                  이 페이지 해설 쓰기
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
