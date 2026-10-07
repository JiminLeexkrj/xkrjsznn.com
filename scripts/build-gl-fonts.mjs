// 3D 공간의 글자(troika)가 쓸 폰트를 만든다.
// troika는 가변 폰트의 축을 쓰지 못하므로, 필요한 굵기와 폭마다 고정 폰트를 뽑는다.
// 소스 코드에 실제로 쓰인 글자만 남겨 작게 만든다. dev와 build 전에 자동으로 돈다.
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import subsetFont from "subset-font";

const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, "src/components/world/gl-text/fonts.json"), "utf8"));
const sourceDir = join(root, "assets/fonts");
const outDir = join(root, "public/fonts/gl");

function collectText(dir) {
  let text = "";
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) text += collectText(path);
    else if ([".ts", ".tsx", ".json"].includes(extname(name))) text += readFileSync(path, "utf8");
  }
  return text;
}

// 쓰인 글자 + 영문 전체(대문자 변환 대비) + 자주 쓰는 문장부호
let ascii = "";
for (let c = 0x20; c < 0x7f; c++) ascii += String.fromCharCode(c);
const chars = [...new Set(collectText(join(root, "src")) + ascii + "–—©·’‘“”…→")]
  .filter((c) => c.codePointAt(0) >= 0x20)
  .join("");

mkdirSync(outDir, { recursive: true });

const fileName = (family, instance) => (instance ? `${family}-${instance.join("-")}.woff` : `${family}.woff`);
let total = 0;

for (const [family, spec] of Object.entries(config)) {
  const sourcePath = join(sourceDir, spec.source);
  if (!existsSync(sourcePath)) {
    console.warn(`[gl-fonts] missing source ${spec.source}, skipping ${family}`);
    continue;
  }
  const source = readFileSync(sourcePath);
  for (const instance of spec.instances ?? [null]) {
    const options = { targetFormat: "woff" };
    if (instance) options.variationAxes = Object.fromEntries(spec.axes.map((axis, i) => [axis, instance[i]]));
    const out = await subsetFont(source, chars, options);
    writeFileSync(join(outDir, fileName(family, instance)), out);
    total += out.length;
  }
}

console.log(`[gl-fonts] ${chars.length} glyphs, ${(total / 1024).toFixed(0)} KB -> public/fonts/gl`);
