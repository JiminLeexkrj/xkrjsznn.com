import { Color } from "three";

// globals.css의 색 토큰과 같은 값
export const RED = new Color("#c1121f");
export const VIOLET = new Color("#7a2cf0");
export const DUST = new Color("#d9d3c7");

/** 블룸이 걸리도록 톤매핑 범위를 넘는 밝기의 색 */
export const glow = (color: Color, intensity: number) => color.clone().multiplyScalar(intensity);
