import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOwner } from "@/lib/auth";
import { makeQuiz, openaiReady } from "@/lib/openai";

// 자료 전체를 읽고 문제 20개를 쓰므로 해설 한 페이지보다 오래 걸린다
export const maxDuration = 300;

/** 모델에 보내는 자료 글자의 상한. 수백 쪽짜리도 앞에서부터 이만큼은 읽는다. */
const MAX_TEXT = 400_000;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * 자료 한 편의 핵심 정리 퀴즈를 만들어 저장한다. 이미 있으면 새로 만들어 덮어쓴다.
 * 페이지 글자는 PDF를 띄운 브라우저가 뽑아 보내고, 저장된 해설은 서버가 붙인다.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return fail("forbidden", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("bad-request", 415);

  const owner = await getOwner();
  if (!owner) return fail("login", 401);
  if (!openaiReady()) return fail("not-configured", 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("bad-request", 400);
  }
  const { documentId, pages } = body;
  if (typeof documentId !== "string" || !Array.isArray(pages)) return fail("bad-request", 400);

  const { supabase } = owner;
  const { data: doc } = await supabase
    .from("study_documents")
    .select("id, title, page_count, study_projects(name)")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return fail("not-found", 404);

  const { data: explanations } = await supabase
    .from("study_explanations")
    .select("page, content")
    .eq("document_id", documentId);
  const explained = new Map((explanations ?? []).map((e) => [e.page as number, e.content as string]));

  // 페이지 순서대로, 상한까지만
  const texts = new Map<number, string>();
  for (const p of pages) {
    const page = Number(p?.page);
    if (Number.isInteger(page) && page >= 1 && page <= doc.page_count && typeof p?.text === "string") {
      texts.set(page, p.text);
    }
  }
  let budget = MAX_TEXT;
  const input = [];
  for (let page = 1; page <= doc.page_count && budget > 0; page++) {
    const text = (texts.get(page) ?? "").slice(0, budget);
    budget -= text.length;
    const explanation = explained.get(page)?.slice(0, Math.max(0, budget));
    if (explanation) budget -= explanation.length;
    if (text.trim() || explanation) input.push({ page, text, explanation });
  }
  if (input.length === 0) return fail("empty", 422);

  const project = (doc.study_projects as unknown as { name: string } | null)?.name ?? "";
  let result;
  try {
    result = await makeQuiz({ project, document: doc.title, pageCount: doc.page_count, pages: input });
  } catch (err) {
    console.error("quiz", err);
    if (err instanceof OpenAI.APIError) {
      const code = err.status === 401 ? "openai-key" : err.status === 429 ? "openai-limit" : "openai";
      return fail(code, 502);
    }
    return fail("openai", 502);
  }

  const { data: saved, error } = await supabase
    .from("study_quizzes")
    .upsert({ document_id: documentId, questions: result.questions, answers: {}, model: result.model, created_at: new Date().toISOString() })
    .select("questions, answers, created_at")
    .single();
  if (error) return fail(`save: ${error.message}`, 500);

  revalidatePath("/me/study", "layout");
  return NextResponse.json(saved);
}
