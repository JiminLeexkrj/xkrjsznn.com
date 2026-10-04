"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sound } from "@/lib/sound";

export function SoundToggle({ className = "" }: { className?: string }) {
  const on = useSyncExternalStore(sound.subscribe, sound.isEnabled, () => false);

  // 전에 소리를 켜 두었다면, 브라우저가 허락하는 첫 조작에서 다시 켠다
  useEffect(() => {
    if (!sound.wasEnabled()) return;
    const resume = () => {
      if (!sound.isEnabled()) void sound.enable();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => void sound.toggle()}
      className={`group flex items-baseline gap-1.5 ${className}`}
    >
      Sound
      <span className={`wdth-75 transition-colors ${on ? "text-blood" : "text-ash group-hover:text-dust"}`}>
        {on ? "on" : "off"}
      </span>
    </button>
  );
}
