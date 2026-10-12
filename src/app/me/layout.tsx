import type { Metadata } from "next";
import Link from "next/link";
import { NavLink } from "@/components/me/NavLink";
import { signOut } from "../login/actions";

export const metadata: Metadata = {
  title: "내 공간",
  robots: { index: false },
};

// 권한 확인은 여기서 하지 않는다. 레이아웃은 이동할 때 다시 그려지지 않으므로, 각 페이지와 액션이 requireOwner로 확인한다.
export default function MeLayout({ children }: LayoutProps<"/me">) {
  return (
    <div className="mx-auto min-h-svh max-w-6xl px-4 pb-24 sm:px-8">
      <header className="flex items-center gap-8 py-6">
        <Link href="/" aria-label="공개 페이지로" className="font-gothic text-3xl leading-none text-blood">
          x
        </Link>
        <nav aria-label="내 공간" className="flex gap-6 text-sm">
          <NavLink href="/me">오늘</NavLink>
          <NavLink href="/me/calendar">달력</NavLink>
          <NavLink href="/me/study">공부</NavLink>
        </nav>
        <form action={signOut} className="ml-auto">
          <button type="submit" className="font-ko text-sm text-ash hover:text-bone">
            로그아웃
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
