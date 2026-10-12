// 하루에 보여 줄 것들. 직접 만든 일정과 LMS 항목을 한 줄로 세운다.

import type { CalendarEvent } from "./event-types";
import type { LmsMark } from "./lms-types";

export type DayItem = { type: "event"; event: CalendarEvent } | { type: "lms"; mark: LmsMark };

/** 하루 종일인 일정이 먼저, 나머지는 시각 순. 시각이 같으면 직접 만든 일정이 먼저. */
export function dayItems(events: CalendarEvent[], marks: LmsMark[]): DayItem[] {
  const items: [string, DayItem][] = [
    ...events.map((event): [string, DayItem] => [event.start_time?.slice(0, 5) ?? "", { type: "event", event }]),
    ...marks.map((mark): [string, DayItem] => [mark.time, { type: "lms", mark }]),
  ];
  return items.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, item]) => item);
}

export const dayItemKey = (item: DayItem) => (item.type === "event" ? item.event.id : `lms:${item.mark.key}`);
