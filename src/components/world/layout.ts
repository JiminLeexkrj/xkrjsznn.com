import { CatmullRomCurve3, Vector3 } from "three";
import type { STOPS } from "@/lib/timeline";

// 영역 안의 배치. 단위는 대략 미터. 카메라는 -Z 방향으로 걸어 들어간다.

export type Waypoint = {
  /** 이 지점에 대응하는 장면 id. 순서는 timeline.ts의 STOPS와 같다. */
  section: (typeof STOPS)[number];
  position: Vector3;
  target: Vector3;
};

export const RING = { center: new Vector3(0, 7, -140), radius: 11 };
/** 영역 입구 너머의 허공. 진입 화면이 여기서 펼쳐지고, 카메라는 이곳을 뚫고 영역 안으로 들어간다. */
export const INTRO = { center: new Vector3(0, 7, 84), camera: new Vector3(0, 7.3, 100) };
export const WORKS_ROOM = new Vector3(5.5, 2.6, -55);
export const TROPHY_HALL = new Vector3(0, 0, -86);

export const waypoints: Waypoint[] = [
  { section: "identity", position: new Vector3(0, 1.7, 10), target: new Vector3(0, 2.8, -30) },
  { section: "dossier", position: new Vector3(-2.5, 2.4, -14), target: new Vector3(3.5, 3.4, -34) },
  { section: "works", position: new Vector3(1.6, 1.6, -38), target: WORKS_ROOM.clone() },
  { section: "trophies", position: new Vector3(1.4, 3.0, -76), target: new Vector3(2.2, 2.2, -88) },
  // 마지막 방에서는 영역의 고리가 화면을 크게 감싼다
  { section: "contact", position: new Vector3(0, 4.2, -115), target: new Vector3(0, 7.4, -140) },
];

/** 화면 비율에 따른 기본 시야각. 세로 화면은 넓게 본다. */
export const fovFor = (aspect: number) => (aspect < 1 ? 60 : 50);

/** 세로 화면은 가로 시야가 좁으므로 카메라를 시선 반대쪽으로 물린다 */
export function applyPullback(position: Vector3, look: Vector3, aspect: number) {
  const pullback = Math.max(0, 1 - aspect) * 18;
  if (pullback > 0) position.addScaledVector(new Vector3().subVectors(position, look).normalize(), pullback);
  return position;
}

export const positionCurve = new CatmullRomCurve3(
  waypoints.map((w) => w.position),
  false,
  "centripetal",
);
export const targetCurve = new CatmullRomCurve3(
  waypoints.map((w) => w.target),
  false,
  "centripetal",
);

// 바닥 위 카메라 경로를 촘촘히 샘플링해 둔다. 모노리스가 길을 막지 않게 하는 데 쓴다.
const pathSamples = positionCurve.getPoints(400);

export function pathXAt(z: number) {
  let best = pathSamples[0];
  for (const p of pathSamples) if (Math.abs(p.z - z) < Math.abs(best.z - z)) best = p;
  return best.x;
}

/** 시드가 같으면 늘 같은 배치가 나온다 */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Slab = {
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  shade: number;
  /** 붉은 균열이 있는 면의 방향. 0이면 없음 */
  slit: -1 | 0 | 1;
};

export function generateMonoliths(density = 1): Slab[] {
  const rand = rng(20060401);
  const slabs: Slab[] = [];
  const keepClear = (x: number, z: number, halfWidth: number, clearance: number) =>
    Math.abs(x - pathXAt(z)) > clearance + halfWidth;
  const nearHall = (x: number, z: number) => Math.hypot(x - TROPHY_HALL.x, z - TROPHY_HALL.z) < 15;
  const nearWorks = (x: number, z: number) => Math.hypot(x - WORKS_ROOM.x, z - WORKS_ROOM.z) < 6;
  // 마지막 장면에서 고리를 가리지 않도록 고리 앞쪽은 비워 둔다
  const blocksRing = (x: number, z: number, halfWidth = 0) =>
    (z < -104 && Math.abs(x - RING.center.x) - halfWidth < RING.radius + 2.5) || blocksText(x, z, halfWidth);
  // 방마다 글자가 떠 있는 시야 앞쪽(카메라에서 8m까지)은 비워 둔다. 구조물이 글을 가리지 않는다.
  const stops = waypoints.map((w) => ({
    x: w.position.x,
    z: w.position.z,
    fx: w.target.x - w.position.x,
    fz: w.target.z - w.position.z,
  }));
  stops.forEach((s) => {
    const len = Math.hypot(s.fx, s.fz);
    s.fx /= len;
    s.fz /= len;
  });
  function blocksText(x: number, z: number, halfWidth: number) {
    return stops.some((s) => {
      const dx = x - s.x;
      const dz = z - s.z;
      const along = dx * s.fx + dz * s.fz;
      const lateral = Math.abs(dx * s.fz - dz * s.fx);
      return along > 0.5 && along < 8 && lateral - halfWidth < along * 0.62;
    });
  }

  // 길 양옆으로 선 모노리스
  for (let z = 18; z > -150; z -= 3.2 / density) {
    for (const side of [-1, 1]) {
      if (rand() < 0.25) continue;
      const width = 0.8 + rand() * 2.8;
      const depth = 0.8 + rand() * 2.2;
      const height = 3 + Math.pow(rand(), 1.6) * 34;
      const x = pathXAt(z) + side * (4.5 + rand() * 10);
      const zz = z + (rand() - 0.5) * 2.5;
      if (!keepClear(x, zz, width / 2, 3.2) || nearHall(x, zz) || nearWorks(x, zz) || blocksRing(x, zz, width / 2))
        continue;
      // 반항적으로 살짝 기운 것들
      const lean = rand() < 0.3 ? (rand() - 0.5) * 0.16 : 0;
      slabs.push({
        position: [x, height / 2 - 0.4 * rand(), zz],
        size: [width, height, depth],
        rotation: [lean * 0.5, (rand() - 0.5) * 0.6, lean],
        shade: 0.75 + rand() * 0.5,
        slit: rand() < 0.22 ? (side > 0 ? -1 : 1) : 0,
      });
    }
  }

  // 위에서 내려온 거대한 판. 안개 속으로 꼭대기가 사라진다.
  for (let z = 4; z > -92; z -= 11 / density) {
    if (rand() < 0.35) continue;
    const width = 2 + rand() * 6;
    const height = 18 + rand() * 30;
    const bottom = 9 + rand() * 9;
    slabs.push({
      position: [pathXAt(z) + (rand() - 0.5) * 14, bottom + height / 2, z + (rand() - 0.5) * 4],
      size: [width, height, 0.6 + rand() * 1.4],
      rotation: [0, (rand() - 0.5) * 1.2, (rand() - 0.5) * 0.08],
      shade: 0.6 + rand() * 0.3,
      slit: 0,
    });
  }

  // 쓰러진 판 몇 개
  for (let i = 0; i < 6 * density; i++) {
    const z = 10 - rand() * 140;
    const side = rand() < 0.5 ? -1 : 1;
    const x = pathXAt(z) + side * (5 + rand() * 6);
    const length = 4 + rand() * 6;
    if (nearHall(x, z) || nearWorks(x, z) || blocksRing(x, z, length / 2)) continue;
    slabs.push({
      position: [x, 0.5, z],
      size: [length, 1 + rand() * 0.6, 1.4 + rand()],
      rotation: [0, rand() * Math.PI, (rand() - 0.5) * 0.25],
      shade: 0.7,
      slit: 0,
    });
  }

  // 트로피 홀을 둘러싼 규칙적인 기둥. 4단계에서 메달이 들어온다.
  const pillars = 10;
  for (let i = 0; i < pillars; i++) {
    const a = (i / pillars) * Math.PI * 2 + Math.PI / pillars;
    // 카메라가 들어오는 쪽(+Z)은 비워 두고, 고리로 이어지는 뒤쪽 가운데는 문처럼 열어 둔다
    if (Math.sin(a) > 0.55) continue;
    if (Math.sin(a) < 0 && Math.abs(Math.cos(a)) < 0.4) continue;
    const r = 12.5;
    slabs.push({
      position: [TROPHY_HALL.x + Math.cos(a) * r, 11, TROPHY_HALL.z + Math.sin(a) * r],
      size: [1.6, 22, 1.6],
      rotation: [0, -a, 0],
      shade: 0.9,
      slit: 0,
    });
  }

  return slabs;
}
