// 진입 화면(HTML)과 3D 진입 장면이 함께 읽는 상태.
// HTML 쪽이 입력을 받아 값을 쓰고, 3D 쪽은 매 프레임 읽기만 한다.

export const intro = {
  /** 3D 진입 장면이 첫 프레임들을 그렸는지. 그 전에는 2D 연출로 대신한다. */
  ready: false,
  /** 0–1, 준비가 얼마나 끝났는지. 로딩 표시가 읽는다. */
  progress: 0,
  /** 0–1, 누르고 있는 정도 */
  hold: 0,
  /** 폭발이 시작된 시각(performance.now). 시작 전에는 null */
  burstStart: null as number | null,
};

/**
 * 준비 단계를 알린다. 진행률은 거꾸로 가지 않는다.
 * 0.04 페이지 / 0.12 폰트 / 0.3 3D 엔진 / 0.4 렌더러 / 0.62 진입 장면 / 0.66–0.98 3D 글자 / 1 끝
 */
export function reportProgress(value: number) {
  intro.progress = Math.max(intro.progress, Math.min(1, value));
}

/** 압축부터 착지까지 걸리는 시간 */
export const BURST_MS = 2600;
/** 폭발 구간 중 한 점으로 압축되는 앞부분의 비율 */
export const IMPLODE = 0.1;
/** 이 비율에 이르면 영역이 열린 것으로 보고 사이트를 드러낸다 */
export const REVEAL_AT = 0.62;

export function burstProgress(now = performance.now()) {
  return intro.burstStart === null ? 0 : Math.min(1, (now - intro.burstStart) / BURST_MS);
}
