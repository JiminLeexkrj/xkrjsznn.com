import { CanvasTexture, SRGBColorSpace } from "three";

/** 받침대 앞면에 새기는 글의 판 크기(m) */
export const ENGRAVING = { width: 1.12, height: 0.44 };

const W = 1024;
const H = Math.round((W * ENGRAVING.height) / ENGRAVING.width);

// 받침대 앞면에 대회 이름을 음각으로 새긴다. 투명한 판에 홈만 그려 콘크리트 위에 덧댄다.
// 위에서 빛이 떨어지므로 홈의 위쪽 안벽은 그늘지고, 아래쪽 턱은 빛을 받아 희미하게 밝다.
// 웹폰트가 늦게 도착하면 draw()를 다시 불러 다시 새긴다.
export function createPlinthEngraving(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  /** 판 너비에 맞춰 두 줄까지 나눈다. 단어 단위로 끊는다. */
  const wrap = (ctx: CanvasRenderingContext2D, maxWidth: number) => {
    const words = text.split(" ");
    if (ctx.measureText(text).width <= maxWidth || words.length === 1) return [text];
    let best = [text];
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const diff = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = [a, b];
      }
    }
    return best;
  };

  const draw = () => {
    const ctx = canvas.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const sans = css.getPropertyValue("--font-archivo").trim() || "sans-serif";
    const korean = css.getPropertyValue("--font-hahmlet").trim() || "serif";
    ctx.clearRect(0, 0, W, H);

    let size = Math.round(H * 0.3);
    const font = () => `700 ${size}px ${sans}, ${korean}`;
    ctx.font = font();
    let lines = wrap(ctx, W * 0.86);
    // 두 줄로도 넘치면 글자를 줄인다
    while (size > 18 && lines.some((l) => ctx.measureText(l.toUpperCase()).width > W * 0.86)) {
      size -= 2;
      ctx.font = font();
      lines = wrap(ctx, W * 0.86);
    }
    lines = lines.map((l) => l.toUpperCase());

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineHeight = size * 1.12;
    const top = H / 2 - ((lines.length - 1) * lineHeight) / 2;
    const depth = Math.max(1.5, size * 0.045);

    lines.forEach((line, i) => {
      const y = top + i * lineHeight;
      // 아래쪽 턱: 빛을 받는 가는 가장자리
      ctx.fillStyle = "rgba(235,228,214,0.14)";
      ctx.fillText(line, W / 2, y + depth);
      // 홈의 바닥: 깊고 어둡다
      ctx.fillStyle = "rgba(6,5,4,0.86)";
      ctx.fillText(line, W / 2, y);
    });
    // 홈의 위쪽 안벽: 그늘이 홈 안으로 조금 더 드리운다
    ctx.globalCompositeOperation = "source-atop";
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0.35)");
    shade.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    texture.needsUpdate = true;
  };

  draw();
  return { texture, draw };
}
