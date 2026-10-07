import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, Vector2 } from "three";
import { rng } from "./layout";

// 메달의 형태. 소치 2014 메달의 구조를 따른다.
// 둥근 금속판의 테두리는 끊기지 않고 한 바퀴 돌고, 그 안쪽을 넓은 띠 모양의 창이 비스듬히 가로지른다.
// 창 안에는 면을 깎은 투명한 결정 판이 표면과 거의 같은 높이로 담겨, 너머의 공간이 굴절되어 비친다.
// 결정의 면 무늬는 메달마다 시드가 달라 조금씩 다르다. 나중에 로고가 정해지면 이 판에 새긴다.

export const MEDAL = {
  radius: 0.8,
  /** 판 두께(모서리 깎임 제외) */
  depth: 0.1,
  /** 모서리 깎임 */
  bevel: 0.025,
  /** 테두리 링의 안쪽 반지름. 창은 이 안에서 끝난다. */
  rim: 0.84,
  /** 창이 가로지르는 방향. 왼쪽 아래에서 오른쪽 위로. */
  angle: (34 * Math.PI) / 180,
};
/** 각인 그림이 덮는 반지름 */
export const FACE_EXTENT = MEDAL.radius * 1.04;

export type MedalForm = {
  body: ExtrudeGeometry;
  crystal: BufferGeometry;
  /** 앞면에서 본 창의 외곽(메달 좌표, m). 각인 그림이 이 선을 따라 홈을 판다. */
  window: Vector2[];
};

/** 창의 외곽. 위아래 가장자리는 같은 쪽으로 휜 곡선이고, 양 끝은 테두리 링의 안쪽 원을 따른다. */
function windowOutline() {
  const R = MEDAL.radius;
  const ri = R * MEDAL.rim;
  const along = new Vector2(Math.cos(MEDAL.angle), Math.sin(MEDAL.angle));
  const across = new Vector2(-along.y, along.x);
  const point = (u: number, v: number) => along.clone().multiplyScalar(u).addScaledVector(across, v);
  // 가장자리: 가운데가 위로 부푼 완만한 호. 소치처럼 메달의 3분의 1 넘게 차지하는 넓은 띠다.
  const upper = (u: number) => R * 0.27 + R * 0.09 * (1 - (u / ri) ** 2);
  const lower = (u: number) => -R * 0.3 + R * 0.07 * (1 - (u / ri) ** 2);

  const edge = (fn: (u: number) => number) => {
    const points: Vector2[] = [];
    for (let i = 0; i <= 160; i++) {
      const u = -ri + (2 * ri * i) / 160;
      const p = point(u, fn(u));
      if (p.length() <= ri) points.push(p);
    }
    return points;
  };
  const top = edge(upper);
  const bottom = edge(lower).reverse();

  /** 두 점 사이를 안쪽 원을 따라 잇는다 */
  const arc = (from: Vector2, to: Vector2) => {
    const a0 = Math.atan2(from.y, from.x);
    let a1 = Math.atan2(to.y, to.x);
    // 창 바깥(테두리 쪽)을 돌지 않도록 짧은 쪽으로 간다
    while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
    const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.05));
    return Array.from({ length: steps - 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * (i + 1)) / steps;
      return new Vector2(Math.cos(a) * ri, Math.sin(a) * ri);
    });
  };

  return [...top, ...arc(top[top.length - 1], bottom[0]), ...bottom, ...arc(bottom[bottom.length - 1], top[0])];
}

/**
 * 창을 채우는 결정 판. 가장자리에서 초점으로 갈수록 조금씩 솟는 여러 겹의 고리를 부채꼴로 이어,
 * 보석을 깎은 듯한 낮은 돔의 면을 만든다. 뒷면도 거울처럼 같은 면을 갖는다.
 */
function crystalPlate(outline: Vector2[], rand: () => number) {
  const { depth, bevel } = MEDAL;
  const face = depth / 2 + bevel * 0.4;
  const centroid = outline.reduce((s, p) => s.add(p), new Vector2()).divideScalar(outline.length);
  // 결정의 초점은 가운데에서 조금 비켜 있다
  const along = new Vector2(Math.cos(MEDAL.angle), Math.sin(MEDAL.angle));
  const focus = centroid.clone().addScaledVector(along, (rand() - 0.5) * 0.18);

  // 가장자리는 몇 점만 골라 큰 면을 만든다. 너무 잘게 나누면 유리가 아니라 곡면처럼 보인다.
  const step = Math.max(1, Math.round(outline.length / 22));
  const rim = outline.filter((_, i) => i % step === 0).map((p) => focus.clone().add(p.clone().sub(focus).multiplyScalar(0.985)));
  // 고리마다 높이를 크게 달리해 면이 깊게 꺾인다. 빛을 받는 각도가 면마다 달라 결정으로 읽힌다.
  const rings = [
    { k: 1, z: -0.006 },
    { k: 0.72, z: 0.022, twist: 0.5 },
    { k: 0.42, z: 0.04, twist: 0 },
    { k: 0.18, z: 0.052, twist: 0.5 },
  ].map(({ k, z, twist }) =>
    rim.map((p, i) => {
      // 안쪽 고리는 반 칸씩 어긋나 삼각 면이 엇갈린다
      const next = rim[(i + 1) % rim.length];
      const base = twist ? p.clone().lerp(next, twist) : p;
      const jitter = 1 + (rand() - 0.5) * 0.12;
      return { p: focus.clone().add(base.clone().sub(focus).multiplyScalar(k * jitter)), z };
    }),
  );
  const apex = { p: focus, z: 0.058 };

  const positions: number[] = [];
  const push = (a: { p: Vector2; z: number }, b: { p: Vector2; z: number }, c: { p: Vector2; z: number }) => {
    for (const side of [1, -1]) {
      const pts = side === 1 ? [a, b, c] : [a, c, b];
      for (const q of pts) positions.push(q.p.x, q.p.y, side * (face + q.z));
    }
  };
  const n = rim.length;
  for (let r = 0; r < rings.length - 1; r++) {
    const outer = rings[r];
    const inner = rings[r + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      push(outer[i], outer[j], inner[i]);
      push(outer[j], inner[j], inner[i]);
    }
  }
  const last = rings[rings.length - 1];
  for (let i = 0; i < n; i++) push(last[i], last[(i + 1) % n], apex);

  // 가장자리 옆면: 앞뒤 판을 잇는다
  const outerRing = rings[0];
  for (let i = 0; i < n; i++) {
    const a = outerRing[i].p;
    const b = outerRing[(i + 1) % n].p;
    positions.push(a.x, a.y, face, b.x, b.y, -face, b.x, b.y, face);
    positions.push(a.x, a.y, face, a.x, a.y, -face, b.x, b.y, -face);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  // 인덱스 없는 삼각형이라 면마다 법선이 따로 계산된다. 면이 또렷이 갈린다.
  geometry.computeVertexNormals();
  return geometry;
}

export function createMedalForm(seed: number): MedalForm {
  const rand = rng(9001 + seed * 7919);
  const { radius, depth, bevel } = MEDAL;
  const window = windowOutline();

  const shape = new Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  shape.holes.push(new Path(window));

  // 앞뒷면의 각인이 모두 바르게 읽히도록, 뒷면은 좌우를 뒤집어 그림을 붙인다
  const half = depth / 2;
  const toUV = (x: number, y: number, z: number) =>
    new Vector2(0.5 + (z < half ? -x : x) / (2 * FACE_EXTENT), 0.5 + y / (2 * FACE_EXTENT));
  const body = new ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 128,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    UVGenerator: {
      generateTopUV: (_g, v, a, b, c) => [a, b, c].map((i) => toUV(v[i * 3], v[i * 3 + 1], v[i * 3 + 2])),
      generateSideWallUV: () => [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1)],
    },
  });
  body.translate(0, 0, -half);
  body.computeVertexNormals();

  return { body, crystal: crystalPlate(window, rand), window };
}
