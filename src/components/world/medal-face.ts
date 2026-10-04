import { CanvasTexture, SRGBColorSpace } from "three";
import type { Award } from "@/content/awards";

const SIZE = 512;

// 메달 앞면에 새기는 그림. 밝은 바탕은 솟은 면, 어두운 선은 파인 홈이 된다.
// 웹폰트가 늦게 도착하면 draw()를 다시 불러 다시 새긴다.
export function createMedalFace(award: Award) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  // 원기둥 뚜껑의 UV는 옆으로 누워 있으므로 그림을 세운다. 앞면과 뒷면 모두 바르게 읽힌다.
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI / 2;

  const draw = () => {
    const ctx = canvas.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const gothic = css.getPropertyValue("--font-unifraktur").trim() || "serif";
    const sans = css.getPropertyValue("--font-archivo").trim() || "sans-serif";
    const korean = css.getPropertyValue("--font-hahmlet").trim() || "serif";
    const c = SIZE / 2;
    const groove = "#2e2e2e";

    ctx.fillStyle = "#cfcfcf";
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.strokeStyle = groove;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(c, c, 236, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, 168, 0, Math.PI * 2);
    ctx.stroke();

    // 대회 이름을 테두리를 따라 위쪽 호에 새긴다
    ctx.fillStyle = groove;
    ctx.font = `600 30px ${sans}, ${korean}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = award.event.toUpperCase();
    const radius = 202;
    const widths = [...label].map((ch) => ctx.measureText(ch).width + 2);
    const arc = widths.reduce((sum, w) => sum + w, 0) / radius;
    let angle = -Math.PI / 2 - arc / 2;
    [...label].forEach((ch, i) => {
      const half = widths[i] / 2 / radius;
      angle += half;
      ctx.save();
      ctx.translate(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      angle += half;
    });

    ctx.font = `700 150px ${gothic}`;
    ctx.fillText(String(award.year), c, c - 8);
    ctx.font = `700 46px ${korean}`;
    ctx.fillText(award.prize, c, c + 110);

    texture.needsUpdate = true;
  };

  draw();
  return { texture, draw };
}
