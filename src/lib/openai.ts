import "server-only";

import OpenAI from "openai";
import { QUIZ_SIZE, type QuizQuestion } from "./study-types";

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

// ---------- 퀴즈 ----------

const QUIZ_INSTRUCTIONS = `너는 대학 강의 자료로 시험 대비 퀴즈를 만드는 조교다.
자료 한 편 전체를 읽고, 꼭 알아야 할 핵심 개념을 골라 문제 ${QUIZ_SIZE}개를 한국어로 만든다.

- 문제는 자료 앞부분부터 끝까지 고르게 나눠 낸다. 표지, 목차, 참고문헌에서는 내지 않는다.
- 한 문제는 한 개념을 확인한다. 같은 개념을 두 번 묻지 않는다. concept에는 그 개념을 짧은 명사구로 적는다.
- 단순히 문장을 외웠는지보다 이해했는지를 묻는다. 정의, 차이 비교, 이유, 적용, 간단한 계산이나 코드 결과 예측을 섞는다.
- 계산 문제는 자료에 나온 공식과 방법만으로 풀 수 있어야 한다.
- type은 choice(4지선다)를 대부분으로 하고, 참과 거짓이 분명한 내용은 ox로 4개 안팎 낸다.
  - choice는 options에 보기 4개를 넣는다. 오답은 그럴듯하되 분명히 틀려야 하고, 정답 위치는 문제마다 고르게 섞는다.
  - ox는 options를 ["O", "X"]로 두고, question은 참이나 거짓을 판단할 한 문장으로 쓴다.
- answer는 정답 보기의 번호다 (0부터).
- explanation에는 왜 정답인지와 헷갈리기 쉬운 오답이 왜 틀렸는지를 두세 문장으로 쓴다.
- pages에는 근거가 되는 페이지 번호를 적는다.
- 자료에 없는 내용으로 문제를 내지 않는다.
- 전문 용어는 처음 나올 때 영어 원어를 괄호로 붙이고, 수식은 $...$의 LaTeX로 쓴다.`;

const QUIZ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["concept", "type", "question", "options", "answer", "explanation", "pages"],
        properties: {
          concept: { type: "string" },
          type: { type: "string", enum: ["choice", "ox"] },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
          explanation: { type: "string" },
          pages: { type: "array", items: { type: "integer" } },
        },
      },
    },
  },
};

export type QuizInput = {
  project: string;
  document: string;
  pageCount: number;
  /** 페이지마다 PDF에서 뽑은 글자와, 있으면 저장된 해설 */
  pages: { page: number; text: string; explanation?: string }[];
};

/** 모델이 낸 문제 가운데 모양이 맞는 것만 남긴다 */
function cleanQuestion(raw: unknown, pageCount: number): QuizQuestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const q = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const type = q.type === "ox" ? "ox" : q.type === "choice" ? "choice" : null;
  const options = Array.isArray(q.options) ? q.options.map(str).filter(Boolean) : [];
  const answer = Number(q.answer);
  if (!type || !str(q.question) || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    return null;
  }
  const pages = Array.isArray(q.pages) ? q.pages.map(Number).filter((p) => Number.isInteger(p) && p >= 1 && p <= pageCount) : [];
  return {
    concept: str(q.concept),
    type,
    question: str(q.question),
    options: type === "ox" ? ["O", "X"] : options,
    answer: type === "ox" ? Math.min(answer, 1) : answer,
    explanation: str(q.explanation),
    pages: [...new Set(pages)].sort((a, b) => a - b),
  };
}

export async function makeQuiz(input: QuizInput) {
  client ??= new OpenAI();
  const model = explanationModel();
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim();

  const body = input.pages
    .map(({ page, text, explanation }) =>
      [`=== ${page}쪽 ===`, text.trim() || "(글자 없음)", explanation ? `[이 페이지의 해설]\n${explanation.trim()}` : ""]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  const response = await client.responses.create({
    model,
    instructions: QUIZ_INSTRUCTIONS,
    ...(effort ? { reasoning: { effort: effort as OpenAI.ReasoningEffort } } : {}),
    text: { format: { type: "json_schema", name: "quiz", schema: QUIZ_SCHEMA, strict: true } },
    input: [
      {
        role: "user",
        content: `과목(프로젝트): ${input.project}\n자료: ${input.document} (${input.pageCount}쪽)\n\n${body}`,
      },
    ],
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("모델이 퀴즈를 정해진 모양으로 돌려주지 않았습니다.");
  }
  const raw = (parsed as { questions?: unknown }).questions;
  const questions = (Array.isArray(raw) ? raw : [])
    .map((q) => cleanQuestion(q, input.pageCount))
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, QUIZ_SIZE);
  if (questions.length < QUIZ_SIZE / 2) throw new Error("퀴즈 문제가 너무 적게 만들어졌습니다.");
  return { questions, model };
}
