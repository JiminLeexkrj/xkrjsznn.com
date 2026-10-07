import config from "./fonts.json";

// 브라우저가 계산한 글꼴(가족, 굵기, 폭)에 가장 가까운 3D용 고정 폰트 파일을 고른다.
// 파일은 scripts/build-gl-fonts.mjs가 public/fonts/gl에 만든다.

const BASE = "/fonts/gl";
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const CJK = /[぀-ヿ一-鿿]/;

function nearest(instances: number[][], target: number[], scale: number[]) {
  let best = instances[0];
  let bestScore = Infinity;
  for (const instance of instances) {
    const score = instance.reduce((sum, v, i) => sum + Math.abs(v - target[i]) / scale[i], 0);
    if (score < bestScore) {
      bestScore = score;
      best = instance;
    }
  }
  return best;
}

export type FontChoice = {
  url: string;
  /** Archivo일 때만: 고른 굵기와 폭. 폭을 단계적으로 바꿀 때 쓴다. */
  archivo?: { weight: number; width: number };
};

export const archivoUrl = (weight: number, width: number) => `${BASE}/archivo-${weight}-${width}.woff`;

export function fontFor(style: CSSStyleDeclaration, text: string): FontChoice {
  const family = style.fontFamily.toLowerCase();
  const weight = parseInt(style.fontWeight, 10) || 400;
  const width = Number(/"wdth"\s+([\d.]+)/.exec(style.fontVariationSettings)?.[1] ?? 100);

  if (family.includes("unifraktur")) return { url: `${BASE}/unifraktur.woff` };
  if (family.includes("shippori") || (CJK.test(text) && !HANGUL.test(text))) return { url: `${BASE}/shippori.woff` };
  // 한글이 섞인 글은 브라우저도 Hahmlet으로 그린다
  if (family.includes("hahmlet") || HANGUL.test(text)) {
    const [w] = nearest(config.hahmlet.instances, [weight], [100]);
    return { url: `${BASE}/hahmlet-${w}.woff` };
  }
  const [w, wd] = nearest(config.archivo.instances, [weight, width], [100, 25]);
  return { url: archivoUrl(w, wd), archivo: { weight: w, width: wd } };
}

/**
 * 폭 사다리. from에서 to까지 거쳐 가는 폭들의 폰트 주소.
 * 그 굵기로 만들어 둔 폭만 쓴다. 매끈하게 늘어나는 대신 한 칸씩 "철컥" 넓어진다.
 */
export function widthLadder(weight: number, from: number, to: number) {
  const available = config.archivo.instances.filter(([w]) => w === weight).map(([, wd]) => wd);
  const steps = config.archivo.ladder.filter((wd) => available.includes(wd));
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const range = steps.filter((wd) => wd >= lo && wd <= hi);
  if (from > to) range.reverse();
  return range.map((wd) => archivoUrl(weight, wd));
}
