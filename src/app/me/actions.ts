"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { isISODate } from "@/lib/dates";
import { isCategory } from "@/lib/event-types";

export type SaveState = { error?: string; savedAt?: number };

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/** 일정을 새로 만들거나, id가 있으면 고친다 */
export async function saveEvent(_: SaveState, formData: FormData): Promise<SaveState> {
  const { supabase } = await requireOwner();

  const id = text(formData, "id");
  const title = text(formData, "title");
  const date = text(formData, "date");
  const endDate = text(formData, "end_date") || null;
  const allDay = formData.get("all_day") === "on";
  const startTime = allDay ? null : text(formData, "start_time") || null;
  const endTime = allDay ? null : text(formData, "end_time") || null;
  const category = text(formData, "category");
  const note = text(formData, "note") || null;

  if (!title) return { error: "제목을 적어 주세요." };
  if (title.length > 200) return { error: "제목은 200자까지 쓸 수 있습니다." };
  if (!isISODate(date)) return { error: "날짜를 골라 주세요." };
  if (endDate && (!isISODate(endDate) || endDate < date)) return { error: "끝나는 날은 시작하는 날 뒤여야 합니다." };
  if (startTime && !TIME.test(startTime)) return { error: "시작 시간을 다시 골라 주세요." };
  if (endTime && (!TIME.test(endTime) || !startTime)) return { error: "끝나는 시간은 시작 시간이 있어야 정할 수 있습니다." };
  if (startTime && endTime && !endDate && endTime < startTime) return { error: "끝나는 시간은 시작 시간 뒤여야 합니다." };
  if (!isCategory(category)) return { error: "종류를 골라 주세요." };
  if (note && note.length > 2000) return { error: "메모는 2000자까지 쓸 수 있습니다." };

  const row = {
    title,
    date,
    // 시작과 같은 날에 끝나면 하루짜리로 둔다
    end_date: endDate && endDate > date ? endDate : null,
    start_time: startTime,
    end_time: endTime,
    category,
    note,
  };

  const { error } = id
    ? await supabase.from("events").update(row).eq("id", id)
    : await supabase.from("events").insert(row);
  if (error) return { error: `저장하지 못했습니다: ${error.message}` };

  revalidatePath("/me", "layout");
  return { savedAt: Date.now() };
}

export async function setDone(id: string, done: boolean) {
  const { supabase } = await requireOwner();
  await supabase.from("events").update({ done }).eq("id", id);
  revalidatePath("/me", "layout");
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireOwner();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/me", "layout");
}
