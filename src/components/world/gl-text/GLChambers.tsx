"use client";

import { Text } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Color, Group, MathUtils, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { preloadFont } from "troika-three-text";
import { markGLReady } from "@/lib/entered";
import { STOPS, timeline } from "@/lib/timeline";
import { world } from "@/lib/world-store";
import { DOMAINS, DUST, EMBER, FROST } from "../colors";
import { createConcreteMaterial } from "../concrete-material";
import { widthLadder } from "./fonts";
import {
  type Placement,
  type RoomFrame,
  anchorOf,
  floorScale,
  project,
  projectFloor,
  roomFrame,
  scaleToward,
} from "./frame";
import { type CarrierItem, type GLItem, type Measured, type TextItem, measureChambers } from "./measure";

type TroikaText = Mesh & {
  font: string;
  clipRect: [number, number, number, number] | null;
  textRenderInfo?: { blockBounds: [number, number, number, number] } | null;
  color: Color | string | number;
  fillOpacity: number;
  outlineBlur: number | string;
  outlineWidth: number | string;
  outlineOpacity: number;
  outlineColor: Color | string | number;
  outlineOffsetX: number | string;
  outlineOffsetY: number | string;
  sync: (callback?: () => void) => void;
};

type Built = { measured: Measured; frames: RoomFrame[] };

const BLACK = new Color(0, 0, 0);
/** 석비 가장자리 여백(px). 글 둘레에 돌이 이만큼 더 나온다. */
const STELE_PAD = 34;
/** 석비 두께(m) */
const STELE_DEPTH = 0.42;
/** 강조된 글의 밝기. 블룸 기준을 살짝 넘어 영역의 빛이 번진다. */
const HIGHLIGHT_GAIN = 1.35;

/** 균열: 글이 갈라지는 띠의 수, 이어지는 시간(초) */
const FRACTURE_BANDS = 5;
const FRACTURE_SECONDS = 0.55;
/** 띠마다 어긋나는 방향과 크기. 여섯 박자로 바뀌며 떨린다. */
const FRACTURE_PATTERN = Array.from({ length: FRACTURE_BANDS }, (_, k) =>
  Array.from({ length: 6 }, (_, beat) => Math.sin(k * 12.9898 + beat * 78.233) * 43758.5453 % 1),
);
const FRACTURE_GHOSTS = [FROST, EMBER];
const CRACK_GLOW = DUST.clone().multiplyScalar(1.6);
const CRACK_TILT = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -0.11);

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 방과의 거리(d)에 따른 보임과 흐림. 1단계 HTML 무대와 같은 곡선이다. */
function roomLook(d: number) {
  const k = Math.abs(d);
  const opacity = d < 0 ? 1 - smoothstep(0.25, 0.95, k) : 1 - smoothstep(0.05, 0.75, k);
  return { opacity, blur: smoothstep(0, 0.7, k) };
}

/**
 * 영역이 열릴 때 한 번 일어나는 컷인. HTML의 cut-* 애니메이션을 3D로 옮겼다.
 * width: 0–1, 폭 사다리를 따라가는 정도. 이름이 미끄러져 들어오며 실제로 넓어지거나 좁아진다.
 */
function cutState(cut: string | null, elapsed: number) {
  const span = (delay: number, duration: number) => Math.min(1, Math.max(0, (elapsed - delay) / duration));
  switch (cut) {
    case "cut-name-a":
    case "cut-name-b": {
      const t = span(cut === "cut-name-a" ? 0.35 : 0.45, 1.3);
      const e = easeOutExpo(t);
      const side = cut === "cut-name-a" ? -1 : 1;
      return { dx: (1 - e) * 0.3 * side, dy: 0, sy: 1, alpha: Math.min(1, t / 0.4), width: e };
    }
    case "cut-drop": {
      const e = easeInOut(span(0.6, 1.4));
      return { dx: 0, dy: 0, sy: Math.max(0.0001, e), alpha: e > 0 ? 1 : 0, width: 1 };
    }
    case "cut-fade": {
      const e = easeOutExpo(span(1.1, 1));
      return { dx: 0, dy: (1 - e) * 0.6, sy: 1, alpha: e, width: 1 };
    }
    default:
      return null;
  }
}

/** 어떤 CSS 색이든 캔버스에 칠해 sRGB 값과 투명도로 바꾼다 */
const parseColor = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (css: string) => {
    if (!ctx) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { color: new Color(`rgb(${r},${g},${b})`), alpha: a / 255 };
  };
})();

// 장면의 글을 3D 공간에 세운다. 배치는 HTML을 측정해서 얻는다.
// 글은 평평한 채로 공간에 서고, 기록의 방(Dossier)에서만 돌에 새겨진다.
export function GLChambers() {
  const [built, setBuilt] = useState<Built | null>(null);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const run = () => {
      if (!alive) return;
      const measured = measureChambers();
      const frames = STOPS.map((_, i) => roomFrame(i, measured.width, measured.height));
      setBuilt({ measured, frames });
    };
    void document.fonts.ready.then(() => requestAnimationFrame(run));
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(run, 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (!built) return null;
  return (
    <Suspense fallback={null}>
      <Layer built={built} />
    </Suspense>
  );
}

type TextRuntime = {
  item: TextItem;
  anchor: Vector3;
  perPx: number;
  quaternion: Quaternion;
  base: Color;
  highlight: Color;
  alpha: number;
  /** 마우스를 올리면 거쳐 갈 폭들. 첫 칸이 제 폭이다. */
  hoverLadder: string[] | null;
  /** 영역이 열릴 때 거쳐 갈 폭들 */
  cutLadder: string[] | null;
};

type SteleShape = { item: CarrierItem; center: Vector3; size: [number, number, number] };

type Placed = {
  it: GLItem;
  anchor: Vector3;
  perPx: number;
  quaternion: Quaternion;
  length?: number;
  color?: Color;
  alpha?: number;
};

function Layer({ built }: { built: Built }) {
  const { measured, frames } = built;
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false }), []);
  // 석비는 어두운 돌이다. 밝은 글이 또렷이 읽힌다.
  const stone = useMemo(() => createConcreteMaterial("#3b3733"), []);
  const groups = useRef<(Group | null)[]>([]);
  const texts = useRef<(TroikaText | null)[]>([]);
  const others = useRef<(Mesh | null)[]>([]);
  const steleRefs = useRef<(Mesh | null)[]>([]);
  const synced = useRef(new Set<number>());
  const hovered = useRef(-1);
  const highlight = useRef<number[]>([]);
  /** 링크마다 지금 강조 중인지와, 강조가 시작된 시각. 균열이 이때부터 일어난다. */
  const engaged = useRef<{ on: boolean; since: number }[]>([]);
  /** 균열 효과를 위한 띠, 잔상, 빛줄 */
  const fracture = useRef<{ bands: (TroikaText | null)[]; ghosts: (TroikaText | null)[]; crack: Mesh | null }[]>([]);
  const entryStart = useRef<number | null>(null);
  const roomOpacity = useRef<number[]>(STOPS.map(() => 0));

  const layout = useMemo(() => {
    // 석비마다 글 전체가 바닥 위에 오도록 같은 비율로 당긴다. 그래야 돌과 글이 떨어지지 않는다.
    const blockScale = new Map<number, number>();
    const steles: SteleShape[] = [];
    for (const it of measured.items) {
      if (it.kind !== "carrier") continue;
      const f = frames[it.room];
      const scale = floorScale(f, it.box, it.z);
      blockScale.set(it.block, scale);
      const tl = scaleToward(f, project(f, it.box.x - STELE_PAD, it.box.y - STELE_PAD, it.z), scale).anchor;
      const tr = scaleToward(f, project(f, it.box.x + it.box.w + STELE_PAD, it.box.y - STELE_PAD, it.z), scale).anchor;
      const mid = tl.clone().add(tr).multiplyScalar(0.5);
      const behind = f.planeNormal.clone().multiplyScalar(-(STELE_DEPTH / 2 + 0.015));
      steles.push({ item: it, center: mid.setY(tl.y / 2).add(behind), size: [tl.distanceTo(tr), tl.y, STELE_DEPTH] });
    }

    const placeFor = (f: RoomFrame, it: GLItem, x: number, y: number, box: { x: number; y: number; w: number; h: number }): Placement => {
      const raw = project(f, x, y, it.z);
      const scale = it.block >= 0 ? (blockScale.get(it.block) ?? 1) : floorScale(f, box, it.z);
      return scaleToward(f, raw, scale);
    };

    const textRuntime: (TextRuntime | null)[] = [];
    const placed: Placed[] = measured.items.map((it, i) => {
      const f = frames[it.room];
      textRuntime[i] = null;
      if (it.kind === "text") {
        const a = anchorOf(it.box, it.align);
        const onFloor = it.floor ? projectFloor(f, a.x, a.y) : null;
        const p = onFloor ?? placeFor(f, it, a.x, a.y, it.box);
        const quaternion = onFloor ? f.floorQuaternion : f.quaternion;
        const { color, alpha } = parseColor(it.color);
        // 바닥에 새긴 글은 어두운 바닥에서도 보이도록 밝은 돌빛을 섞는다
        if (onFloor) color.lerp(DUST, 0.45);
        const ax = it.archivo;
        textRuntime[i] = {
          item: it,
          anchor: p.anchor,
          perPx: p.perPx,
          quaternion,
          base: color,
          highlight: DOMAINS[it.domain].clone().multiplyScalar(HIGHLIGHT_GAIN),
          alpha: alpha * it.opacity,
          hoverLadder: ax && it.root >= 0 && it.hoverWidth ? widthLadder(ax.weight, ax.width, it.hoverWidth) : null,
          cutLadder:
            ax && it.cut === "cut-name-a"
              ? widthLadder(ax.weight, 62, ax.width)
              : ax && it.cut === "cut-name-b"
                ? widthLadder(ax.weight, 125, ax.width)
                : null,
        };
        return { it, ...p, quaternion };
      }
      if (it.kind === "line") {
        const box = { x: it.x1, y: it.y, w: it.x2 - it.x1, h: it.thickness };
        const p1 = placeFor(f, it, it.x1, it.y, box);
        const p2 = placeFor(f, it, it.x2, it.y, box);
        const parsed = parseColor(it.color);
        // 석비 위의 선은 돌에 판 홈, 공중의 선은 아주 옅은 빛줄이다
        const engraved = it.block >= 0;
        return {
          it,
          anchor: p1.anchor.clone().add(p2.anchor).multiplyScalar(0.5),
          perPx: p1.perPx,
          quaternion: f.quaternion,
          length: p1.anchor.distanceTo(p2.anchor),
          color: engraved ? BLACK : parsed.color,
          alpha: engraved ? 0.6 : parsed.alpha * it.opacity,
        };
      }
      if (it.kind === "carrier") return { it, anchor: new Vector3(), perPx: 0, quaternion: f.quaternion };
      // 색 견본과 상호작용 영역은 상자 가운데에 놓는다
      const box = it.box;
      const c = placeFor(f, it, box.x + box.w / 2, box.y + box.h / 2, box);
      return { it, ...c, quaternion: f.quaternion, color: it.kind === "swatch" ? new Color(it.color) : undefined };
    });

    return { placed, textRuntime, steles };
  }, [measured, frames]);

  // 폭 사다리의 폰트를 미리 받아 둔다. 처음 넓어질 때 끊기지 않는다.
  useEffect(() => {
    const urls = new Set<string>();
    layout.textRuntime.forEach((rt) => {
      rt?.hoverLadder?.forEach((u) => urls.add(u));
      rt?.cutLadder?.forEach((u) => urls.add(u));
    });
    urls.forEach((font) => preloadFont({ font, characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@." }, () => {}));
  }, [layout]);

  const textCount = layout.textRuntime.filter(Boolean).length;

  const onSync = (i: number) => {
    synced.current.add(i);
    // 모든 글자가 한 번씩 배치되면 HTML을 감추고 3D로 넘긴다
    if (synced.current.size >= textCount && !document.documentElement.dataset.gl) markGLReady();
  };

  const setHover = (root: number) => {
    hovered.current = root;
    const el = root >= 0 ? measured.roots[root] : null;
    world.hoveredProject = el?.dataset.projectIndex ? Number(el.dataset.projectIndex) : null;
    world.hoveredAward = el?.dataset.awardIndex ? Number(el.dataset.awardIndex) : null;
    document.body.style.cursor = el instanceof HTMLAnchorElement ? "pointer" : "";
  };

  useEffect(() => () => setHover(-1), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock, events }, rawDelta) => {
    // 카메라가 움직이면 마우스 아래의 글자도 바뀐다. 마우스가 멈춰 있어도 매 프레임 다시 판정한다.
    if (world.pointerSeen) events.update?.();
    const delta = Math.min(rawDelta, 0.1);
    const root = document.documentElement;
    const glOn = root.dataset.gl === "on";
    if (glOn && root.dataset.entered && entryStart.current === null) entryStart.current = clock.elapsedTime;
    const elapsed = entryStart.current === null ? 0 : clock.elapsedTime - entryStart.current;

    const looks = STOPS.map((_, room) => roomLook(timeline.position - room));
    // 석비는 방에 다가가면 땅에서 솟고, 글은 돌이 다 선 뒤에 드러난다
    const rise = looks.map((look) => (glOn ? smoothstep(0.02, 0.8, look.opacity) : 0));
    looks.forEach((look, room) => {
      roomOpacity.current[room] = glOn ? look.opacity : 0;
      const g = groups.current[room];
      if (g) g.visible = roomOpacity.current[room] > 0.003;
    });

    // 링크와 수상 줄의 강조: 마우스, 키보드 초점, 메달 쪽에서 온 표시를 모두 따른다
    const active = document.activeElement;
    measured.roots.forEach((el, r) => {
      const on = hovered.current === r || (active !== document.body && el.contains(active)) || el.hasAttribute("data-active");
      highlight.current[r] = MathUtils.damp(highlight.current[r] ?? 0, on ? 1 : 0, 9, delta);
      const state = (engaged.current[r] ??= { on: false, since: -Infinity });
      if (on && !state.on) state.since = clock.elapsedTime;
      state.on = on;
    });

    layout.steles.forEach((s, i) => {
      const mesh = steleRefs.current[i];
      if (!mesh) return;
      mesh.position.copy(s.center).setY(s.center.y - s.size[1] * (1 - rise[s.item.room]));
    });

    layout.textRuntime.forEach((rt, i) => {
      const mesh = texts.current[i];
      if (!rt || !mesh) return;
      const { item } = rt;
      const look = looks[item.room];
      const h = item.root >= 0 ? highlight.current[item.root] : 0;
      const cut = cutState(item.cut, elapsed);
      const onStone = item.block >= 0;
      const reveal = onStone ? smoothstep(0.55, 0.95, rise[item.room]) : 1;
      const alpha = rt.alpha * (cut ? cut.alpha : 1) * (glOn ? 1 : 0) * reveal;
      const visible = alpha * look.opacity;

      // 폭 사다리: 컷인 중에는 이름이 실제로 넓어지거나 좁아지고, 강조되면 한 칸씩 넓어진다
      let font = item.font;
      if (cut && rt.cutLadder && cut.width < 1) {
        font = rt.cutLadder[Math.round(cut.width * (rt.cutLadder.length - 1))];
      } else if (rt.hoverLadder) {
        font = rt.hoverLadder[Math.round(h * (rt.hoverLadder.length - 1))];
      }
      if (mesh.font !== font) {
        mesh.font = font;
        mesh.sync();
      }

      // 균열하는 글은 금이 닫힌 뒤에야 색이 바뀐다
      const state = item.root >= 0 ? engaged.current[item.root] : undefined;
      const ft = item.effect && state ? (clock.elapsedTime - state.since) / FRACTURE_SECONDS : 1;
      const cracking = Boolean(item.effect && state?.on && ft < 1);
      const tint = item.effect && state?.on ? Math.min(h, smoothstep(0.45, 0.95, ft)) : h;

      const color = mesh.color instanceof Color ? mesh.color : (mesh.color = new Color());
      color.copy(rt.base).lerp(rt.highlight, tint);
      mesh.fillOpacity = visible * (1 - 0.65 * look.blur);
      // 다가오거나 지나가는 방의 글은 번진다. 멈춰 선 방에서, 돌에 새긴 글은 안쪽 그림자로 파인 깊이가 보인다.
      const shadow = onStone ? 1 - look.blur : 0;
      mesh.outlineWidth = 0;
      mesh.outlineBlur = look.blur > 0.01 ? `${(look.blur * 30).toFixed(1)}%` : shadow > 0 ? "3%" : 0;
      mesh.outlineOffsetX = shadow > 0 ? `${(shadow * 2.5).toFixed(2)}%` : 0;
      mesh.outlineOffsetY = shadow > 0 ? `${(-shadow * 3).toFixed(2)}%` : 0;
      mesh.outlineColor = look.blur > 0.01 ? color : BLACK;
      mesh.outlineOpacity = visible * Math.max(look.blur * 0.8, shadow * 0.75);

      const f = frames[item.room];
      mesh.position.copy(rt.anchor);
      if (cut) {
        mesh.position.addScaledVector(f.planeRight, cut.dx * measured.width * rt.perPx);
        mesh.position.addScaledVector(f.planeUp, -cut.dy * item.fontPx * rt.perPx);
      }
      mesh.scale.set(1, cut?.sy ?? 1, 1);

      // 균열: 글이 가로 띠로 갈라져 어긋나고, 세 영역의 잔상이 양옆으로 벌어지고, 빛줄 하나가 비스듬히 지나간다
      const fx = item.effect ? fracture.current[i] : undefined;
      const bounds = mesh.textRenderInfo?.blockBounds;
      if (fx && bounds) {
        const [minX, minY, maxX, maxY] = bounds;
        const height = maxY - minY;
        const em = item.fontPx * rt.perPx;
        const swell = cracking ? Math.sin(Math.PI * Math.min(1, ft / 0.85)) : 0;
        const beat = Math.min(5, Math.floor(ft * 6));
        const drawn = mesh.fillOpacity;
        // 균열하는 동안에는 온전한 글 대신 갈라진 띠들이 보인다
        if (cracking) mesh.fillOpacity = 0;

        fx.bands.forEach((band, k) => {
          if (!band) return;
          const top = maxY - (k / FRACTURE_BANDS) * height;
          const bottom = maxY - ((k + 1) / FRACTURE_BANDS) * height;
          band.clipRect = [minX - em, bottom, maxX + em, top];
          band.position.copy(mesh.position).addScaledVector(f.planeRight, FRACTURE_PATTERN[k][beat] * 0.1 * em * swell);
          (band.color instanceof Color ? band.color : (band.color = new Color())).copy(color);
          band.fillOpacity = cracking ? drawn : 0;
        });
        fx.ghosts.forEach((ghost, k) => {
          if (!ghost) return;
          const side = k === 0 ? 1 : -1;
          ghost.position.copy(mesh.position).addScaledVector(f.planeRight, side * 0.04 * em * swell);
          (ghost.color instanceof Color ? ghost.color : (ghost.color = new Color())).copy(FRACTURE_GHOSTS[k]);
          ghost.fillOpacity = cracking ? drawn * 0.26 * swell : 0;
        });
        if (fx.crack) {
          const grow = smoothstep(0, 0.14, ft);
          const fade = 1 - smoothstep(0.18, 0.45, ft);
          const center = mesh.position
            .clone()
            .addScaledVector(f.planeRight, (minX + maxX) / 2)
            .addScaledVector(f.planeUp, (minY + maxY) / 2)
            .addScaledVector(f.planeNormal, 0.01);
          fx.crack.position.copy(center);
          fx.crack.scale.set(Math.max(1e-4, (maxX - minX) * 1.12 * grow), em * 0.007, 1);
          (fx.crack.material as MeshBasicMaterial).opacity = cracking ? fade * visible : 0;
        }
      }
    });

    layout.placed.forEach((p, i) => {
      const mesh = others.current[i];
      if (!mesh || p.it.kind === "text" || p.it.kind === "hit" || p.it.kind === "carrier") return;
      const look = looks[p.it.room];
      const reveal = p.it.block >= 0 ? smoothstep(0.55, 0.95, rise[p.it.room]) : 1;
      const mat = mesh.material as MeshBasicMaterial;
      mat.opacity = (p.alpha ?? 1) * look.opacity * reveal * (1 - 0.5 * look.blur) * (glOn ? 1 : 0);
    });
  });

  const handlers = (root: number, room: number) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (roomOpacity.current[room] < 0.5) return;
      e.stopPropagation();
      setHover(root);
    },
    onPointerOut: () => {
      if (hovered.current === root) setHover(-1);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (roomOpacity.current[room] < 0.5) return;
      e.stopPropagation();
      // 실제 링크를 누른 것과 같다. 새 탭, 메일 앱이 그대로 동작한다.
      measured.roots[root]?.click();
    },
  });

  return (
    <>
      {STOPS.map((id, room) => (
        <group
          key={id}
          ref={(el) => {
            groups.current[room] = el;
          }}
          visible={false}
        >
          {layout.steles.map((s, i) =>
            s.item.room === room ? (
              <mesh
                key={`stele-${i}`}
                ref={(el) => {
                  steleRefs.current[i] = el;
                }}
                material={stone}
                quaternion={frames[room].quaternion}
                scale={s.size}
              >
                <boxGeometry />
              </mesh>
            ) : null,
          )}

          {layout.placed.map((p, i) => {
            if (p.it.room !== room || p.it.kind === "carrier") return null;

            if (p.it.kind === "text") {
              const it = p.it;
              const rt = layout.textRuntime[i]!;
              const common = {
                font: it.font,
                fontSize: it.fontPx * rt.perPx,
                position: p.anchor,
                quaternion: rt.quaternion,
                anchorX: it.align,
                anchorY: "top" as const,
                textAlign: it.align,
                maxWidth: it.nowrap || it.vertical ? undefined : it.box.w * rt.perPx * 1.003,
                whiteSpace: it.nowrap ? ("nowrap" as const) : ("normal" as const),
                overflowWrap: "normal" as const,
                lineHeight: it.lineHeight,
                letterSpacing: it.letterSpacing,
                material,
                fillOpacity: 0,
                sdfGlyphSize: it.fontPx > 60 ? 128 : 64,
              };
              const fx = it.effect ? (fracture.current[i] ??= { bands: [], ghosts: [], crack: null }) : null;
              return (
                <group key={i}>
                  <Text
                    {...common}
                    ref={(el: TroikaText | null) => {
                      texts.current[i] = el;
                    }}
                    onSync={() => onSync(i)}
                  >
                    {it.text}
                  </Text>
                  {fx && (
                    <>
                      {FRACTURE_GHOSTS.map((_, k) => (
                        <Text
                          key={`ghost-${k}`}
                          {...common}
                          ref={(el: TroikaText | null) => {
                            fx.ghosts[k] = el;
                          }}
                        >
                          {it.text}
                        </Text>
                      ))}
                      {Array.from({ length: FRACTURE_BANDS }, (_, k) => (
                        <Text
                          key={`band-${k}`}
                          {...common}
                          ref={(el: TroikaText | null) => {
                            fx.bands[k] = el;
                          }}
                        >
                          {it.text}
                        </Text>
                      ))}
                      <mesh
                        ref={(el) => {
                          fx.crack = el;
                        }}
                        quaternion={rt.quaternion.clone().multiply(CRACK_TILT)}
                      >
                        <planeGeometry />
                        <meshBasicMaterial color={CRACK_GLOW} transparent opacity={0} toneMapped={false} depthWrite={false} />
                      </mesh>
                    </>
                  )}
                </group>
              );
            }

            const ref = (el: Mesh | null) => {
              others.current[i] = el;
            };
            if (p.it.kind === "line") {
              const offset = p.it.block >= 0 ? frames[room].planeNormal.clone().multiplyScalar(0.003) : new Vector3();
              return (
                <mesh
                  key={i}
                  ref={ref}
                  position={p.anchor.clone().add(offset)}
                  quaternion={p.quaternion}
                  scale={[p.length ?? 0, Math.max(p.it.thickness, 1) * p.perPx, 1]}
                >
                  <planeGeometry />
                  <meshBasicMaterial color={p.color} transparent opacity={0} toneMapped={false} depthWrite={false} />
                </mesh>
              );
            }
            if (p.it.kind === "swatch") {
              return (
                <mesh key={i} ref={ref} position={p.anchor} quaternion={p.quaternion}>
                  <circleGeometry args={[(p.it.box.w / 2) * p.perPx, 32]} />
                  <meshBasicMaterial color={p.color} transparent opacity={0} toneMapped={false} depthWrite={false} />
                </mesh>
              );
            }
            const hit = p.it;
            // 링크 전체를 덮는 보이지 않는 판. 글자 사이를 눌러도 링크가 눌린다.
            return (
              <mesh
                key={i}
                position={p.anchor}
                quaternion={p.quaternion}
                scale={[hit.box.w * p.perPx, hit.box.h * p.perPx, 1]}
                {...handlers(hit.root, room)}
              >
                <planeGeometry />
                <meshBasicMaterial visible={false} />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}
