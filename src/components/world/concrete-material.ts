import { MeshStandardMaterial } from "three";
import { createConcreteTexture } from "./concrete-texture";

// 판마다 크기가 제각각이라 UV를 쓰면 질감이 늘어난다.
// 월드 좌표로 세 방향에서 투영해 어느 면이든 같은 밀도의 콘크리트가 되게 한다.
export function createConcreteMaterial(color = "#77716a") {
  const texture = createConcreteTexture();
  const material = new MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.04 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uConcrete = { value: texture };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;")
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        #ifdef USE_INSTANCING
          mat4 surfaceWorld = modelMatrix * instanceMatrix;
        #else
          mat4 surfaceWorld = modelMatrix;
        #endif
        vWorldPos = (surfaceWorld * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize(mat3(surfaceWorld) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uConcrete;\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;",
      )
      .replace(
        "#include <map_fragment>",
        `vec3 blend = abs(normalize(vWorldNormal));
        blend /= blend.x + blend.y + blend.z;
        vec3 p = vWorldPos * 0.18;
        float concrete = texture2D(uConcrete, p.zy).r * blend.x
          + texture2D(uConcrete, p.xz).r * blend.y
          + texture2D(uConcrete, p.xy).r * blend.z;
        diffuseColor.rgb *= 0.45 + concrete * 1.1;`,
      )
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = roughness * (0.8 + concrete * 0.3);");
  };
  return material;
}
