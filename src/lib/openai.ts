import "server-only";

import OpenAI from "openai";

/** 기본 모델. 가장 싼 모델로 둔다. 해설이 아쉬우면 OPENAI_MODEL=gpt-6.1-sol 처럼 바꾼다. */
const DEFAULT_MODEL = "gpt-6-luna";

let client: OpenAI | null = null;

export function openaiReady() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export const explanationModel = () => process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

const INSTRUCTIONS = `너는 대학 강의 자료를 학생과 함께 한 장씩 읽어 나가는 튜터다.
학생이 지금 보고 있는 한 페이지를 한국어로 해설한다. 학생은 이 해설을 PDF 옆에 띄워 두고 읽는다.

- 첫 문단은 이 페이지가 말하려는 것을 한두 문장으로 요약한다. "이 페이지는 ~을 설명합니다" 같은 머리말 없이 바로 내용으로 시작한다.
- 그다음 핵심 개념을 왜 그런지까지 풀어 설명한다. 슬라이드의 문장을 그대로 옮겨 적지 않는다.
- 수식이 있으면 기호마다 뜻을 밝히고, 식이 무엇을 계산하는지 직관을 붙인다. 필요하면 작은 숫자 예시로 한 번 계산해 보인다.
- 코드가 있으면 무엇을 하는지 줄 단위로 짚는다.
- 전문 용어는 처음 나올 때 영어 원어를 괄호로 붙인다.
- 페이지에 없는 내용을 보충할 때는 그 문단을 "보충:"으로 시작한다. 확실하지 않은 내용은 지어내지 않는다.
- 표지, 목차, 빈 페이지처럼 내용이 거의 없으면 두세 문장으로 짧게 끝낸다.
- 앞뒤 페이지 텍스트는 흐름을 이해하는 데만 쓰고, 해설은 이 페이지에 집중한다.
- 코드를 작성하라는 식으로 요구되어 있고 정답 코드가 제시되어있지 않다면, 예시 코드를 작성하여 보여준다.

형식은 Markdown이다. 소제목은 ###부터 쓰고, 수식은 $...$와 $$...$$의 LaTeX로 쓴다.`;

export type PageInput = {
  project: string;
  document: string;
  page: number;
  pageCount: number;
  /** JPEG data URL */
  image: string;
  text: string;
  prevText: string;
  nextText: string;
};

const section = (title: string, body: string) => `[${title}]\n${body.trim() || "(글자 없음)"}`;

export async function explainPage(input: PageInput) {
  client ??= new OpenAI();
  const model = explanationModel();
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim();

  const response = await client.responses.create({
    model,
    instructions: INSTRUCTIONS,
    ...(effort ? { reasoning: { effort: effort as OpenAI.ReasoningEffort } } : {}),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `과목(프로젝트): ${input.project}`,
              `자료: ${input.document}`,
              `페이지: ${input.page} / ${input.pageCount}`,
              "",
              section("앞 페이지 텍스트", input.prevText),
              "",
              section("이 페이지 텍스트 (PDF에서 뽑은 것이라 순서가 어긋날 수 있다. 정확한 모양은 이미지를 본다)", input.text),
              "",
              section("다음 페이지 텍스트", input.nextText),
            ].join("\n"),
          },
          { type: "input_image", image_url: input.image, detail: "high" },
        ],
      },
    ],
  });

  const content = response.output_text.trim();
  if (!content) throw new Error("모델이 빈 해설을 돌려줬습니다.");
  return { content, model };
}
