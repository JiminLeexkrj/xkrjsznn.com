"use client";

import "katex/dist/katex.min.css";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// 모델이 \( \)와 \[ \]로 수식을 쓰는 경우도 있어 $ 표기로 맞춘다
const normalizeMath = (text: string) =>
  text.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`).replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`);

/** 해설 한 편. 링크는 새 탭으로 연다. */
export function Explanation({ content }: { content: string }) {
  return (
    <div className="study-prose font-ko">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
      >
        {normalizeMath(content)}
      </Markdown>
    </div>
  );
}
