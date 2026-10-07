import { CanvasTexture, SRGBColorSpace, Vector2 } from "three";
import type { Award } from "@/content/awards";
import { FACE_EXTENT, MEDAL, type MedalForm } from "./medal-geometry";

const SIZE = 1024;
const GROOVE = "#232323";

// 메달 앞면의 그림. 색과 요철 지도로 함께 쓴다. 밝은 바탕은 솟은 면, 어두운 선은 파인 홈이 된다.
// 바탕에는 선반으로 깎은 듯한 아주 옅은 동심원 결이 깔린다.
// 테두리 링을 따라 대회명(위)과 상·연도(아래)가 돌고, 창 위쪽 금속면에는 연도가 블랙레터로 크게 새겨진다.
// 웹폰트가 늦게 도착하면 draw()를 다시 불러 다시 새긴다.
export function createMedalFace(award: Award, form: MedalForm) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  const c = SIZE / 2;
  const scale = c / FACE_EXTENT;
  const R = MEDAL.radius * scale;
  const px = (p: Vector2) => [c + p.x * scale, c - p.y * scale] as const;

  /** 호를 따라 글자를 놓는다. top이면 위쪽 호를 시계 방향으로, 아니면 아래쪽 호를 바로 선 채로. */
  const arcText = (ctx: CanvasRenderingContext2D, runs: { text: string; font: string }[], radius: number, top: boolean) => {
    const glyphs = runs.flatMap((run) => [...run.text].map((ch) => ({ ch, font: run.font })));
    const widths = glyphs.map((g) => {
      ctx.font = g.font;
      return ctx.measureText(g.ch).width + 4;
    });
    const arc = widths.reduce((s, w) => s + w, 0) / radius;
    let angle = top ? -Math.PI / 2 - arc / 2 : Math.PI / 2 + arc / 2;
    glyphs.forEach((g, i) => {
      const step = widths[i] / radius;
      angle += top ? step / 2 : -step / 2;
      ctx.save();
      ctx.font = g.font;
      ctx.translate(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
      ctx.rotate(top ? angle + Math.PI / 2 : angle - Math.PI / 2);
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
      angle += top ? step / 2 : -step / 2;
    });
  };

  const draw = () => {
    const ctx = canvas.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const gothic = css.getPropertyValue("--font-unifraktur").trim() || "serif";
    const sans = css.getPropertyValue("--font-archivo").trim() || "sans-serif";
    const korean = css.getPropertyValue("--font-hahmlet").trim() || "serif";

    ctx.fillStyle = "#c4c4c4";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // 선반 결: 아주 옅은 동심원
    ctx.lineWidth = 1;
    for (let r = 4; r < R; r += 3) {
      ctx.strokeStyle = r % 9 < 3 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)";
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = GROOVE;
    // 테두리 링의 안쪽 경계와 바깥 가장자리 가까이에 가는 홈
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c, c, R * (MEDAL.rim - 0.025), 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, R * 0.975, 0, Math.PI * 2);
    ctx.stroke();

    // 창 둘레를 한 번 더 따라가는 홈. 결정이 금속에 물린 듯 보인다.
    const center = form.window.reduce((s, p) => s.add(p), new Vector2()).divideScalar(form.window.length);
    ctx.lineWidth = 3;
    ctx.save();
    // 홈이 테두리 링을 넘어가지 않게 안쪽 원으로 자른다
    ctx.beginPath();
    ctx.arc(c, c, R * (MEDAL.rim - 0.03), 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    form.window.forEach((p, i) => {
      const [x, y] = px(center.clone().add(p.clone().sub(center).multiplyScalar(1.07)));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = GROOVE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const band = R * (1 + MEDAL.rim) * 0.5;
    arcText(ctx, [{ text: award.event.toUpperCase(), font: `600 ${Math.round(R * 0.062)}px ${sans}, ${korean}` }], band, true);
    arcText(
      ctx,
      [
        { text: award.prize, font: `700 ${Math.round(R * 0.064)}px ${korean}` },
        { text: "   ", font: `400 ${Math.round(R * 0.06)}px ${sans}` },
        { text: String(award.year), font: `600 ${Math.round(R * 0.062)}px ${sans}` },
      ],
      band,
      false,
    );

    // 창 위쪽(왼쪽 위) 금속면 한가운데에 블랙레터 연도
    const across = new Vector2(-Math.sin(MEDAL.angle), Math.cos(MEDAL.angle));
    const [yx, yy] = px(across.clone().multiplyScalar(MEDAL.radius * 0.55));
    ctx.save();
    ctx.translate(yx, yy);
    ctx.rotate(-MEDAL.angle);
    ctx.font = `700 ${Math.round(R * 0.25)}px ${gothic}`;
    ctx.fillText(String(award.year), 0, 0);
    ctx.restore();

    texture.needsUpdate = true;
  };

  draw();
  return { texture, draw };
}
