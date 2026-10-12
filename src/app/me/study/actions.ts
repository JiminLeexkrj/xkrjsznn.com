"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { MAX_DOCUMENT_TITLE, MAX_PDF_BYTES, MAX_PROJECT_NAME, STUDY_BUCKET, studyPdfPath } from "@/lib/study-types";

export type FormState = { error?: string; savedAt?: number };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

function checkName(name: string) {
  if (!name) return "이름을 적어 주세요.";
  if (name.length > MAX_PROJECT_NAME) return `이름은 ${MAX_PROJECT_NAME}자까지 쓸 수 있습니다.`;
  return null;
}

// ---------- 프로젝트 ----------

export async function createProject(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireOwner();
  const name = text(formData, "name");
  const invalid = checkName(name);
  if (invalid) return { error: invalid };

  const { data, error } = await supabase.from("study_projects").insert({ name }).select("id").single();
  if (error) return { error: `만들지 못했습니다: ${error.message}` };
  revalidatePath("/me/study");
  redirect(`/me/study/${data.id}`);
}

export async function renameProject(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireOwner();
  const name = text(formData, "name");
  const invalid = checkName(name);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("study_projects").update({ name }).eq("id", id);
  if (error) return { error: `저장하지 못했습니다: ${error.message}` };
  revalidatePath("/me/study", "layout");
  return { savedAt: Date.now() };
}

/** 프로젝트와 그 안의 PDF, 해설을 모두 지운다 */
export async function deleteProject(id: string) {
  const { supabase } = await requireOwner();
  const { data: docs } = await supabase.from("study_documents").select("storage_path").eq("project_id", id);
  if (docs?.length) await supabase.storage.from(STUDY_BUCKET).remove(docs.map((d) => d.storage_path));
  await supabase.from("study_projects").delete().eq("id", id);
  revalidatePath("/me/study");
  redirect("/me/study");
}

// ---------- PDF ----------

export type UploadTicket = { error: string } | { documentId: string; path: string; token: string };

/**
 * PDF를 올릴 자리를 잡는다. Vercel 함수는 큰 요청 본문을 받지 못하므로,
 * 파일은 브라우저가 이 표로 Supabase Storage에 바로 올린다.
 */
export async function prepareUpload(projectId: string, size: number): Promise<UploadTicket> {
  const { supabase, userId } = await requireOwner();
  if (!(size > 0 && size <= MAX_PDF_BYTES)) return { error: "PDF는 50MB까지 올릴 수 있습니다." };

  const { data: project } = await supabase.from("study_projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "프로젝트를 찾지 못했습니다." };

  const documentId = crypto.randomUUID();
  const path = studyPdfPath(userId, documentId);
  const { data, error } = await supabase.storage.from(STUDY_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: `올릴 준비를 하지 못했습니다: ${error.message}` };
  return { documentId, path, token: data.token };
}

/** 파일이 Storage에 올라간 뒤 자료로 등록한다 */
export async function finishUpload(
  projectId: string,
  documentId: string,
  info: { title: string; pageCount: number; size: number },
): Promise<{ error?: string }> {
  const { supabase, userId } = await requireOwner();
  const path = studyPdfPath(userId, documentId);
  const { data: uploaded } = await supabase.storage.from(STUDY_BUCKET).exists(path);
  if (!uploaded) return { error: "올라간 파일을 찾지 못했습니다. 다시 올려 주세요." };

  const title = info.title.trim().slice(0, MAX_DOCUMENT_TITLE) || "제목 없는 PDF";
  const pageCount = Math.trunc(info.pageCount);
  if (!(pageCount >= 1 && pageCount <= 2000)) return { error: "페이지 수를 읽지 못했습니다." };

  const { error } = await supabase.from("study_documents").insert({
    id: documentId,
    project_id: projectId,
    title,
    storage_path: path,
    page_count: pageCount,
    size_bytes: Math.trunc(info.size),
  });
  if (error) {
    await supabase.storage.from(STUDY_BUCKET).remove([path]);
    return { error: `등록하지 못했습니다: ${error.message}` };
  }
  revalidatePath("/me/study", "layout");
  return {};
}

export async function deleteDocument(id: string) {
  const { supabase } = await requireOwner();
  const { data: doc } = await supabase.from("study_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) return;
  await supabase.storage.from(STUDY_BUCKET).remove([doc.storage_path]);
  await supabase.from("study_documents").delete().eq("id", id);
  revalidatePath("/me/study", "layout");
}

/** 보던 페이지를 기억한다. 다시 열면 여기서 시작한다. */
export async function saveLastPage(id: string, page: number) {
  const { supabase } = await requireOwner();
  if (!(Number.isInteger(page) && page >= 1)) return;
  await supabase.from("study_documents").update({ last_page: page }).eq("id", id);
}
