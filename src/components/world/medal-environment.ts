import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  TorusGeometry,
  type WebGLRenderer,
} from "three";
import { RED } from "./colors";

// 크롬은 주변이 비쳐야 크롬처럼 보인다. 씬 전체에 환경맵을 걸면 콘크리트까지 밝아지므로,
// 메달에만 쓸 작은 스튜디오를 따로 만들어 굽는다. 위에는 흰 조명판, 뒤에는 영역의 붉은 고리.
export function createMedalEnvironment(gl: WebGLRenderer) {
  const scene = new Scene();
  scene.background = new Color("#050404");
  const plane = new PlaneGeometry(1, 1);

  const panel = (color: Color, position: [number, number, number], scale: [number, number]) => {
    const mesh = new Mesh(plane, new MeshBasicMaterial({ color, side: DoubleSide }));
    mesh.position.set(...position);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  const white = new Color("#f4efe6").multiplyScalar(3);
  panel(white, [0, 7, 1], [10, 4]);
  panel(white.clone().multiplyScalar(0.5), [-7, 1, 3], [1.2, 7]);
  panel(white.clone().multiplyScalar(0.5), [7, 1, 3], [1.2, 7]);
  panel(new Color("#1a1512"), [0, -6, 0], [20, 20]);

  const ring = new Mesh(
    new TorusGeometry(3.2, 0.12, 12, 96),
    new MeshBasicMaterial({ color: RED.clone().multiplyScalar(5) }),
  );
  ring.position.set(0, 0.5, -7);
  scene.add(ring);

  const pmrem = new PMREMGenerator(gl);
  const target = pmrem.fromScene(scene, 0.03);
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) (o.material as MeshBasicMaterial).dispose();
  });
  plane.dispose();
  ring.geometry.dispose();
  return target.texture;
}
