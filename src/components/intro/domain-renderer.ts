// 진입 화면의 "영역 전개" 셰이더. 첫 화면이 빨리 떠야 하므로 three.js 없이 WebGL2로만 그린다.

const VERTEX = /* glsl */ `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uTime;
uniform float uHold;
uniform float uExpand;
uniform float uMaxRadius;

out vec4 outColor;

const vec3 RED = vec3(0.757, 0.071, 0.122);
const vec3 VIOLET = vec3(0.478, 0.173, 0.941);
const vec3 DUST = vec3(0.851, 0.827, 0.780);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  float unit = min(uResolution.x, uResolution.y);
  vec2 uv = (gl_FragCoord.xy - uCenter * uResolution) / unit;
  float r = length(uv);
  // 각도를 원 위의 좌표로 샘플링해 이음매 없이 방사형 무늬를 만든다
  vec2 dir = uv / max(r, 1e-4);
  float logR = log(r + 0.02);
  float h = uHold;
  float hh = h * h;

  // 누르는 동안 붉은 에너지가 고리 쪽으로 빨려 들어간다
  float speed = 0.35 + hh * 3.5;
  float streaks = fbm(dir * 9.0 + vec2(logR * 2.5 + uTime * speed, logR * 1.3 - uTime * speed * 0.5));
  streaks = smoothstep(0.5, 0.9, streaks);

  float ringRadius = mix(0.85, 0.16, smoothstep(0.0, 1.0, h));
  ringRadius += (fbm(dir * 4.0 + uTime * 0.8) - 0.5) * 0.04 * h;
  float ringWidth = mix(0.025, 0.006, h);
  float ring = exp(-pow((r - ringRadius) / ringWidth, 2.0));
  float gather = smoothstep(ringRadius * 3.2, ringRadius * 0.9, r);

  vec3 col = vec3(0.0);
  col += RED * streaks * gather * (0.12 + hh * 1.1);
  col += RED * ring * (0.25 + h * 1.6);
  col += VIOLET * exp(-r / mix(0.02, 0.09, hh)) * smoothstep(0.55, 1.0, h) * 0.9;
  col += DUST * 0.03 * fbm(uv * 3.0 + uTime * 0.05);
  col *= 1.0 - smoothstep(0.4, 1.4, r) * 0.6 * h;

  float alpha = 1.0;

  if (uExpand > 0.0) {
    float e = uExpand;
    // 한 번 안으로 수축했다가, 폭발하듯 바깥으로 펼쳐진다
    float contract = 0.13;
    float radius;
    if (e < contract) {
      radius = mix(0.16, 0.02, smoothstep(0.0, contract, e));
    } else {
      float x = (e - contract) / (1.0 - contract);
      radius = 0.02 + (1.0 - pow(2.0, -9.0 * x)) * (uMaxRadius + 0.3);
    }
    float opened = step(contract, e);
    float jagged = radius + (fbm(dir * 6.0 + e * 3.0) - 0.5) * 0.14 * smoothstep(contract, 0.5, e);
    float inside = smoothstep(jagged + 0.012, jagged - 0.012, r) * opened;
    float band = exp(-pow((r - jagged) / 0.035, 2.0)) * opened;
    float flash = smoothstep(0.0, contract, e) * (1.0 - smoothstep(contract, contract + 0.18, e));
    float bandFade = 1.0 - smoothstep(0.75, 1.0, e);
    vec3 edge = mix(VIOLET, RED, smoothstep(contract, 0.6, e));

    col += VIOLET * flash * (exp(-r * 4.0) * 1.5 + 0.15);
    col *= 1.0 - inside;
    col += edge * band * 1.4 * bandFade;
    alpha = max(1.0 - inside, band * 0.8 * bandFade);

    float endFade = 1.0 - smoothstep(0.85, 1.0, e);
    alpha *= endFade;
    col *= endFade;
  }

  // 캔버스는 premultiplied alpha. 색이 alpha보다 크면 아래 사이트 위에 빛이 더해진다.
  outColor = vec4(col, alpha);
}`;

export type DomainFrame = {
  time: number;
  hold: number;
  expand: number;
  /** 0–1, 왼쪽 아래가 원점 */
  center: [number, number];
};

export type DomainRenderer = {
  render: (frame: DomainFrame) => void;
  destroy: () => void;
};

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** WebGL2를 쓸 수 없으면 null을 돌려준다. 호출하는 쪽은 단순 페이드로 대체한다. */
export function createDomainRenderer(canvas: HTMLCanvasElement): DomainRenderer | null {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  // 화면 전체를 덮는 삼각형 하나
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    center: gl.getUniformLocation(program, "uCenter"),
    time: gl.getUniformLocation(program, "uTime"),
    hold: gl.getUniformLocation(program, "uHold"),
    expand: gl.getUniformLocation(program, "uExpand"),
    maxRadius: gl.getUniformLocation(program, "uMaxRadius"),
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl!.viewport(0, 0, width, height);
  }

  return {
    render({ time, hold, expand, center }) {
      resize();
      const { width, height } = canvas;
      const unit = Math.min(width, height);
      const [cx, cy] = [center[0] * width, center[1] * height];
      const maxRadius =
        Math.max(Math.hypot(cx, cy), Math.hypot(width - cx, cy), Math.hypot(cx, height - cy), Math.hypot(width - cx, height - cy)) /
        unit;

      gl.uniform2f(u.resolution, width, height);
      gl.uniform2f(u.center, center[0], center[1]);
      gl.uniform1f(u.time, time);
      gl.uniform1f(u.hold, hold);
      gl.uniform1f(u.expand, expand);
      gl.uniform1f(u.maxRadius, maxRadius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
