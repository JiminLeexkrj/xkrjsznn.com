import "server-only";

import { requireOwner } from "./auth";
import type { CalendarEvent } from "./event-types";

const COLUMNS = "id, title, date, end_date, start_time, end_time, category, note, done";

/** from부터 to까지(양 끝 포함) 하루라도 걸치는 일정. 날짜, 시작 시간 순. */
export async function listEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase
    .from("events")
    .select(COLUMNS)
    .lte("date", to)
    .or(`end_date.gte.${from},and(end_date.is.null,date.gte.${from})`)
    .order("date")
    .order("start_time", { nullsFirst: true })
    .order("created_at");
  if (error) throw new Error(`일정을 불러오지 못했습니다: ${error.message}`);
  return data as CalendarEvent[];
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.from("events").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) return null;
  return data as CalendarEvent | null;
}
