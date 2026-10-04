import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

// 이미지 파일 없이 캔버스로 거친 콘크리트 표면을 만든다.
// 낮은 해상도의 무작위 점을 확대해 겹치면 부드러운 얼룩이 되고, 세로 줄은 빗물 자국이 된다.
export function createConcreteTexture(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  const layer = (cells: number, alpha: number) => {
    const small = document.createElement("canvas");
    small.width = small.height = cells;
    const sctx = small.getContext("2d")!;
    const image = sctx.createImageData(cells, cells);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.random() * 255;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    sctx.putImageData(image, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, size, size);
  };
  layer(6, 0.5);
  layer(24, 0.3);
  layer(96, 0.2);
  layer(size, 0.12);

  ctx.globalAlpha = 1;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * size;
    const w = 1 + Math.random() * 6;
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    const dark = `rgba(20,20,20,${0.15 + Math.random() * 0.3})`;
    gradient.addColorStop(0, dark);
    gradient.addColorStop(Math.random(), "rgba(20,20,20,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, w, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
