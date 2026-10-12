import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
import { signInWithGitHub } from "./actions";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  "not-owner": "이 공간은 사이트 주인만 쓸 수 있습니다. 둘러보려면 첫 화면으로 돌아가세요.",
  failed: "GitHub 로그인이 끝나지 않았습니다. 다시 시도하세요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getOwner()) redirect("/me");
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-gothic text-5xl leading-none text-blood" aria-label="첫 화면으로">
        x
      </Link>
      <h1 className="mt-10 font-ko text-2xl">주인의 방</h1>
      <p className="mt-3 font-ko text-ash">일정과 공부를 정리하는 곳입니다. 주인 계정으로만 열립니다.</p>

      {message && (
        <p role="alert" className="mt-8 border-l-2 border-blood pl-4 font-ko text-sm text-bone">
          {message}
        </p>
      )}

      <form action={signInWithGitHub} className="mt-10">
        <button
          type="submit"
          className="w-full bg-bone px-5 py-4 text-left font-medium text-void transition-colors hover:bg-violet"
        >
          GitHub로 로그인
        </button>
      </form>
    </main>
  );
}
