import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readSupabaseEnv } from "./env";

/**
 * 요청마다 세션을 확인하고, 만료가 가까우면 갱신한 쿠키를 응답에 실어 보낸다.
 * 여기서의 확인은 빠른 길 안내일 뿐이다. 데이터 접근 권한은 lib/auth.ts와 데이터베이스 RLS가 지킨다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = readSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // 갱신된 세션이 담긴 응답이 캐시되지 않게 한다
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });

  // createServerClient와 getClaims 사이에 다른 코드를 넣지 않는다. 세션이 엉뚱하게 끊길 수 있다.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && request.nextUrl.pathname.startsWith("/me")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    const redirect = NextResponse.redirect(login);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
