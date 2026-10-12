import { EventForm } from "@/components/me/EventForm";
import { EventRow } from "@/components/me/EventRow";
import { requireOwner } from "@/lib/auth";
import { addDays, dayLabel, daysFrom, today as todayISO, weekdayName } from "@/lib/dates";
import { type CalendarEvent, occursOn } from "@/lib/event-types";
import { listEvents } from "@/lib/events";

/** 오늘 이후 이만큼의 일정을 미리 본다 */
const AHEAD = 14;

const editHref = (e: CalendarEvent, day: string) => `/me/calendar?m=${day.slice(0, 7)}&d=${day}&e=${e.id}`;

export default async function TodayPage() {
  await requireOwner();
  const today = todayISO();
  const until = addDays(today, AHEAD);
  const events = await listEvents(today, until);

  const todays = events.filter((e) => occursOn(e, today));
  // 여러 날 일정은 시작하는 날에 한 번만 보여 준다
  const upcoming = events.filter((e) => e.date > today);
  const byDay = Map.groupBy(upcoming, (e) => e.date);

  return (
    <main className="grid gap-16 pt-6 lg:grid-cols-[1fr_22rem] lg:gap-20">
      <div>
        <h1 className="flex items-end gap-4">
          <span className="wdth-62 text-[clamp(4.5rem,14vw,9rem)] leading-[0.8] font-black tabular-nums">
            {Number(today.slice(5, 7))}.{Number(today.slice(8))}
          </span>
          <span className="pb-1 font-ko text-xl text-ash">{weekdayName(today)}요일</span>
        </h1>

        <section aria-labelledby="today-heading" className="mt-14">
          <h2 id="today-heading" className="font-ko text-sm text-ash">
            오늘 할 일
          </h2>
          {todays.length > 0 ? (
            <ul className="mt-2 divide-y divide-concrete">
              {todays.map((e) => (
                <EventRow key={e.id} event={e} editHref={editHref(e, today)} countFrom={today} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 font-ko text-ash">오늘은 비어 있습니다. 오른쪽에서 일정을 추가하세요.</p>
          )}
        </section>

        <section aria-labelledby="ahead-heading" className="mt-14">
          <h2 id="ahead-heading" className="font-ko text-sm text-ash">
            앞으로 {AHEAD}일
          </h2>
          {byDay.size > 0 ? (
            <ol className="mt-4 flex flex-col gap-8">
              {[...byDay].map(([day, list]) => (
                <li key={day} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
                  <p className="pt-3 font-ko text-sm">
                    {dayLabel(day)}
                    <span className="ml-2 text-ash tabular-nums">{daysFrom(today, day)}일 뒤</span>
                  </p>
                  <ul className="divide-y divide-concrete">
                    {list.map((e) => (
                      <EventRow key={e.id} event={e} editHref={editHref(e, day)} countFrom={today} />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 font-ko text-ash">앞으로 {AHEAD}일 동안 잡힌 일정이 없습니다.</p>
          )}
        </section>
      </div>

      <aside aria-labelledby="add-heading" className="lg:sticky lg:top-8 lg:self-start">
        <h2 id="add-heading" className="mb-6 font-ko text-sm text-ash">
          일정 추가
        </h2>
        <EventForm defaultDate={today} />
      </aside>
    </main>
  );
}
