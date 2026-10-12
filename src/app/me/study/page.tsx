import type { Metadata } from "next";
import Link from "next/link";
import { ProjectNameForm } from "@/components/study/ProjectNameForm";
import { requireOwner } from "@/lib/auth";
import { listProjects } from "@/lib/study";
import { createProject } from "./actions";

export const metadata: Metadata = { title: "공부" };

export default async function StudyPage() {
  await requireOwner();
  const projects = await listProjects();

  return (
    <main className="pt-6">
      <h1 className="font-ko text-3xl font-semibold">공부</h1>
      <p className="mt-3 max-w-xl font-ko text-ash">
        과목마다 프로젝트를 만들고 강의 자료 PDF를 올리세요. 페이지마다 해설이 붙어, PDF 옆에 나란히 보입니다.
      </p>

      <section aria-labelledby="new-project" className="mt-12 max-w-xl">
        <h2 id="new-project" className="mb-2 font-ko text-sm text-ash">
          새 프로젝트
        </h2>
        <ProjectNameForm action={createProject} submitLabel="만들기" placeholder="예: 자료구조, 선형대수학" />
      </section>

      <section aria-labelledby="projects" className="mt-14">
        <h2 id="projects" className="font-ko text-sm text-ash">
          프로젝트 {projects.length > 0 && <span className="tabular-nums">{projects.length}</span>}
        </h2>
        {projects.length > 0 ? (
          <ul className="mt-4 grid gap-px border border-concrete bg-concrete sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id} className="bg-void">
                <Link
                  href={`/me/study/${p.id}`}
                  className="flex min-h-32 flex-col justify-between gap-6 p-5 transition-colors hover:bg-pit"
                >
                  <span className="font-ko text-xl leading-snug">{p.name}</span>
                  <span className="font-ko text-xs text-ash">
                    {p.documents > 0 ? `PDF ${p.documents}개` : "아직 PDF가 없습니다"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 font-ko text-ash">아직 프로젝트가 없습니다. 위에서 과목 이름으로 하나 만들어 보세요.</p>
        )}
      </section>
    </main>
  );
}
