"use client";

import { world } from "@/lib/world-store";

type ProjectLinkProps = {
  index: number;
  href: string;
  className?: string;
  children: React.ReactNode;
};

// 마우스를 올리거나 키보드로 초점을 옮기면 3D 공간의 해당 석판이 돌아선다
export function ProjectLink({ index, href, className, children }: ProjectLinkProps) {
  const enter = () => {
    world.hoveredProject = index;
  };
  const leave = () => {
    if (world.hoveredProject === index) world.hoveredProject = null;
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      {children}
    </a>
  );
}
