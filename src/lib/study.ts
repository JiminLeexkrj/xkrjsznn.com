import "server-only";

import { requireOwner } from "./auth";
import { STUDY_BUCKET, type StudyDocument, type StudyProject, type StudyQuiz } from "./study-types";

// 묶인 행의 수는 PostgREST가 [{ count }] 모양으로 돌려준다
const countOf = (rows: unknown) => (Array.isArray(rows) ? Number(rows[0]?.count ?? 0) : 0);

export async function listProjects(): Promise<StudyProject[]> {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase
    .from("study_projects")
    .select("id, name, created_at, study_documents(count)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`프로젝트를 불러오지 못했습니다: ${error.message}`);
  return data.map(({ study_documents, ...p }) => ({ ...p, documents: countOf(study_documents) }));
}

export async function getProject(id: string) {
  const { supabase } = await requireOwner();
  const { data } = await supabase.from("study_projects").select("id, name, created_at").eq("id", id).maybeSingle();
  return data as Omit<StudyProject, "documents"> | null;
}

const DOCUMENT_COLUMNS = "id, project_id, title, storage_path, page_count, size_bytes, last_page, created_at";

// 자료 이름의 숫자는 숫자로 비교한다. '2. 정렬'이 '10. 그래프'보다 앞에 온다. 데이터베이스의 정렬로는 반대가 된다.
const byTitle = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });

/** 프로젝트 안의 자료. 이름순, 이름이 같으면 먼저 올린 순. */
export async function listDocuments(projectId: string): Promise<StudyDocument[]> {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase
    .from("study_documents")
    .select(`${DOCUMENT_COLUMNS}, study_explanations(count)`)
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw new Error(`자료를 불러오지 못했습니다: ${error.message}`);
  return data
    .map(({ study_explanations, ...d }) => ({ ...d, explained: countOf(study_explanations) }))
    .sort((a, b) => byTitle.compare(a.title, b.title));
}

export async function getDocument(id: string) {
  const { supabase } = await requireOwner();
  const { data } = await supabase.from("study_documents").select(DOCUMENT_COLUMNS).eq("id", id).maybeSingle();
  return data as Omit<StudyDocument, "explained"> | null;
}

/** 페이지 번호를 키로 하는 해설 */
export async function listExplanations(documentId: string): Promise<Record<number, string>> {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase
    .from("study_explanations")
    .select("page, content")
    .eq("document_id", documentId);
  if (error) throw new Error(`해설을 불러오지 못했습니다: ${error.message}`);
  return Object.fromEntries(data.map((e) => [e.page, e.content]));
}

/** 자료의 퀴즈. 아직 만들지 않았으면 null. */
export async function getQuiz(documentId: string): Promise<StudyQuiz | null> {
  const { supabase } = await requireOwner();
  const { data } = await supabase
    .from("study_quizzes")
    .select("questions, answers, created_at")
    .eq("document_id", documentId)
    .maybeSingle();
  return data as StudyQuiz | null;
}

/** 브라우저가 PDF를 받아 갈 수 있는 임시 주소. 보는 동안 끊기지 않게 넉넉히 잡는다. */
export async function signedPdfUrl(path: string) {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.storage.from(STUDY_BUCKET).createSignedUrl(path, 60 * 60 * 6);
  if (error) throw new Error(`PDF를 열지 못했습니다: ${error.message}`);
  return data.signedUrl;
}
