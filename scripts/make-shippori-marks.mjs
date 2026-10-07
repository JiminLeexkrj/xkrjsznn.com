// 한 번만 돌리는 도구. 8MB가 넘는 Shippori Mincho 원본에서 사이트가 쓰는 한자와 가나만 남긴 축소본을 만든다.
// 세로 장식 글자를 바꿀 때 원본을 다시 받아(google/fonts, ofl/shipporimincho) 이 스크립트를 돌리면 된다.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import subsetFont from "subset-font";

const root = process.cwd();
const collect = (dir) =>
  readdirSync(dir)
    .map((name) => join(dir, name))
    .map((p) => (statSync(p).isDirectory() ? collect(p) : [".ts", ".tsx"].includes(extname(p)) ? readFileSync(p, "utf8") : ""))
    .join("");

// 쓰인 한자 + 히라가나·가타카나 전체
const used = [...new Set(collect(join(root, "src")))].filter((c) => /[一-鿿]/.test(c)).join("");
let kana = "";
for (let c = 0x3040; c <= 0x30ff; c++) kana += String.fromCharCode(c);

const source = readFileSync(join(root, "assets/fonts/ShipporiMincho-Medium.ttf"));
const out = await subsetFont(source, used + kana, { targetFormat: "sfnt" });
writeFileSync(join(root, "assets/fonts/ShipporiMincho-Medium.marks.ttf"), out);
console.log(`kanji: ${used}  -> ${(out.length / 1024).toFixed(0)} KB`);
