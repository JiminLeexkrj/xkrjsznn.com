import { daysFrom } from "@/lib/dates";
import { LMS_COLORS, type LmsMark, isDeadline } from "@/lib/lms-types";

type LmsRowProps = {
  mark: LmsMark;
  /** 마감에 남은 날을 보여 줄 기준일 */
  countFrom?: string;
};

/** LMS에서 온 항목 한 줄. 사이트에서는 고칠 수 없고, 누르면 LMS로 간다. */
export function LmsRow({ mark, countFrom }: LmsRowProps) {
  const color = LMS_COLORS[mark.kind];
  const left = countFrom && isDeadline(mark.stage) && !mark.done ? daysFrom(countFrom, mark.date) : null;

  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-dashed border-ash"
        style={{ borderColor: mark.done ? color : undefined, background: mark.done ? color : undefined }}
      >
        {mark.done && (
          <svg viewBox="0 0 12 12" className="size-3 text-void">
            <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`font-ko leading-snug ${mark.done ? "text-soot line-through" : ""}`}>
          {mark.url ? (
            <a href={mark.url} target="_blank" rel="noopener noreferrer" className="hover:text-violet">
              {mark.title}
            </a>
          ) : (
            mark.title
          )}
          {mark.done && <span className="sr-only"> (완료)</span>}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 font-ko text-xs text-ash">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
            {mark.label}
          </span>
          {mark.course_name && <span>{mark.course_name}</span>}
          <span className="tabular-nums">{mark.time}</span>
          {left !== null && left >= 0 && (
            <span className={left <= 3 ? "text-blood" : ""}>{left === 0 ? "오늘까지" : `D-${left}`}</span>
          )}
        </p>
      </div>

      <span className="shrink-0 pt-1 text-[10px] tracking-[0.2em] text-ash">LMS</span>
    </li>
  );
}
