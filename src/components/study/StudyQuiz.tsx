"use client";

import Link from "next/link";
import { useState } from "react";
import { saveQuizAnswers } from "@/app/me/study/actions";
import { openPdf, pageText } from "@/lib/pdfjs";
import { QUIZ_SIZE, type QuizQuestion, type StudyQuiz as Quiz } from "@/lib/study-types";
import { errorText, postJson } from "./errors";
import { Explanation } from "./Explanation";

/** 브라우저가 서버로 보내는 자료 글자의 상한. 서버도 같은 값으로 자른다. */
const MAX_TEXT = 400_000;

type Status = { kind: "idle" } | { kind: "reading"; done: number } | { kind: "writing" } | { kind: "error"; code: string };

type StudyQuizProps = {
  documentId: string;
  projectId: string;
  title: string;
  pageCount: number;
  pdfUrl: string;
  initialQuiz: Quiz | null;
};

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤", "⑥"];

export function StudyQuiz({ documentId, projectId, title, pageCount, pdfUrl, initialQuiz }: StudyQuizProps) {
  const [quiz, setQuiz] = useState(initialQuiz);
  const [answers, setAnswers] = useState<Record<string, number>>(initialQuiz?.answers ?? {});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [wrongOnly, setWrongOnly] = useState(false);

  const viewerHref = (page?: number) => `/me/study/${projectId}/${documentId}${page ? `?p=${page}` : ""}`;

  // ---------- 만들기 ----------

  async function generate() {
    if (quiz && !confirm("새 퀴즈를 만들면 지금 퀴즈와 푼 기록이 사라집니다. 만들까요?")) return;
    setStatus({ kind: "reading", done: 0 });
    try {
      const pages: { page: number; text: string }[] = [];
      const task = await openPdf(pdfUrl);
      try {
        const pdf = await task.promise;
        let total = 0;
        for (let n = 1; n <= pdf.numPages && total < MAX_TEXT; n++) {
          const text = await pageText(await pdf.getPage(n));
          pages.push({ page: n, text });
          total += text.length;
          setStatus({ kind: "reading", done: n });
        }
      } finally {
        task.destroy();
      }

      setStatus({ kind: "writing" });
      const saved = await postJson<Quiz>("/api/study/quiz", { documentId, pages });
      setQuiz(saved);
      setAnswers({});
      setWrongOnly(false);
      setStatus({ kind: "idle" });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setStatus({ kind: "error", code: err instanceof Error ? err.message : "openai" });
    }
  }

  // ---------- 풀기 ----------

  function pick(index: number, option: number) {
    if (String(index) in answers) return;
    const next = { ...answers, [index]: option };
    setAnswers(next);
    saveQuizAnswers(documentId, next);
  }

  function restart() {
    setAnswers({});
    setWrongOnly(false);
    saveQuizAnswers(documentId, {});
    window.scrollTo({ top: 0 });
  }

  const busy = status.kind === "reading" || status.kind === "writing";
  const questions = quiz?.questions ?? [];
  const answered = questions.filter((_, i) => String(i) in answers).length;
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  const finished = questions.length > 0 && answered === questions.length;

  const progress =
    status.kind === "reading"
      ? `PDF 글자를 읽는 중 (${status.done}/${pageCount}쪽)`
      : status.kind === "writing"
        ? "문제를 만드는 중입니다. 1분쯤 걸릴 수 있습니다."
        : null;

  return (
    <main className="mx-auto max-w-3xl pt-6">
      <Link href={viewerHref()} className="font-ko text-sm text-ash hover:text-bone">
        ← {title}
      </Link>
      <h1 className="mt-3 font-ko text-3xl font-semibold">핵심 정리 퀴즈</h1>

      {!quiz ? (
        <section className="mt-10 border border-concrete p-6 sm:p-8">
          <p className="font-ko leading-relaxed text-ash">
            이 자료 전체에서 꼭 알아야 할 개념 {QUIZ_SIZE}개를 골라 문제를 만듭니다. 4지선다와 O/X가 섞여 나오고, 문제마다
            정답 해설과 근거 페이지가 붙습니다. 해설을 만들어 둔 페이지는 그 해설까지 참고합니다.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="mt-6 bg-bone px-5 py-3 font-ko font-medium text-void transition-colors hover:bg-violet disabled:opacity-50"
          >
            {busy ? "만드는 중" : "퀴즈 만들기"}
          </button>
          {progress && (
            <p className="mt-4 font-ko text-sm text-violet" aria-live="polite">
              {progress}
            </p>
          )}
          {status.kind === "error" && (
            <p role="alert" className="mt-4 font-ko text-sm text-blood">
              {errorText(status.code)}
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-concrete bg-void/95 px-4 py-3 font-ko text-sm backdrop-blur sm:mx-0 sm:px-0">
            <span className="tabular-nums">
              {finished ? (
                <>
                  결과 <strong className="text-lg">{correct}</strong>
                  <span className="text-ash"> / {questions.length}</span>
                </>
              ) : (
                <>
                  <span className="text-ash">푼 문제</span> {answered}/{questions.length}
                  <span className="ml-3 text-ash">맞힘</span> {correct}
                </>
              )}
            </span>
            <span className="ml-auto flex flex-wrap gap-4 text-xs text-ash">
              {answered > correct && (
                <button type="button" onClick={() => setWrongOnly((w) => !w)} className="hover:text-bone">
                  {wrongOnly ? "모든 문제 보기" : "틀린 문제만 보기"}
                </button>
              )}
              {answered > 0 && (
                <button type="button" onClick={restart} className="hover:text-bone">
                  처음부터 다시 풀기
                </button>
              )}
              <button type="button" onClick={generate} disabled={busy} className="hover:text-bone disabled:opacity-50">
                새 퀴즈 만들기
              </button>
            </span>
          </div>
          {(progress || status.kind === "error") && (
            <p
              role={status.kind === "error" ? "alert" : undefined}
              aria-live="polite"
              className={`mt-4 font-ko text-sm ${status.kind === "error" ? "text-blood" : "text-violet"}`}
            >
              {status.kind === "error" ? errorText(status.code) : progress}
            </p>
          )}

          <ol className="mt-6 flex flex-col">
            {questions.map((q, i) =>
              wrongOnly && !(String(i) in answers && answers[i] !== q.answer) ? null : (
                <QuestionCard
                  key={`${quiz.created_at}-${i}`}
                  index={i}
                  question={q}
                  picked={answers[i]}
                  onPick={(option) => pick(i, option)}
                  pageHref={viewerHref}
                />
              ),
            )}
          </ol>

          <details className="mt-10 border-t border-concrete pt-6 font-ko">
            <summary className="cursor-pointer text-sm text-ash hover:text-bone">핵심 개념 {questions.length}개 한눈에 보기</summary>
            <ol className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {questions.map((q, i) => {
                const mark = !(String(i) in answers) ? "·" : answers[i] === q.answer ? "○" : "×";
                return (
                  <li key={i} className="flex gap-3">
                    <span className={`w-4 shrink-0 text-center ${mark === "×" ? "text-blood" : mark === "○" ? "text-frost" : "text-soot"}`}>
                      {mark}
                    </span>
                    <span className="text-ash tabular-nums">{i + 1}.</span>
                    <span>{q.concept || "(개념 없음)"}</span>
                  </li>
                );
              })}
            </ol>
          </details>
        </>
      )}
    </main>
  );
}

type QuestionCardProps = {
  index: number;
  question: QuizQuestion;
  picked: number | undefined;
  onPick: (option: number) => void;
  pageHref: (page: number) => string;
};

function QuestionCard({ index, question: q, picked, onPick, pageHref }: QuestionCardProps) {
  const done = picked !== undefined;
  const right = picked === q.answer;

  return (
    <li className="border-b border-concrete py-8">
      <p className="flex items-baseline gap-3 font-ko text-xs text-ash">
        <span className="tabular-nums">{index + 1}</span>
        {q.concept && <span>{q.concept}</span>}
        {done && <span className={right ? "text-frost" : "text-blood"}>{right ? "정답" : "오답"}</span>}
      </p>
      {/* 코드 블록이 들어올 수 있어 p가 아닌 div로 감싼다 */}
      <div className="mt-2 font-ko text-lg leading-relaxed [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:bg-pit [&_pre]:p-3 [&_pre]:text-sm">
        <Explanation content={q.question} inline />
      </div>

      <div className={`mt-5 ${q.type === "ox" ? "flex gap-3" : "flex flex-col gap-2"}`}>
        {q.options.map((option, o) => {
          const isAnswer = o === q.answer;
          const isPicked = o === picked;
          const tone = !done
            ? "border-concrete hover:border-violet"
            : isAnswer
              ? "border-frost bg-frost/10"
              : isPicked
                ? "border-blood bg-blood/10"
                : "border-concrete opacity-50";
          return (
            <button
              key={o}
              type="button"
              disabled={done}
              onClick={() => onPick(o)}
              aria-pressed={isPicked}
              className={`flex items-baseline gap-3 border px-4 py-3 text-left font-ko transition-colors disabled:cursor-default ${tone} ${
                q.type === "ox" ? "min-w-24 justify-center text-xl" : ""
              }`}
            >
              {q.type === "choice" && <span className="shrink-0 text-ash">{CHOICE_MARKS[o] ?? `${o + 1}.`}</span>}
              <Explanation content={option} inline />
            </button>
          );
        })}
      </div>

      {done && (
        <div className="mt-5 border-l-2 border-soot pl-4">
          {q.explanation && <Explanation content={q.explanation} />}
          {q.pages.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-x-3 font-ko text-xs text-ash">
              근거
              {q.pages.map((p) => (
                <Link key={p} href={pageHref(p)} className="text-violet hover:text-bone">
                  {p}쪽
                </Link>
              ))}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
