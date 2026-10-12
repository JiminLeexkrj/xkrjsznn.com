import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/me/DeleteButton";
import { ProjectNameForm } from "@/components/study/ProjectNameForm";
import { UploadPdf } from "@/components/study/UploadPdf";
import { requireOwner } from "@/lib/auth";
import { getProject, listDocuments } from "@/lib/study";
import { formatBytes } from "@/lib/study-types";
import { deleteDocument, deleteProject, renameProject } from "../actions";

export async function generateMetadata({ params }: PageProps<"/me/study/[projectId]">): Promise<Metadata> {
  const project = await getProject((await params).projectId);
  return { title: project?.name ?? "공부" };
}

export default async function ProjectPage({ params }: PageProps<"/me/study/[projectId]">) {
  await requireOwner();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();
  const documents = await listDocuments(projectId);

  return (
    <main className="grid gap-14 pt-6 lg:grid-cols-[1fr_22rem] lg:gap-20">
      <div>
        <Link href="/me/study" className="font-ko text-sm text-ash hover:text-bone">
          ← 프로젝트
        </Link>
        <h1 className="mt-3 font-ko text-3xl font-semibold">{project.name}</h1>

        <section aria-labelledby="docs" className="mt-12">
          <h2 id="docs" className="font-ko text-sm text-ash">
            자료 {documents.length > 0 && <span className="tabular-nums">{documents.length}</span>}
          </h2>
          {documents.length > 0 ? (
            <ul className="mt-2 divide-y divide-concrete">
              {documents.map((d) => (
                <li key={d.id} className="group flex items-start gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/me/study/${projectId}/${d.id}`} className="font-ko text-lg leading-snug hover:text-violet">
                      {d.title}
                    </Link>
                    <p className="mt-1 flex flex-wrap gap-x-3 font-ko text-xs text-ash tabular-nums">
                      <span>{d.page_count}쪽</span>
                      <span className={d.explained === d.page_count ? "text-frost" : ""}>
                        해설 {d.explained}/{d.page_count}
                      </span>
                      {d.last_page > 1 && <span>{d.last_page}쪽까지 봄</span>}
                      <span>{formatBytes(d.size_bytes)}</span>
                    </p>
                  </div>
                  <div className="shrink-0 pt-1 font-ko text-xs text-ash opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                    <DeleteButton
                      action={deleteDocument.bind(null, d.id)}
                      title={d.title}
                      message={`'${d.title}'와 그 해설을 모두 지울까요? 되돌릴 수 없습니다.`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 font-ko text-ash">아직 자료가 없습니다. 오른쪽에서 PDF를 올리세요.</p>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-12 lg:sticky lg:top-8 lg:self-start">
        <section aria-labelledby="upload">
          <h2 id="upload" className="mb-4 font-ko text-sm text-ash">
            PDF 올리기
          </h2>
          <UploadPdf projectId={projectId} />
        </section>

        <section aria-labelledby="settings" className="border-t border-concrete pt-6">
          <h2 id="settings" className="mb-2 font-ko text-sm text-ash">
            프로젝트 이름
          </h2>
          <ProjectNameForm action={renameProject.bind(null, projectId)} defaultName={project.name} submitLabel="바꾸기" />
          <div className="mt-8 font-ko text-xs text-ash">
            <DeleteButton
              action={deleteProject.bind(null, projectId)}
              title={project.name}
              label="프로젝트 지우기"
              message={`'${project.name}' 프로젝트와 그 안의 PDF, 해설을 모두 지울까요? 되돌릴 수 없습니다.`}
            />
          </div>
        </section>
      </aside>
    </main>
  );
}
