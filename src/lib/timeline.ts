// 스크롤을 "몇 번째 방에 있는가"라는 하나의 값으로 바꾼다.
// 3D 카메라와 HTML 무대가 같은 값을 읽으므로, 카메라가 방에 멈추면 글자도 같은 순간 멈춘다.

/** 카메라가 머무는 방. layout.ts의 waypoints와 순서가 같다. */
export const STOPS = ["identity", "dossier", "works", "trophies", "contact"] as const;

/** 방과 방 사이의 스크롤 거리. 화면 높이의 배수 */
export const STEP = 1.15;

export const timeline = {
  /** 0 – STOPS.length-1. 방에 머무는 구간에서는 정수에 멈춰 있다. */
  position: 0,
  /** 고정 무대 방식인지. 움직임 줄이기 설정이나 스크립트가 없으면 일반 스크롤이다. */
  staged: false,
};

/** 구간의 앞뒤 22%는 방에 머물고, 그 사이를 부드럽게 잇는다 */
export function dwell(t: number) {
  const x = Math.min(1, Math.max(0, (t - 0.22) / 0.56));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** 스크롤 진행값(방 단위 실수)을 머무름이 반영된 위치로 바꾼다 */
export function shape(raw: number) {
  const last = STOPS.length - 1;
  const clamped = Math.min(last, Math.max(0, raw));
  const segment = Math.min(Math.floor(clamped), last - 1);
  return segment + dwell(clamped - segment);
}
