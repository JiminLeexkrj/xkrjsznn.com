"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from "three";
import { burstProgress, intro } from "@/lib/intro-store";
import { timeline } from "@/lib/timeline";
import { world } from "@/lib/world-store";
import { easeInOutCubic } from "./colors";
import { INTRO, applyPullback, fovFor, positionCurve, targetCurve, waypoints } from "./layout";


/** 마우스로 둘러볼 때 궤도의 중심까지 거리(m). 방마다 글자가 놓이는 깊이와 같다. */
const PIVOT = 5.5;
const pivotPoint = new Vector3();

// 진입 장면에서 터진 중심을 뚫고 영역 입구까지 날아 들어가는 길
const landing = waypoints[0].position.clone().add(new Vector3(0, 0.8, 5));
const diveCurve = new CatmullRomCurve3([
  INTRO.camera.clone(),
  INTRO.center.clone().add(new Vector3(0, 0.3, 0)),
  new Vector3(0, 5, 46),
  landing,
]);

// 시간축(timeline.position)을 영역 안의 카메라 위치로 바꾼다.
// HTML 무대와 같은 값을 그대로 따르므로, 카메라가 방에 멈추는 순간 글자도 멈춘다.
export function CameraRig({ reduced }: { reduced: boolean }) {
  const state = useRef({
    position: new Vector3(),
    /** 경로에서 벗어나 있는 만큼. 처음엔 뒤에서 밀고 들어오고, 진입 직후 착지할 때도 이걸로 경로에 붙는다. */
    offset: new Vector3(0, 2.5, 16),
    pointer: { x: 0, y: 0 },
    lastPosition: 0,
    inIntro: false,
  });
  const goalPosition = useRef(new Vector3());
  const goalLook = useRef(new Vector3());

  useFrame((three, rawDelta) => {
    const camera = three.camera as PerspectiveCamera;
    const delta = Math.min(rawDelta, 0.1);
    const s = state.current;
    const aspect = three.size.width / Math.max(three.size.height, 1);
    const baseFov = fovFor(aspect);

    // 진입 화면: 허공을 바라보다가, 폭발하면 그 중심을 뚫고 영역으로 날아든다
    const b = burstProgress();
    const entered = Boolean(document.documentElement.dataset.entered);
    if (!entered || (b > 0 && b < 1)) {
      s.inIntro = true;
      const pos = goalPosition.current;
      const look = goalLook.current;
      if (b === 0) {
        // 세로 화면에서는 소용돌이가 다 들어오도록 뒤로 물러선다
        pos.copy(INTRO.camera).setZ(INTRO.camera.z + Math.max(0, 1 - aspect) * 16);
        look.copy(INTRO.center);
        if (!reduced) {
          pos.x += world.pointer.x * 0.8;
          pos.y += world.pointer.y * 0.5;
          const shake = Math.max(0, intro.hold - 0.6) * 0.18;
          pos.x += (Math.random() - 0.5) * shake;
          pos.y += (Math.random() - 0.5) * shake;
        }
        world.velocity = MathUtils.damp(world.velocity, 0, 5, delta);
      } else {
        const travel = easeInOutCubic(MathUtils.clamp((b - 0.05) / 0.85, 0, 1));
        diveCurve.getPoint(travel, pos);
        look.copy(INTRO.center).lerp(waypoints[0].target, easeInOutCubic(MathUtils.clamp((b - 0.2) / 0.7, 0, 1)));
        // 날아드는 동안 시야가 넓어지고 색이 갈라진다
        world.velocity = Math.sin(Math.PI * MathUtils.clamp((b - 0.06) / 0.8, 0, 1));
      }
      s.position.copy(pos);
      camera.position.copy(pos);
      camera.lookAt(look);
      camera.fov = baseFov + world.velocity * 22;
      camera.updateProjectionMatrix();
      return;
    }

    const u = timeline.position / (waypoints.length - 1);
    const pos = positionCurve.getPoint(u, goalPosition.current);
    const look = targetCurve.getPoint(u, goalLook.current);

    applyPullback(pos, look, aspect);

    // 진입 장면이나 건너뛰기에서 넘어온 첫 프레임: 지금 자리와 경로의 차이를 기억해 두고 서서히 줄인다
    if (s.inIntro) {
      s.inIntro = false;
      s.offset.subVectors(s.position, pos);
    }
    const settle = reduced ? 12 : 2.2;
    s.offset.x = MathUtils.damp(s.offset.x, 0, settle, delta);
    s.offset.y = MathUtils.damp(s.offset.y, 0, settle, delta);
    s.offset.z = MathUtils.damp(s.offset.z, 0, settle, delta);
    pos.add(s.offset);

    // 마우스로 둘러본다. 글자가 떠 있는 깊이의 한 점을 중심으로 궤도를 돈다.
    // 그 깊이의 글자는 마우스 아래 그대로 있어 누르기 쉽고, 앞뒤의 것들만 시차로 움직인다.
    const pivot = pivotPoint.copy(look).sub(pos).normalize().multiplyScalar(PIVOT).add(pos);
    const p = s.pointer;
    p.x = MathUtils.damp(p.x, reduced ? 0 : world.pointer.x, 4, delta);
    p.y = MathUtils.damp(p.y, reduced ? 0 : world.pointer.y, 4, delta);
    pos.x += p.x * 0.4;
    pos.y += p.y * 0.2;

    s.position.copy(pos);
    camera.position.copy(pos);
    camera.lookAt(pivot);

    // 빠르게 지나갈수록 시야가 넓어진다
    const speed = Math.abs(timeline.position - s.lastPosition) / Math.max(delta, 1e-3);
    s.lastPosition = timeline.position;
    world.velocity = MathUtils.damp(world.velocity, reduced ? 0 : MathUtils.clamp(speed / 2.4, 0, 1), 5, delta);
    camera.rotateZ(-p.x * 0.008);
    camera.fov = baseFov + world.velocity * 16;
    camera.updateProjectionMatrix();
  });

  return null;
}
