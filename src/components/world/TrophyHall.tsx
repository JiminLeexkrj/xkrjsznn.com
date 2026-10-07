"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { awardsByYear, reservedPlinths, type Medal } from "@/content/awards";
import { timeline } from "@/lib/timeline";
import { world } from "@/lib/world-store";
import { DUST, EMBER, glow } from "./colors";
import { createConcreteMaterial } from "./concrete-material";
import { TROPHY_HALL, waypoints } from "./layout";
import { createMedalEnvironment } from "./medal-environment";
import { createMedalFace } from "./medal-face";
import { MEDAL, createMedalForm } from "./medal-geometry";
import { ENGRAVING, createPlinthEngraving } from "./plinth-engraving";

const awards = awardsByYear();
const viewer = waypoints.find((w) => w.section === "trophies")!.position;

// 흑화된 금속. 반짝이는 상패가 아니라 두드려 만든 무거운 덩어리처럼 보이게 어둡고 조금 거칠다.
const tint: Record<Medal, string> = { gold: "#d4ad5c", silver: "#c4c4c6", bronze: "#b97f55" };
const plinthHeight: Record<Medal | "reserved", number> = { gold: 1.7, silver: 1.4, bronze: 1.15, reserved: 0.9 };

/** 관람자를 향해 오목하게 휜 반원 위의 자리들 */
function layoutSlots(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : MathUtils.lerp(-0.95, 0.95, i / (count - 1));
    // 왼쪽은 HTML 목록 자리라 조금 오른쪽으로 비켜 선다
    const x = TROPHY_HALL.x + 2 + Math.sin(t) * 6.4;
    const z = TROPHY_HALL.z + 2 - Math.cos(t) * 5;
    return { x, z, facing: Math.atan2(viewer.x - x, viewer.z - z) };
  });
}

/** 각도를 목표에 가장 가까운 바퀴로 옮긴다. 돌던 메달이 한 바퀴 더 돌지 않게 한다. */
function nearestTurn(current: number, target: number) {
  return target + Math.round((current - target) / (Math.PI * 2)) * Math.PI * 2;
}

/**
 * 결정. 굴절(transmission)은 장면을 한 번 더 그려야 해서 쓰지 않는다.
 * 대신 반투명한 몸체에 면마다 다른 반사와 박막 무지갯빛을 실어, 가볍게 결정처럼 보이게 한다.
 */
function createCrystalMaterial(env: MeshStandardMaterial["envMap"]) {
  return new MeshPhysicalMaterial({
    color: "#e4defa",
    metalness: 0,
    roughness: 0.05,
    ior: 2.3,
    specularIntensity: 1,
    iridescence: 0.75,
    iridescenceIOR: 1.9,
    iridescenceThicknessRange: [180, 620],
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMap: env,
    envMapIntensity: 3.2,
    flatShading: true,
    transparent: true,
    opacity: 0.42,
  });
}

export function TrophyHall({ reduced }: { reduced: boolean }) {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => createMedalEnvironment(gl), [gl]);
  const forms = useMemo(() => awards.map((_, i) => createMedalForm(i)), []);
  const faces = useMemo(() => awards.map((a, i) => createMedalFace(a, forms[i])), [forms]);
  const concrete = useMemo(() => createConcreteMaterial("#6f6a63"), []);
  // 받침대 앞면에 음각으로 새긴 대회 이름
  const engravings = useMemo(() => awards.map((a) => createPlinthEngraving(a.event)), []);
  const engravingMaterials = useMemo(
    () =>
      engravings.map(
        (e) =>
          new MeshStandardMaterial({
            map: e.texture,
            transparent: true,
            roughness: 1,
            metalness: 0,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          }),
      ),
    [engravings],
  );
  const slots = useMemo(() => layoutSlots(awards.length + reservedPlinths), []);
  const lineColor = useMemo(() => glow(EMBER, 2.2), []);
  const waitingColor = useMemo(() => glow(EMBER, 1.1), []);
  // 아직 비어 있는 자리에는 앞으로 올 메달의 외곽과 창이 가는 선으로만 떠 있다
  const waitingOutlines = useMemo(() => {
    const form = createMedalForm(awards.length);
    const circle = Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new Vector3(Math.cos(a) * MEDAL.radius, Math.sin(a) * MEDAL.radius, 0);
    });
    const lines = [
      new BufferGeometry().setFromPoints(circle),
      new BufferGeometry().setFromPoints(form.window.map((p) => new Vector3(p.x, p.y, 0))),
    ];
    form.body.dispose();
    form.crystal.dispose();
    return lines;
  }, []);

  const materials = useMemo(
    () =>
      awards.map((award, i) => {
        const base = { color: new Color(tint[award.medal]), metalness: 1, envMap: env, envMapIntensity: 1.3 };
        // ExtrudeGeometry의 재질 순서: 앞뒷면, 옆면(모서리 깎임 포함)
        const face = new MeshStandardMaterial({
          ...base,
          roughness: 0.3,
          map: faces[i].texture,
          bumpMap: faces[i].texture,
          bumpScale: 3,
        });
        const side = new MeshStandardMaterial({ ...base, roughness: 0.22 });
        return { body: [face, side], crystal: createCrystalMaterial(env) };
      }),
    [env, faces],
  );

  // 웹폰트가 늦게 도착했으면 다시 새긴다
  useEffect(() => {
    let alive = true;
    void document.fonts.ready.then(() => {
      if (!alive) return;
      faces.forEach((f) => f.draw());
      engravings.forEach((e) => e.draw());
    });
    return () => {
      alive = false;
    };
  }, [faces, engravings]);

  useEffect(
    () => () => {
      env.dispose();
      faces.forEach((f) => f.texture.dispose());
      forms.forEach((f) => {
        f.body.dispose();
        f.crystal.dispose();
      });
      materials.forEach((m) => {
        m.body.forEach((mat) => mat.dispose());
        m.crystal.dispose();
      });
      waitingOutlines.forEach((g) => g.dispose());
      engravings.forEach((e) => e.texture.dispose());
      engravingMaterials.forEach((m) => m.dispose());
      concrete.dispose();
    },
    [env, faces, forms, materials, waitingOutlines, engravings, engravingMaterials, concrete],
  );

  const medals = useRef<(Group | null)[]>([]);
  const targets = useRef<Mesh[]>([]);
  const waiting = useRef<(Group | null)[]>([]);
  const light = useRef<PointLight>(null);
  const raycaster = useMemo(() => new Raycaster(), []);
  const pointer = useMemo(() => new Vector2(), []);
  const lastActive = useRef<number | null>(null);

  useFrame(({ camera, clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const time = clock.elapsedTime;

    // 메달에 직접 마우스를 올려도, 아래 목록에 올려도 같은 메달이 반응한다
    raycaster.setFromCamera(pointer.set(world.pointer.x, world.pointer.y), camera);
    // 트로피 방에 서 있을 때만 메달을 가리킨다. 멀리서 보이는 메달에는 반응하지 않는다.
    const inRoom = Math.abs(timeline.position - 3) < 0.35;
    const hit = world.pointerSeen && inRoom ? raycaster.intersectObjects(targets.current, false)[0] : undefined;
    const pointed = hit ? (hit.object.userData.medal as number) : null;
    world.pointedAward = pointed;
    const active = world.hoveredAward ?? pointed;

    if (active !== lastActive.current) {
      lastActive.current = active;
      document.querySelectorAll<HTMLElement>("[data-award-index]").forEach((el) => {
        el.toggleAttribute("data-active", Number(el.dataset.awardIndex) === active);
      });
    }

    medals.current.forEach((group, i) => {
      if (!group) return;
      const slot = slots[i];
      const isActive = active === i;
      const baseY = plinthHeight[awards[i].medal] + 1.15;
      const bob = reduced ? 0 : Math.sin(time * 0.9 + i * 1.3) * 0.08;
      group.position.y = MathUtils.damp(group.position.y, baseY + bob + (isActive ? 0.25 : 0), 5, delta);

      if (isActive || reduced) {
        const target = slot.facing + (isActive ? world.pointer.x * 0.5 : 0);
        group.rotation.y = MathUtils.damp(group.rotation.y, nearestTurn(group.rotation.y, target), 6, delta);
        group.rotation.x = MathUtils.damp(group.rotation.x, isActive ? -world.pointer.y * 0.35 : 0, 6, delta);
      } else {
        // 무거운 판이 천천히 돈다
        group.rotation.y += delta * (0.32 + i * 0.05);
        group.rotation.x = MathUtils.damp(group.rotation.x, 0, 4, delta);
      }
      const scale = MathUtils.damp(group.scale.x, isActive ? 1.15 : 1, 6, delta);
      group.scale.setScalar(scale);
    });

    waiting.current.forEach((outline, i) => {
      if (!outline) return;
      if (!reduced) outline.rotation.y = time * 0.25 + i;
    });

    const l = light.current!;
    l.intensity = MathUtils.damp(l.intensity, active === null ? 0 : 14, 6, delta);
    if (active !== null) {
      const slot = slots[active];
      l.position.set(slot.x + Math.sin(slot.facing) * 2, plinthHeight[awards[active].medal] + 1.8, slot.z + Math.cos(slot.facing) * 2);
    }
  });

  const registerTarget = (medal: number) => (el: Mesh | null) => {
    if (!el) return;
    el.userData.medal = medal;
    if (!targets.current.includes(el)) targets.current.push(el);
  };

  return (
    <group>
      {slots.map((slot, i) => {
        const award = awards[i];
        const height = plinthHeight[award ? award.medal : "reserved"];
        return (
          <group key={i} position={[slot.x, 0, slot.z]} rotation-y={slot.facing}>
            <mesh material={concrete} position={[0, height / 2, 0]}>
              <boxGeometry args={[1.3, height, 1.3]} />
            </mesh>
            {award && (
              <mesh position={[0, height - 0.16 - ENGRAVING.height / 2, 0.6505]} material={engravingMaterials[i]}>
                <planeGeometry args={[ENGRAVING.width, ENGRAVING.height]} />
              </mesh>
            )}
            {/* 받침대 앞면 윗단의 가는 호박빛 선 */}
            <mesh position={[0, height - 0.12, 0.655]}>
              <boxGeometry args={[1.0, 0.018, 0.01]} />
              <meshBasicMaterial color={lineColor} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {awards.map((award, i) => {
        const slot = slots[i];
        return (
          <group
            key={`${award.event}-${award.year}-${award.prize}`}
            ref={(el) => {
              medals.current[i] = el;
            }}
            position={[slot.x, plinthHeight[award.medal] + 1.15, slot.z]}
            rotation-y={slot.facing}
          >
            <mesh ref={registerTarget(i)} geometry={forms[i].body} material={materials[i].body} />
            <mesh ref={registerTarget(i)} geometry={forms[i].crystal} material={materials[i].crystal} />
          </group>
        );
      })}

      {/* 아직 비어 있는 자리. 앞으로 올 메달의 외곽이 희미한 선으로 떠 있다. */}
      {slots.slice(awards.length).map((slot, i) => (
        <group
          key={`waiting-${i}`}
          ref={(el) => {
            waiting.current[i] = el;
          }}
          position={[slot.x, plinthHeight.reserved + 1.15, slot.z]}
        >
          {waitingOutlines.map((geometry, k) => (
            <lineLoop key={k} geometry={geometry}>
              <lineBasicMaterial color={waitingColor} toneMapped={false} />
            </lineLoop>
          ))}
        </group>
      ))}

      <pointLight ref={light} color={DUST} intensity={0} distance={6} decay={1.5} />
    </group>
  );
}
