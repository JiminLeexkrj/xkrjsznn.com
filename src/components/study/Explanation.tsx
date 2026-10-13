"use client";

import "katex/dist/katex.min.css";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// 모델이 \( \)와 \[ \]로 수식을 쓰는 경우도 있어 $ 표기로 맞춘다
const normalizeMath = (text: string) =>
  text.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`).replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`);

const link = ({ href, children }: { href?: string; children?: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

/** 해설 한 편. 링크는 새 탭으로 연다. inline이면 문단 없이 글줄 안에 넣는다 (퀴즈의 문제와 보기). */
export function Explanation({ content, inline = false }: { content: string; inline?: boolean }) {
  const markdown = (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inline ? { a: link, p: ({ children }) => <>{children}</> } : { a: link }}
    >
      {normalizeMath(content)}
    </Markdown>
  );
  return inline ? <span className="font-ko">{markdown}</span> : <div className="study-prose font-ko">{markdown}</div>;
}
