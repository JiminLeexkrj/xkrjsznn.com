import { type DayItem, dayItemKey } from "@/lib/day-items";
import type { CalendarEvent } from "@/lib/event-types";
import { EventRow } from "./EventRow";
import { LmsRow } from "./LmsRow";

type DayListProps = {
  items: DayItem[];
  editHref: (event: CalendarEvent) => string;
  countFrom?: string;
};

/** 하루의 일정과 LMS 항목을 시각 순으로 */
export function DayList({ items, editHref, countFrom }: DayListProps) {
  return (
    <ul className="divide-y divide-concrete">
      {items.map((item) =>
        item.type === "event" ? (
          <EventRow key={dayItemKey(item)} event={item.event} editHref={editHref(item.event)} countFrom={countFrom} />
        ) : (
          <LmsRow key={dayItemKey(item)} mark={item.mark} countFrom={countFrom} />
        ),
      )}
    </ul>
  );
}
