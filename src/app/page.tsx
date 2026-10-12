import Link from "next/link";
import { type Medal, awardsByYear } from "@/content/awards";
import { email, links } from "@/content/links";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";

const MEDAL_COLORS: Record<Medal, string> = {
  gold: "#c9a227",
  silver: "#a8a9ad",
  bronze: "#a0673c",
};

function linkLabel(href: string) {
  const { hostname, pathname } = new URL(href);
  const site = hostname.includes("youtube") || hostname.includes("youtu.be") ? "YouTube" : "GitHub";
  return { site, path: pathname.replace(/^\/|\/$/g, "") };
}

/** 왼쪽에 이름표, 오른쪽에 내용. 좁은 화면에서는 위아래로 쌓인다. */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="grid gap-6 border-t border-concrete py-14 md:grid-cols-[11rem_1fr] md:gap-10 md:py-20"
    >
      <h2 id={`${id}-heading`} className="wdth-75 text-sm font-medium text-ash">
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <header className="flex min-h-[88svh] flex-col justify-end pb-14 md:pb-20">
        <h1 aria-label={profile.code} className="font-gothic text-[clamp(4.5rem,21vw,15.5rem)] leading-[0.82] text-bone">
          {profile.code.split("").map((char, i) => (
            <span key={i} aria-hidden className="xk-rise inline-block" style={{ animationDelay: `${120 + i * 70}ms` }}>
              {char}
            </span>
          ))}
        </h1>
        <div className="mt-10 grid gap-6 md:grid-cols-[11rem_1fr] md:gap-10">
          <p className="font-ko text-sm text-blood">{profile.status}</p>
          <div>
            <p className="text-2xl md:text-3xl">
              <span lang="ko" className="font-ko">
                {profile.name.ko}
              </span>
              <span className="ml-3 wdth-75 text-ash">{profile.name.en}</span>
            </p>
            <p className="mt-2 wdth-112 text-ash">{profile.role}</p>
          </div>
        </div>
      </header>

      <main>
        <Section id="dossier" title="Dossier">
          <dl className="divide-y divide-concrete">
            {profile.dossier.map((entry) => (
              <div
                key={entry.label}
                className={`grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-1 py-3 sm:grid-cols-[8rem_1fr_auto] ${entry.past ? "text-soot" : ""}`}
              >
                <dt className={entry.past ? "" : "text-ash"}>{entry.label}</dt>
                <dd>{entry.value}</dd>
                {entry.period && <dd className="col-start-2 tabular-nums sm:col-start-3">{entry.period}</dd>}
              </div>
            ))}
          </dl>
        </Section>

        <Section id="works" title="Works">
          <ul>
            {projects.map((project) => {
              const { site, path } = linkLabel(project.href);
              return (
                <li key={project.href} className="border-b border-concrete first:-mt-4">
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ "--project": project.color } as React.CSSProperties}
                    className="group flex flex-col gap-2 py-5 md:flex-row md:items-end md:justify-between md:gap-10"
                  >
                    <span className="wdth-62 text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.88] font-black transition-colors duration-300 group-hover:text-(--project) group-focus-visible:text-(--project)">
                      {project.title}
                    </span>
                    <span className="flex shrink-0 gap-3 text-sm text-ash md:flex-col md:items-end md:gap-0">
                      <span className="text-bone">{site}</span>
                      <span>{path}</span>
                    </span>
                  </a>
                  {project.summary && <p className="max-w-2xl pb-6 font-ko text-ash">{project.summary}</p>}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section id="awards" title="Awards">
          <ol className="divide-y divide-concrete">
            {awardsByYear().map((award, i) => (
              <li key={i} className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-4 py-3">
                <span className="text-ash tabular-nums">{award.year}</span>
                <span className="font-ko">{award.event}</span>
                <span className="flex items-center gap-2 font-ko text-sm">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: MEDAL_COLORS[award.medal] }} />
                  {award.prize}
                </span>
                {award.detail && <p className="col-start-2 col-end-4 font-ko text-sm text-ash">{award.detail}</p>}
              </li>
            ))}
          </ol>
        </Section>

        <Section id="contact" title="Contact">
          <a
            href={`mailto:${email}`}
            className="wdth-75 text-[clamp(1.75rem,5vw,3.5rem)] leading-none font-semibold break-all transition-colors hover:text-violet"
          >
            {email}
          </a>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer" className="group">
                  <span className="text-ash transition-colors group-hover:text-bone">{link.label}</span>
                  <span className="ml-2 transition-colors group-hover:text-violet">{link.handle}</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </main>

      <footer className="flex items-center justify-between border-t border-concrete py-8 text-sm text-soot">
        <span className="font-gothic text-lg text-ash">{profile.code}</span>
        {/* 주인만 쓰는 공간의 입구. 방문자에게는 눈에 띄지 않게 둔다. */}
        <Link href="/me" className="font-ko transition-colors hover:text-bone">
          주인 로그인
        </Link>
      </footer>
    </div>
  );
}
