import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 로그인이 관계된 경로에서만 돈다. 공개 페이지는 정적으로 남는다.
  matcher: ["/me/:path*", "/login", "/auth/:path*"],
};
