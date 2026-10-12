import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudyViewer } from "@/components/study/StudyViewer";
import { requireOwner } from "@/lib/auth";
import { getDocument, getProject, listExplanations, signedPdfUrl } from "@/lib/study";

export async function generateMetadata({ params }: PageProps<"/me/study/[projectId]/[documentId]">): Promise<Metadata> {
  const doc = await getDocument((await params).documentId);
  return { title: doc?.title ?? "공부" };
}

// 처음 열 페이지는 주소의 p, 없으면 마지막으로 보던 페이지
export default async function DocumentPage({ params, searchParams }: PageProps<"/me/study/[projectId]/[documentId]">) {
  await requireOwner();
  const { projectId, documentId } = await params;
  const [project, doc] = await Promise.all([getProject(projectId), getDocument(documentId)]);
  if (!project || !doc || doc.project_id !== projectId) notFound();

  const [pdfUrl, explanations, { p }] = await Promise.all([
    signedPdfUrl(doc.storage_path),
    listExplanations(documentId),
    searchParams,
  ]);
  const requested = Number(typeof p === "string" ? p : NaN);

  return (
    <main className="pt-2">
      <StudyViewer
        documentId={doc.id}
        projectId={projectId}
        projectName={project.name}
        title={doc.title}
        pageCount={doc.page_count}
        initialPage={Number.isInteger(requested) && requested >= 1 ? requested : doc.last_page}
        pdfUrl={pdfUrl}
        initialExplanations={explanations}
      />
    </main>
  );
}
