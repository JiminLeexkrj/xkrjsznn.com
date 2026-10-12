import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/auth";
import { LMS_BASE, LMS_KINDS, LMS_STAGES, type LmsKind, type LmsStage } from "@/lib/lms-types";

/** 한 번에 받는 항목 수의 상한. 한 학기 과목 전부를 넉넉히 덮는다. */
const MAX_MARKS = 5000;

type Row = {
  user_id: string;
  key: string;
  course_name: string | null;
  kind: LmsKind;
  stage: LmsStage;
  label: string;
  title: string;
  at: string;
  url: string | null;
  done: boolean;
  synced_at: string;
};

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

const isString = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

/** 확장이 보낸 항목 하나를 행으로. 모양이 다르면 null. */
function toRow(raw: unknown, courses: Map<number, string>, userId: string, syncedAt: string): Row | null {
  if (typeof raw !== "object" || raw === null) return null;
  const m = raw as Record<string, unknown>;
  if (!isString(m.key, 200) || !isString(m.label, 40) || typeof m.at !== "string") return null;
  if (!LMS_KINDS.includes(m.kind as LmsKind) || !LMS_STAGES.includes(m.stage as LmsStage)) return null;
  const at = new Date(m.at);
  if (Number.isNaN(at.getTime())) return null;
  const title = typeof m.title === "string" && m.title.trim() ? m.title.trim().slice(0, 300) : "(제목 없음)";
  // 링크는 LMS 주소만 받는다. 다른 주소는 화면에 그대로 링크로 나가므로 버린다.
  const url = typeof m.url === "string" && m.url.startsWith(`${LMS_BASE}/`) ? m.url : null;
  return {
    user_id: userId,
    key: m.key,
    course_name: (typeof m.courseId === "number" && courses.get(m.courseId)) || null,
    kind: m.kind as LmsKind,
    stage: m.stage as LmsStage,
    label: m.label,
    title,
    at: at.toISOString(),
    url,
    done: m.done === true,
    synced_at: syncedAt,
  };
}

/**
 * KU LMS+ 확장이 LMS에서 불러온 목록을 받아 lms_marks를 통째로 맞춘다.
 * 확장은 같은 Chrome에 있는 이 사이트의 로그인 쿠키로 부르므로, 주인 확인과 RLS는 다른 페이지와 같다.
 * 확장 ID가 맞는 요청만 받는다. 다른 사이트는 JSON POST에 쿠키를 실을 수 없고, 다른 확장은 여기서 막힌다.
 */
export async function POST(request: NextRequest) {
  const extensionId = process.env.LMS_EXTENSION_ID?.trim();
  if (!extensionId) return fail("not-configured", 503);
  if (request.headers.get("origin") !== `chrome-extension://${extensionId}`) return fail("forbidden", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("bad-request", 415);

  const owner = await getOwner();
  if (!owner) return fail("login", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("bad-request", 400);
  }
  const { marks, courses, warnings } = (body ?? {}) as Record<string, unknown>;
  if (!Array.isArray(marks) || marks.length > MAX_MARKS) return fail("bad-request", 400);

  const courseNames = new Map<number, string>();
  if (Array.isArray(courses)) {
    for (const c of courses) {
      if (typeof c?.id === "number" && isString(c?.name, 200)) courseNames.set(c.id, c.name);
    }
  }

  const syncedAt = new Date().toISOString();
  const rows = new Map<string, Row>();
  for (const raw of marks) {
    const row = toRow(raw, courseNames, owner.userId, syncedAt);
    if (row) rows.set(row.key, row);
  }

  const { supabase } = owner;
  if (rows.size > 0) {
    const { error } = await supabase.from("lms_marks").upsert([...rows.values()], { onConflict: "user_id,key" });
    if (error) return fail(`save: ${error.message}`, 500);
  }

  // 이번에 오지 않은 항목은 LMS에서 사라진 것이니 지운다.
  // 다만 온라인 강의를 못 불러온 경고가 있으면 영상 항목은 남겨 둔다. 비어 온 것이지 사라진 게 아니다.
  const videosMissing = Array.isArray(warnings) && warnings.length > 0;
  let stale = supabase.from("lms_marks").delete().lt("synced_at", syncedAt);
  if (videosMissing) stale = stale.neq("kind", "video");
  const { error: deleteError } = await stale;
  if (deleteError) return fail(`cleanup: ${deleteError.message}`, 500);

  revalidatePath("/me", "layout");
  return NextResponse.json({ saved: rows.size, skipped: marks.length - rows.size, syncedAt });
}
