"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { sound } from "@/lib/sound";
import { SoundToggle } from "../SoundToggle";
import { createDomainRenderer } from "./domain-renderer";

const HOLD_MS = 1400;
const RELEASE_MS = 600;
const EXPAND_MS = 1800;
const FADE_MS = 500;
export const ENTERED_KEY = "xk-entered";

const CODE = profile.code.split("");
// 각 글자는 한글 자판에서 같은 자리의 자모를 거쳐 원래 글자로 돌아온다
const KOREAN_KEY: Record<string, string> = { x: "ㅌ", k: "ㅏ", r: "ㄱ", j: "ㅓ", s: "ㄴ", z: "ㅋ", n: "ㅜ" };
const GLYPHS = "アカサタナハマヤラワ無形黒赫紫刻境界虚ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ#%&§¶†‡".split("");

function randomGlyph(char: string) {
  if (Math.random() < 0.3) return KOREAN_KEY[char] ?? char;
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

type Phase = "idle" | "expanding" | "done";

export function Intro() {
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeRef = useRef<HTMLParagraphElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const input = useRef({ holding: false, center: [0.5, 0.5] as [number, number], skip: false });

  useEffect(() => {
    const root = document.documentElement;
    // 이번 세션에 이미 들어온 적이 있으면 head 스크립트가 표시해 두었다
    if (root.dataset.entered) return;

    const overlay = overlayRef.current!;
    const cells = Array.from(codeRef.current!.children) as HTMLElement[];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = reduced ? null : createDomainRenderer(canvasRef.current!);

    let phase: Phase = "idle";
    let hold = 0;
    let expandStart = 0;
    let lastGlyph = 0;
    const start = performance.now();
    let last = start;
    let raf = 0;

    const enter = () => {
      phase = "expanding";
      expandStart = performance.now();
      root.dataset.entered = "1";
      try {
        sessionStorage.setItem(ENTERED_KEY, "1");
      } catch {}
      sound.impact();
      if (renderer) overlay.style.background = "transparent";
    };

    const finish = () => {
      phase = "done";
      renderer?.destroy();
      setDone(true);
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(now - last, 50);
      last = now;
      const { holding, center, skip } = input.current;

      if (skip && phase !== "done") {
        if (phase === "idle") enter();
        finish();
        return;
      }

      let expand = 0;
      if (phase === "idle") {
        hold = Math.min(1, Math.max(0, hold + (holding ? dt / HOLD_MS : -dt / RELEASE_MS)));
        sound.setTension(hold);
        if (hold >= 1) enter();
      }
      if (phase === "expanding") {
        expand = Math.min(1, (now - expandStart) / (renderer ? EXPAND_MS : FADE_MS));
        if (!renderer) overlay.style.opacity = String(1 - expand);
        if (expand >= 1) {
          finish();
          return;
        }
      }

      // 글자 해독: 처음엔 차례로 제자리를 찾고, 누를수록 다시 흔들린다
      const swap = now - lastGlyph > 55;
      if (swap) lastGlyph = now;
      cells.forEach((cell, i) => {
        const resolved = now - start > 350 + i * 110;
        const glitch = phase === "expanding" || (resolved && Math.random() < hold * hold * 0.35);
        if (!resolved || glitch) {
          if (swap) cell.textContent = randomGlyph(CODE[i]);
        } else if (cell.textContent !== CODE[i]) {
          cell.textContent = CODE[i];
        }
      });

      const code = codeRef.current!;
      if (phase === "expanding") {
        const out = Math.min(1, expand / 0.12);
        for (const el of [code, promptRef.current!, controlsRef.current!]) el.style.opacity = String(1 - out);
        code.style.transform = `scale(${1 + out * 0.6})`;
      } else {
        const jitter = hold * hold * 6;
        code.style.transform = `translate(${(Math.random() - 0.5) * jitter}px, ${(Math.random() - 0.5) * jitter}px) scale(${1 - hold * 0.06})`;
        code.style.letterSpacing = `${-hold * 0.08}em`;
      }
      barRef.current!.style.transform = `scaleX(${hold})`;

      renderer?.render({ time: (now - start) / 1000, hold, expand, center });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const isHoldKey = (e: KeyboardEvent) =>
      (e.code === "Space" || e.key === "Enter") && !(e.target instanceof HTMLButtonElement);
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isHoldKey(e)) return;
      e.preventDefault();
      input.current.holding = true;
      input.current.center = [0.5, 0.5];
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isHoldKey(e)) input.current.holding = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (phase !== "done") renderer?.destroy();
    };
  }, []);

  if (done) return null;

  const press = (e: React.PointerEvent) => {
    input.current.holding = true;
    input.current.center = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
  };
  const release = () => {
    input.current.holding = false;
  };

  return (
    <div
      ref={overlayRef}
      className="intro fixed inset-0 z-[60] touch-none bg-void select-none [-webkit-touch-callout:none]"
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

      <div className="relative flex h-full flex-col items-center justify-center px-4">
        <p
          ref={codeRef}
          aria-label={profile.code}
          className="flex text-[clamp(3rem,13vw,9.5rem)] leading-none text-dust will-change-transform"
          style={{ fontFamily: "var(--font-unifraktur), var(--font-hahmlet), var(--font-shippori), serif" }}
        >
          {CODE.map((_, i) => (
            <span key={i} aria-hidden className="inline-block w-[0.62em] text-center">
              {" "}
            </span>
          ))}
        </p>

        <div ref={promptRef} className="mt-14 flex flex-col items-center gap-2 text-center">
          <p lang="ko" className="font-ko text-base md:text-lg">
            누르고 있으면 열립니다
          </p>
          <p className="wdth-75 text-sm text-ash">
            Press and hold anywhere
            <span className="hidden [@media(pointer:fine)]:inline">, or hold Space</span>
          </p>
          <div aria-hidden className="mt-3 h-px w-40 bg-concrete">
            <div ref={barRef} className="h-full origin-left scale-x-0 bg-blood" />
          </div>
        </div>
      </div>

      <div
        ref={controlsRef}
        className="absolute inset-x-0 bottom-6 flex justify-center gap-10 text-sm md:bottom-10"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <SoundToggle />
        <button
          type="button"
          onClick={() => {
            input.current.skip = true;
          }}
          className="text-ash transition-colors hover:text-dust"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
