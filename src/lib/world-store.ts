// HTML과 3D 세계가 함께 읽는 작은 상태. 3D 쪽은 매 프레임 직접 읽으므로 React 렌더링을 거치지 않는다.

type State = {
  /** 마우스를 올린 프로젝트의 순서. 없으면 null */
  hoveredProject: number | null;
  /** 목록에서 마우스를 올린 수상의 순서. 없으면 null */
  hoveredAward: number | null;
  /** 3D 홀에서 커서 아래에 있는 메달의 순서. 없으면 null. 커서 옆 팝업이 읽는다. */
  pointedAward: number | null;
  /** -1–1, 화면 중앙이 0 */
  pointer: { x: number; y: number };
  /** 화면 좌표(px) */
  pointerPx: { x: number; y: number };
  /** 마우스가 실제로 움직였는지. 터치 기기나 첫 화면에서는 가운데를 가리킨 것으로 보지 않는다. */
  pointerSeen: boolean;
  /** 0–1, 스크롤 속도 */
  velocity: number;
};

export const world: State = {
  hoveredProject: null,
  hoveredAward: null,
  pointedAward: null,
  pointer: { x: 0, y: 0 },
  pointerPx: { x: 0, y: 0 },
  pointerSeen: false,
  velocity: 0,
};
