// 공부 공간의 모양. 서버와 브라우저가 함께 쓴다.

/** PDF를 두는 Storage 버킷 */
export const STUDY_BUCKET = "study-pdfs";

/** 올릴 수 있는 PDF의 최대 크기. Supabase 무료 요금제의 파일 하나 한도와 같다. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

export const MAX_PROJECT_NAME = 80;
export const MAX_DOCUMENT_TITLE = 200;

export type StudyProject = {
  id: string;
  name: string;
  created_at: string;
  /** 프로젝트 안의 PDF 수 */
  documents: number;
};

export type StudyDocument = {
  id: string;
  project_id: string;
  title: string;
  storage_path: string;
  page_count: number;
  size_bytes: number;
  last_page: number;
  created_at: string;
  /** 해설이 붙은 페이지 수 */
  explained: number;
};

/** Storage 안의 경로. 첫 폴더가 user_id여야 Storage 정책을 통과한다. */
export const studyPdfPath = (userId: string, documentId: string) => `${userId}/${documentId}.pdf`;

/** 12.3 MB */
export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
