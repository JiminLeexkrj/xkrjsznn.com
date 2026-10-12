import "server-only";

import { requireOwner } from "./auth";
import { addDays, seoulDateTime, seoulMidnight } from "./dates";
import { type LmsMark, SHOWN_STAGES } from "./lms-types";

const COLUMNS = "key, course_name, kind, stage, label, title, at, url, done";

/** from부터 to까지(양 끝 포함, 서울 기준) 사이트에 보여 줄 LMS 항목. 시각 순. */
export async function listLmsMarks(from: string, to: string): Promise<LmsMark[]> {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase
    .from("lms_marks")
    .select(COLUMNS)
    .in("stage", SHOWN_STAGES)
    .gte("at", seoulMidnight(from))
    .lt("at", seoulMidnight(addDays(to, 1)))
    .order("at")
    .order("title");
  // 테이블을 아직 만들지 않았어도 내 일정은 보이게, LMS 항목만 비운다
  if (error) {
    console.error("LMS 항목을 불러오지 못했습니다", error.message);
    return [];
  }
  return (data as Omit<LmsMark, "date" | "time">[]).map((m) => ({ ...m, ...seoulDateTime(m.at) }));
}

/** 마지막으로 동기화한 시각. 한 번도 안 했으면 null. */
export async function lastLmsSync(): Promise<string | null> {
  const { supabase } = await requireOwner();
  const { data } = await supabase
    .from("lms_marks")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.synced_at ?? null;
}
