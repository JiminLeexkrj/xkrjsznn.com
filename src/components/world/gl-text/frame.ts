import { Matrix4, Quaternion, Vector3 } from "three";
import { applyPullback, fovFor, positionCurve, targetCurve, waypoints } from "../layout";
import type { Box } from "./measure";

// 방마다 글이 서는 면. 카메라가 그 방에 섰을 때 HTML과 같은 자리에 보이도록 화면 좌표를 이 면 위로 투영한다.
// 면은 언제나 땅에 수직으로 선다. 석비와 기둥이 똑바로 서고, 글은 그 앞면에 새겨진다.
// depth: 카메라에서 면까지의 거리(m). yaw: 면을 세로축으로 돌린 각도. 벽처럼 비스듬해진다.
const PLANES = [
  { depth: 5.2, yaw: 0 }, // identity: 길 위에 선 기념비
  { depth: 5.4, yaw: 0.3 }, // dossier: 왼쪽 벽을 따라 오른쪽 안쪽으로 멀어진다
  { depth: 5.4, yaw: 0.14 }, // works
  { depth: 5.4, yaw: 0.08 }, // trophies
  { depth: 5.5, yaw: 0 }, // contact: 영역의 고리 앞
];

const UP = new Vector3(0, 1, 0);
/** 글자가 바닥을 뚫지 않도록 지키는 최소 높이 */
export const FLOOR = 0.06;
const NEAR = 1.2;

export type RoomFrame = {
  position: Vector3;
  forward: Vector3;
  right: Vector3;
  up: Vector3;
  tanHalf: number;
  aspect: number;
  width: number;
  height: number;
  planePoint: Vector3;
  planeNormal: Vector3;
  planeRight: Vector3;
  planeUp: Vector3;
  quaternion: Quaternion;
  /** 바닥에 눕힌 글의 방향. 글의 위쪽이 카메라에서 멀어지는 쪽이다. */
  floorQuaternion: Quaternion;
};

export function roomFrame(room: number, width: number, height: number): RoomFrame {
  const aspect = width / height;
  const u = room / (waypoints.length - 1);
  const position = positionCurve.getPoint(u);
  const look = targetCurve.getPoint(u);
  applyPullback(position, look, aspect);

  const forward = look.clone().sub(position).normalize();
  const right = forward.clone().cross(UP).normalize();
  const up = right.clone().cross(forward).normalize();
  const { depth, yaw } = PLANES[room];
  // 세로 화면에서는 기울기를 줄여 읽기 쉽게 한다
  const angle = yaw * (aspect < 1 ? 0.4 : 1);

  // 수평 성분만 써서 면을 수직으로 세운다
  const level = new Vector3(forward.x, 0, forward.z).normalize();
  const planeRight = right.clone().applyAxisAngle(UP, angle);
  const planeNormal = level.clone().negate().applyAxisAngle(UP, angle);
  const planeUp = UP.clone();
  const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(planeRight, planeUp, planeNormal));
  const floorQuaternion = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, level, UP));

  return {
    position,
    forward,
    right,
    up,
    tanHalf: Math.tan(((fovFor(aspect) * Math.PI) / 180) / 2),
    aspect,
    width,
    height,
    planePoint: position.clone().addScaledVector(forward, depth),
    planeNormal,
    planeRight,
    planeUp,
    quaternion,
    floorQuaternion,
  };
}

function ray(f: RoomFrame, x: number, y: number) {
  const ndcX = (x / f.width) * 2 - 1;
  const ndcY = 1 - (y / f.height) * 2;
  return f.forward
    .clone()
    .addScaledVector(f.right, ndcX * f.tanHalf * f.aspect)
    .addScaledVector(f.up, ndcY * f.tanHalf);
}

export type Placement = {
  /** 기준점의 월드 좌표 */
  anchor: Vector3;
  /** 화면 1px이 그 자리에서 몇 m인지 */
  perPx: number;
};

/** 화면의 한 점(px)을 면 위에 놓는다. z만큼 같은 레이를 따라 더 깊이 보내 화면 위치는 그대로 둔다. */
export function project(f: RoomFrame, x: number, y: number, z = 0): Placement {
  const dir = ray(f, x, y);
  const toPlane = f.planePoint.clone().sub(f.position).dot(f.planeNormal);
  const t = Math.max(NEAR, toPlane / dir.dot(f.planeNormal) + z / dir.dot(f.forward));
  return {
    anchor: f.position.clone().addScaledVector(dir, t),
    // 화면 1px은 시선 방향 거리에 비례한다
    perPx: (2 * t * dir.dot(f.forward) * f.tanHalf) / f.height,
  };
}

/** 카메라를 중심으로 통째로 당기거나 민다. 화면 위치는 그대로, 크기만 바뀐다. */
export function scaleToward(f: RoomFrame, p: Placement, scale: number): Placement {
  if (scale === 1) return p;
  return { anchor: p.anchor.clone().sub(f.position).multiplyScalar(scale).add(f.position), perPx: p.perPx * scale };
}

/** 상자(px)의 아래 모서리가 모두 바닥 위에 오도록 카메라 쪽으로 당길 비율. 1이면 그대로 */
export function floorScale(f: RoomFrame, box: Box, z: number) {
  if (f.position.y <= FLOOR) return 1;
  let scale = 1;
  for (const x of [box.x, box.x + box.w]) {
    const corner = project(f, x, box.y + box.h, z).anchor;
    if (corner.y < FLOOR) scale = Math.min(scale, (f.position.y - FLOOR) / (f.position.y - corner.y));
  }
  return Math.max(scale, 0.25);
}

/** 화면의 한 점을 바닥(y=0) 위로 내려 놓는다. 바닥에 새긴 글에 쓴다. */
export function projectFloor(f: RoomFrame, x: number, y: number): Placement | null {
  const dir = ray(f, x, y);
  if (dir.y >= -1e-3) return null;
  const t = (0.012 - f.position.y) / dir.y;
  return { anchor: f.position.clone().addScaledVector(dir, t), perPx: (2 * t * dir.dot(f.forward) * f.tanHalf) / f.height };
}

/** 상자의 기준점. 정렬에 따라 왼쪽, 가운데, 오른쪽 위 */
export function anchorOf(box: Box, align: "left" | "center" | "right") {
  const x = align === "left" ? box.x : align === "center" ? box.x + box.w / 2 : box.x + box.w;
  return { x, y: box.y };
}
