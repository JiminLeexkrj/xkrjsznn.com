"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { world } from "@/lib/world-store";
import { positionCurve, targetCurve, waypoints } from "./layout";

const BASE_FOV = 50;
const PORTRAIT_FOV = 60;
const pullbackDir = new Vector3();

/** transform 애니메이션 중에도 흔들리지 않는 문서 기준 위치 */
function pageTop(el: HTMLElement) {
  let top = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
  }
  return top;
}

/** 방에 머무는 구간을 두고, 방과 방 사이는 부드럽게 잇는다 */
function dwell(t: number) {
  const x = MathUtils.clamp((t - 0.12) / 0.76, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

// 스크롤 위치를 영역 안의 카메라 위치로 바꾼다.
// 각 장면이 화면 위쪽에 닿을 즈음 카메라가 그 장면의 방에 도착한다.
export function CameraRig({ reduced }: { reduced: boolean }) {
  const anchors = useRef<number[]>([]);
  const state = useRef({
    // 영역이 열릴 때 뒤에서 앞으로 밀고 들어온다
    position: waypoints[0].position.clone().add(new Vector3(0, 2.5, 16)),
    look: waypoints[0].target.clone(),
    lastScroll: 0,
  });

  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      const max = Math.max(0, document.documentElement.scrollHeight - vh);
      let previous = 0;
      anchors.current = waypoints.map((w) => {
        const el = w.section ? document.getElementById(w.section) : null;
        const top = el ? pageTop(el) - vh * w.lead : max;
        previous = MathUtils.clamp(top, previous, max);
        return previous;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const goalPosition = useRef(new Vector3());
  const goalLook = useRef(new Vector3());

  useFrame((three, rawDelta) => {
    const camera = three.camera as PerspectiveCamera;
    const delta = Math.min(rawDelta, 0.1);
    const a = anchors.current;
    if (a.length < 2) return;
    const s = state.current;
    const scroll = window.scrollY;

    let segment = 0;
    while (segment < a.length - 2 && scroll >= a[segment + 1]) segment++;
    const span = a[segment + 1] - a[segment];
    const t = span > 0 ? MathUtils.clamp((scroll - a[segment]) / span, 0, 1) : 1;
    const u = (segment + dwell(t)) / (a.length - 1);

    const pos = positionCurve.getPoint(u, goalPosition.current);
    const look = targetCurve.getPoint(u, goalLook.current);

    // 세로 화면은 가로 시야가 좁으므로 카메라를 시선 반대쪽으로 조금 물린다
    const aspect = three.size.width / Math.max(three.size.height, 1);
    const pullback = Math.max(0, 1 - aspect) * 18;
    if (pullback > 0) pos.addScaledVector(pullbackDir.subVectors(pos, look).normalize(), pullback);

    // 마우스로 주위를 둘러본다
    if (!reduced) {
      pos.x += world.pointer.x * 0.6;
      pos.y += world.pointer.y * 0.3;
      look.x += world.pointer.x * 3.5;
      look.y += world.pointer.y * 2;
    }

    const lambda = reduced ? 12 : 2.6;
    s.position.x = MathUtils.damp(s.position.x, pos.x, lambda, delta);
    s.position.y = MathUtils.damp(s.position.y, pos.y, lambda, delta);
    s.position.z = MathUtils.damp(s.position.z, pos.z, lambda, delta);
    s.look.x = MathUtils.damp(s.look.x, look.x, lambda * 1.2, delta);
    s.look.y = MathUtils.damp(s.look.y, look.y, lambda * 1.2, delta);
    s.look.z = MathUtils.damp(s.look.z, look.z, lambda * 1.2, delta);

    camera.position.copy(s.position);
    camera.lookAt(s.look);

    // 빠르게 스크롤할수록 시야가 넓어지고 화면이 기운다
    const speed = Math.abs(scroll - s.lastScroll) / Math.max(delta, 1e-3);
    s.lastScroll = scroll;
    world.velocity = MathUtils.damp(world.velocity, reduced ? 0 : MathUtils.clamp(speed / 2500, 0, 1), 5, delta);
    camera.rotateZ(-world.pointer.x * 0.025 * (reduced ? 0 : 1));
    camera.fov = (aspect < 1 ? PORTRAIT_FOV : BASE_FOV) + world.velocity * 16;
    camera.updateProjectionMatrix();
  });

  return null;
}
