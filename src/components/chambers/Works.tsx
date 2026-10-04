import { projects } from "@/content/projects";
import { Chamber } from "../Chamber";
import { ProjectLink } from "./ProjectLink";

function linkLabel(href: string) {
  const { hostname, pathname } = new URL(href);
  const site = hostname.includes("youtube") || hostname.includes("youtu.be") ? "YouTube" : "GitHub";
  return { site, path: pathname.replace(/^\/|\/$/g, "") };
}

export function Works() {
  return (
    <Chamber id="works" title="Works" mark="作品">
      <ul className="border-t border-concrete">
        {projects.map((project, index) => {
          const { site, path } = linkLabel(project.href);
          return (
            <li key={project.href} className="border-b border-concrete">
              <ProjectLink
                index={index}
                href={project.href}
                className="group flex flex-col gap-3 py-8 md:flex-row md:items-end md:justify-between md:gap-10 md:py-12"
              >
                <span className="wdth-62 text-[clamp(2.75rem,8vw,7.5rem)] leading-[0.85] font-black transition-[font-variation-settings,color] duration-500 ease-out group-hover:wdth-100 group-hover:text-blood group-focus-visible:wdth-100">
                  {project.title}
                </span>
                <span className="flex shrink-0 flex-col text-sm text-ash md:items-end md:text-base">
                  <span className="text-dust">{site}</span>
                  <span>{path}</span>
                </span>
              </ProjectLink>
              {project.summary && (
                <p className="max-w-2xl pb-8 font-ko text-ash">{project.summary}</p>
              )}
            </li>
          );
        })}
      </ul>
    </Chamber>
  );
}
