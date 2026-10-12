"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // '오늘'(/me)은 그 주소에서만, 나머지는 그 아래 주소에서도 켠다
  const active = href === "/me" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`font-ko transition-colors ${active ? "text-bone" : "text-ash hover:text-bone"}`}
    >
      {children}
    </Link>
  );
}
