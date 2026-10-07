import { Color } from "three";

// 세 영역의 색. globals.css의 토큰과 같은 값이다.
// 虚 hollow: 나, 공허 / 氷 frost: 차가운 논리, 만드는 것 / 熾 ember: 열, 성취
export const HOLLOW = new Color("#7b5cff");
export const FROST = new Color("#79d8ea");
export const EMBER = new Color("#ec9a3a");
export const DUST = new Color("#d9d3c7");

export type Domain = "hollow" | "frost" | "ember";
export const DOMAINS: Record<Domain, Color> = { hollow: HOLLOW, frost: FROST, ember: EMBER };
export const TRIAD = [HOLLOW, FROST, EMBER];

/** 길 위의 깊이(z)에 따른 영역. 방을 지날수록 보라, 청록, 호박으로 넘어간다. */
const BANDS: [number, Color][] = [
  [-20, HOLLOW],
  [-34, FROST],
  [-58, FROST],
  [-72, EMBER],
];

export function domainAt(z: number, target = new Color()) {
  if (z >= BANDS[0][0]) return target.copy(BANDS[0][1]);
  for (let i = 0; i < BANDS.length - 1; i++) {
    const [z0, c0] = BANDS[i];
    const [z1, c1] = BANDS[i + 1];
    if (z <= z0 && z >= z1) return target.copy(c0).lerp(c1, (z0 - z) / (z0 - z1));
  }
  return target.copy(BANDS[BANDS.length - 1][1]);
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 블룸이 걸리도록 톤매핑 범위를 넘는 밝기의 색 */
export const glow = (color: Color, intensity: number) => color.clone().multiplyScalar(intensity);
