import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudyQuiz } from "@/components/study/StudyQuiz";
import { requireOwner } from "@/lib/auth";
import { getDocument, getQuiz, signedPdfUrl } from "@/lib/study";

export async function generateMetadata({ params }: PageProps<"/me/study/[projectId]/[documentId]/quiz">): Promise<Metadata> {
  const doc = await getDocument((await params).documentId);
  return { title: doc ? `${doc.title} 퀴즈` : "퀴즈" };
}

export default async function QuizPage({ params }: PageProps<"/me/study/[projectId]/[documentId]/quiz">) {
  await requireOwner();
  const { projectId, documentId } = await params;
  const doc = await getDocument(documentId);
  if (!doc || doc.project_id !== projectId) notFound();
  // 퀴즈를 새로 만들 때 브라우저가 PDF 글자를 뽑아야 하므로 PDF 주소도 함께 넘긴다
  const [quiz, pdfUrl] = await Promise.all([getQuiz(documentId), signedPdfUrl(doc.storage_path)]);

  return (
    <StudyQuiz
      documentId={documentId}
      projectId={projectId}
      title={doc.title}
      pageCount={doc.page_count}
      pdfUrl={pdfUrl}
      initialQuiz={quiz}
    />
  );
}
