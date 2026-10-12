import { type NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// GitHub에서 돌아온 코드를 세션으로 바꾼다. 주인이 아니면 바로 로그아웃시킨다.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const back = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));
  if (!code) return back("/login?error=failed");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back("/login?error=failed");

  if (!isOwnerEmail(data.user.email)) {
    await supabase.auth.signOut();
    return back("/login?error=not-owner");
  }
  return back("/me");
}
