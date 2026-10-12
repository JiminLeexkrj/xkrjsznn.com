import Link from "next/link";
import { WEEKDAY_NAMES, dayLabel, monthGrid } from "@/lib/dates";
import { type DayItem, dayItemKey, dayItems } from "@/lib/day-items";
import { CATEGORIES, type CalendarEvent, occursOn } from "@/lib/event-types";
import { LMS_COLORS, type LmsMark } from "@/lib/lms-types";

const SHOWN = 3;

const color = (item: DayItem) => (item.type === "event" ? CATEGORIES[item.event.category].color : LMS_COLORS[item.mark.kind]);
const title = (item: DayItem) => (item.type === "event" ? item.event.title : item.mark.title);
const isDone = (item: DayItem) => (item.type === "event" ? item.event.done : item.mark.done);

type MonthGridProps = {
  month: string;
  selected: string;
  today: string;
  events: CalendarEvent[];
  marks: LmsMark[];
};

export function MonthGrid({ month, selected, today, events, marks }: MonthGridProps) {
  const days = monthGrid(month);

  return (
    <div>
      <div aria-hidden className="grid grid-cols-7 pb-2 font-ko text-xs text-ash">
        {WEEKDAY_NAMES.map((name, i) => (
          <span key={name} className={`px-2 ${i === 0 ? "text-blood/80" : ""}`}>
            {name}
          </span>
        ))}
      </div>

      <ol className="grid grid-cols-7 border-t border-l border-concrete">
        {days.map((day) => {
          const items = dayItems(
            events.filter((e) => occursOn(e, day)),
            marks.filter((m) => m.date === day),
          );
          const outside = !day.startsWith(month);
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <li key={day} className="border-r border-b border-concrete">
              <Link
                href={`/me/calendar?m=${month}&d=${day}`}
                scroll={false}
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${dayLabel(day)}, 일정 ${items.length}개`}
                className={`flex h-full min-h-16 flex-col gap-1 p-1.5 transition-colors hover:bg-pit sm:min-h-24 sm:p-2 ${
                  isSelected ? "bg-pit outline-1 -outline-offset-1 outline-violet" : ""
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center text-xs tabular-nums ${
                    isToday ? "bg-blood font-semibold text-void" : outside ? "text-soot" : "text-bone"
                  }`}
                >
                  {Number(day.slice(8))}
                </span>

                {/* 좁은 화면에서는 점으로, 넓은 화면에서는 제목 띠로 */}
                <span className="flex flex-wrap gap-1 sm:hidden">
                  {items.slice(0, 4).map((item) => (
                    <span key={dayItemKey(item)} className="size-1.5 rounded-full" style={{ background: color(item) }} />
                  ))}
                </span>
                <span className="hidden flex-col gap-0.5 sm:flex">
                  {/* LMS 항목은 점선 띠로 구분한다 */}
                  {items.slice(0, SHOWN).map((item) => (
                    <span
                      key={dayItemKey(item)}
                      className={`truncate border-l-2 pl-1.5 font-ko text-[11px] leading-4 ${
                        isDone(item) ? "text-soot line-through" : outside ? "text-ash" : "text-bone"
                      } ${item.type === "lms" ? "border-dashed" : ""}`}
                      style={{ borderColor: color(item) }}
                    >
                      {title(item)}
                    </span>
                  ))}
                  {items.length > SHOWN && <span className="pl-2 text-[11px] text-ash">+{items.length - SHOWN}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
