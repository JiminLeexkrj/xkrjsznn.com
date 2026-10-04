// HTML과 3D 세계가 함께 읽는 작은 상태. 3D 쪽은 매 프레임 직접 읽으므로 React 렌더링을 거치지 않는다.

type State = {
  /** 마우스를 올린 프로젝트의 순서. 없으면 null */
  hoveredProject: number | null;
  /** -1–1, 화면 중앙이 0 */
  pointer: { x: number; y: number };
  /** 0–1, 스크롤 속도 */
  velocity: number;
};

export const world: State = {
  hoveredProject: null,
  pointer: { x: 0, y: 0 },
  velocity: 0,
};
