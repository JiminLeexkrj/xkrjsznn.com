import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOwner } from "@/lib/auth";
import { explainPage, openaiReady } from "@/lib/openai";

// 한 페이지 해설에 모델이 수십 초를 쓸 수 있다
export const maxDuration = 120;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * 한 페이지의 해설을 만들어 저장하고 돌려준다. 이미 있으면 그대로 돌려주고, force면 새로 쓴다.
 * 페이지 이미지와 글자는 PDF를 띄운 브라우저가 뽑아 보낸다. 서버는 PDF를 다시 내려받지 않는다.
 */
export async function POST(request: NextRequest) {
  // 이 사이트의 화면에서 보낸 JSON만 받는다
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
  const { documentId, page, image, force } = body;
  if (typeof documentId !== "string" || !Number.isInteger(page) || typeof image !== "string") {
    return fail("bad-request", 400);
  }
  if (!image.startsWith("data:image/jpeg;base64,") && !image.startsWith("data:image/png;base64,")) {
    return fail("bad-request", 400);
  }

  const { supabase } = owner;
  const { data: doc } = await supabase
    .from("study_documents")
    .select("id, title, page_count, study_projects(name)")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return fail("not-found", 404);
  const pageNumber = page as number;
  if (pageNumber < 1 || pageNumber > doc.page_count) return fail("bad-request", 400);

  if (force !== true) {
    const { data: existing } = await supabase
      .from("study_explanations")
      .select("content")
      .eq("document_id", documentId)
      .eq("page", pageNumber)
      .maybeSingle();
    if (existing) return NextResponse.json({ content: existing.content });
  }

  const project = (doc.study_projects as unknown as { name: string } | null)?.name ?? "";
  let result;
  try {
    result = await explainPage({
      project,
      document: doc.title,
      page: pageNumber,
      pageCount: doc.page_count,
      image,
      text: clip(body.text, 8000),
      prevText: clip(body.prevText, 2000),
      nextText: clip(body.nextText, 2000),
    });
  } catch (err) {
    console.error("explain", err);
    if (err instanceof OpenAI.APIError) {
      // 키가 틀렸거나 잔액이 없거나 너무 자주 불렀을 때. 화면에서 이유를 보여 준다.
      const code = err.status === 401 ? "openai-key" : err.status === 429 ? "openai-limit" : "openai";
      return fail(code, 502);
    }
    return fail("openai", 502);
  }

  const { error } = await supabase
    .from("study_explanations")
    .upsert({ document_id: documentId, page: pageNumber, content: result.content, model: result.model });
  if (error) return fail(`save: ${error.message}`, 500);

  return NextResponse.json({ content: result.content });
}
