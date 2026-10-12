import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * 브라우저에서 PDF를 Storage에 바로 올릴 때만 쓴다. 로그인 정보 없이,
 * 서버가 내준 서명 업로드 표(token)로만 올라간다. 데이터를 읽고 쓰는 일은 모두 서버에서 한다.
 */
export function createUploadClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
