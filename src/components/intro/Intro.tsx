"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { IMPLODE, REVEAL_AT, burstProgress, intro } from "@/lib/intro-store";
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

/**
 * idle: 기다리는 중
 * world: 3D 세계 안에서 조각이 압축되고 터지며 카메라가 날아든다
 * flat: 3D가 아직 준비되지 않아 2D 셰이더로 대신 펼친다
 * fade: 움직임 줄이기 설정이거나 WebGL이 없어 그냥 걷힌다
 */
type Phase = "idle" | "world" | "flat" | "fade" | "done";

export function Intro() {
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
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
    const backdrop = backdropRef.current!;
    const canvas = canvasRef.current!;
    const cells = Array.from(codeRef.current!.children) as HTMLElement[];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flat = reduced ? null : createDomainRenderer(canvas);

    let phase: Phase = "idle";
    let hold = 0;
    let phaseStart = 0;
    let lastGlyph = 0;
    let worldShown = false;
    const start = performance.now();
    let last = start;
    let raf = 0;

    const markEntered = () => {
      if (root.dataset.entered) return;
      root.dataset.entered = "1";
      try {
        sessionStorage.setItem(ENTERED_KEY, "1");
      } catch {}
    };

    const dropFlat = () => {
      flat?.destroy();
      flat = null;
    };

    const enter = () => {
      phaseStart = performance.now();
      sound.impact();
      if (intro.ready && !reduced) {
        phase = "world";
        intro.burstStart = phaseStart;
      } else if (flat) {
        phase = "flat";
        markEntered();
        backdrop.style.opacity = "0";
      } else {
        phase = "fade";
        markEntered();
      }
    };

    const finish = () => {
      phase = "done";
      markEntered();
      dropFlat();
      setDone(true);
    };

    const tick = () => {
      const now = performance.now();
      // 프레임이 느린 기기에서도 누르는 시간이 늘어나지 않게, 탭 전환 같은 큰 공백만 잘라 낸다
      const dt = Math.min(now - last, 200);
      last = now;
      const { holding, center, skip } = input.current;

      if (skip && phase !== "done") {
        finish();
        return;
      }

      // 3D 세계가 준비되면 검은 막을 걷고 그 뒤의 허공을 보여 준다
      if (!worldShown && intro.ready && phase === "idle") {
        worldShown = true;
        backdrop.style.opacity = "0";
        canvas.style.opacity = "0";
        setTimeout(dropFlat, 1200);
      }

      if (phase === "idle") {
        hold = Math.min(1, Math.max(0, hold + (holding ? dt / HOLD_MS : -dt / RELEASE_MS)));
        intro.hold = hold;
        sound.setTension(hold);
        if (hold >= 1) enter();
      }

      // 글자가 흩어지는 정도. 0이면 그대로, 1이면 다 사라졌다.
      let out = 0;
      let flatExpand = 0;
      if (phase === "world") {
        const b = burstProgress(now);
        out = Math.min(1, b / IMPLODE);
        if (b >= REVEAL_AT) markEntered();
        // 착지할 즈음 겹쳐 있던 진입 화면이 걷힌다
        overlay.style.opacity = String(1 - Math.min(1, Math.max(0, (b - REVEAL_AT) / (1 - REVEAL_AT))));
        if (b >= 1) {
          finish();
          return;
        }
      } else if (phase === "flat" || phase === "fade") {
        const duration = phase === "flat" ? EXPAND_MS : FADE_MS;
        flatExpand = Math.min(1, (now - phaseStart) / duration);
        out = Math.min(1, flatExpand / 0.12);
        if (phase === "fade") overlay.style.opacity = String(1 - flatExpand);
        if (flatExpand >= 1) {
          finish();
          return;
        }
      }

      // 글자 해독: 처음엔 차례로 제자리를 찾고, 누를수록 다시 흔들린다
      const swap = now - lastGlyph > 55;
      if (swap) lastGlyph = now;
      cells.forEach((cell, i) => {
        const resolved = now - start > 350 + i * 110;
        const glitch = out > 0 || (resolved && Math.random() < hold * hold * 0.35);
        if (!resolved || glitch) {
          if (swap) cell.textContent = randomGlyph(CODE[i]);
        } else if (cell.textContent !== CODE[i]) {
          cell.textContent = CODE[i];
        }
      });

      const code = codeRef.current!;
      if (out > 0) {
        for (const el of [code, promptRef.current!, controlsRef.current!]) el.style.opacity = String(1 - out);
        code.style.transform = `scale(${1 + out * 0.6})`;
      } else {
        const jitter = hold * hold * 6;
        code.style.transform = `translate(${(Math.random() - 0.5) * jitter}px, ${(Math.random() - 0.5) * jitter}px) scale(${1 - hold * 0.06})`;
        code.style.letterSpacing = `${-hold * 0.08}em`;
      }
      barRef.current!.style.transform = `scaleX(${hold})`;

      if (flat && (!worldShown || phase === "flat")) {
        flat.render({ time: (now - start) / 1000, hold, expand: flatExpand, center });
      }
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
      dropFlat();
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
      className="intro fixed inset-0 z-[60] touch-none select-none [-webkit-touch-callout:none]"
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D 세계가 준비되기 전까지 가리는 막. 준비되면 걷혀 뒤의 허공이 보인다. */}
      <div ref={backdropRef} aria-hidden className="absolute inset-0 bg-void transition-opacity duration-[1200ms]" />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full transition-opacity duration-[1200ms]"
      />

      <div className="relative flex h-full flex-col items-center justify-center px-4">
        <p
          ref={codeRef}
          aria-label={profile.code}
          className="flex text-[clamp(3rem,13vw,9.5rem)] leading-none text-dust will-change-transform [text-shadow:0_0_40px_rgba(0,0,0,0.8)]"
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
