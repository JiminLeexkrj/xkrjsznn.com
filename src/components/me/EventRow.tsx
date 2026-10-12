import Link from "next/link";
import { deleteEvent, setDone } from "@/app/me/actions";
import { dayLabel, daysFrom, shortTime } from "@/lib/dates";
import { CATEGORIES, type CalendarEvent } from "@/lib/event-types";
import { DeleteButton } from "./DeleteButton";

/** 09:00–10:30, 09:00, 하루 종일. 여러 날이면 끝나는 날을 덧붙인다. */
function when(event: CalendarEvent) {
  const start = shortTime(event.start_time);
  const end = shortTime(event.end_time);
  const time = start ? (end ? `${start}–${end}` : start) : "하루 종일";
  return event.end_date ? `${time}, ${dayLabel(event.end_date)}까지` : time;
}

type EventRowProps = {
  event: CalendarEvent;
  editHref: string;
  /** 시험과 과제에 남은 날을 보여 줄 기준일 */
  countFrom?: string;
};

export function EventRow({ event, editHref, countFrom }: EventRowProps) {
  const category = CATEGORIES[event.category];
  const deadline = countFrom && (event.category === "exam" || event.category === "assignment") && !event.done;
  const left = deadline ? daysFrom(countFrom, event.end_date ?? event.date) : null;

  return (
    <li className="group flex items-start gap-3 py-3">
      <form action={setDone.bind(null, event.id, !event.done)} className="pt-0.5">
        <button
          type="submit"
          aria-label={event.done ? `${event.title} 완료 취소` : `${event.title} 완료`}
          aria-pressed={event.done}
          className="flex size-5 items-center justify-center border transition-colors hover:border-bone"
          style={{ borderColor: event.done ? category.color : undefined, background: event.done ? category.color : undefined }}
        >
          {event.done && (
            <svg viewBox="0 0 12 12" className="size-3 text-void" aria-hidden>
              <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={`font-ko leading-snug ${event.done ? "text-soot line-through" : ""}`}>{event.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 font-ko text-xs text-ash">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: category.color }} />
            {category.label}
          </span>
          <span className="tabular-nums">{when(event)}</span>
          {left !== null && left >= 0 && (
            <span className={left <= 3 ? "text-blood" : ""}>{left === 0 ? "오늘까지" : `D-${left}`}</span>
          )}
        </p>
        {event.note && <p className="mt-1.5 line-clamp-3 font-ko text-sm whitespace-pre-line text-ash">{event.note}</p>}
      </div>

      <div className="flex shrink-0 gap-3 font-ko text-xs text-ash opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <Link href={editHref} scroll={false} className="hover:text-bone">
          고치기
        </Link>
        <DeleteButton action={deleteEvent.bind(null, event.id)} title={event.title} />
      </div>
    </li>
  );
}
