import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";

/** 사이트 주인의 이메일. GitHub 계정의 기본 이메일과 같아야 한다. */
export function ownerEmail() {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() || null;
}

export function isOwnerEmail(email: unknown) {
  const owner = ownerEmail();
  return Boolean(owner && typeof email === "string" && email.toLowerCase() === owner);
}

/** 지금 로그인한 사람이 주인이면 그 정보를, 아니면 null을 돌려준다 */
export const getOwner = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || !isOwnerEmail(claims.email)) return null;
  return { supabase, userId: claims.sub, email: claims.email as string };
});

/**
 * 주인만 쓰는 페이지와 액션의 입구. 주인이 아니면 로그인 화면으로 보낸다.
 * 페이지마다, 액션마다 데이터를 다루기 전에 반드시 부른다.
 */
export async function requireOwner() {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  return owner;
}
