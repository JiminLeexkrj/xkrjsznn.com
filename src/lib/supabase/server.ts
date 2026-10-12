import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/**
 * 서버 컴포넌트, 서버 액션, 라우트 핸들러에서 쓰는 클라이언트. 요청마다 새로 만든다.
 * 서버 컴포넌트에서는 쿠키를 쓸 수 없지만, 세션 갱신은 proxy가 맡으므로 무시해도 된다.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // 서버 컴포넌트에서 호출되면 여기로 온다
        }
      },
    },
  });
}
