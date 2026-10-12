import Link from "next/link";
import { WEEKDAY_NAMES, dayLabel, monthGrid } from "@/lib/dates";
import { CATEGORIES, type CalendarEvent, occursOn } from "@/lib/event-types";

const SHOWN = 3;

type MonthGridProps = {
  month: string;
  selected: string;
  today: string;
  events: CalendarEvent[];
};

export function MonthGrid({ month, selected, today, events }: MonthGridProps) {
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
          const dayEvents = events.filter((e) => occursOn(e, day));
          const outside = !day.startsWith(month);
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <li key={day} className="border-r border-b border-concrete">
              <Link
                href={`/me/calendar?m=${month}&d=${day}`}
                scroll={false}
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${dayLabel(day)}, 일정 ${dayEvents.length}개`}
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
                  {dayEvents.slice(0, 4).map((e) => (
                    <span key={e.id} className="size-1.5 rounded-full" style={{ background: CATEGORIES[e.category].color }} />
                  ))}
                </span>
                <span className="hidden flex-col gap-0.5 sm:flex">
                  {dayEvents.slice(0, SHOWN).map((e) => (
                    <span
                      key={e.id}
                      className={`truncate border-l-2 pl-1.5 font-ko text-[11px] leading-4 ${
                        e.done ? "text-soot line-through" : outside ? "text-ash" : "text-bone"
                      }`}
                      style={{ borderColor: CATEGORIES[e.category].color }}
                    >
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > SHOWN && (
                    <span className="pl-2 text-[11px] text-ash">+{dayEvents.length - SHOWN}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
