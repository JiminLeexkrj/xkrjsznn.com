import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/me/EventForm";
import { EventRow } from "@/components/me/EventRow";
import { MonthGrid } from "@/components/me/MonthGrid";
import { requireOwner } from "@/lib/auth";
import { addMonths, dayLabel, isISODate, isISOMonth, monthGrid, monthLabel, today as todayISO } from "@/lib/dates";
import { occursOn } from "@/lib/event-types";
import { getEvent, listEvents } from "@/lib/events";

export const metadata: Metadata = { title: "달력" };

// 보고 있는 달(m), 고른 날(d), 고치는 일정(e)을 주소에 담는다. 새로고침하거나 공유해도 같은 화면이 열린다.
export default async function CalendarPage({ searchParams }: PageProps<"/me/calendar">) {
  await requireOwner();
  const params = await searchParams;
  const today = todayISO();
  const selected = isISODate(params.d) ? params.d : today;
  const month = isISOMonth(params.m) ? params.m : selected.slice(0, 7);
  const editing = typeof params.e === "string" ? await getEvent(params.e) : null;

  const grid = monthGrid(month);
  const events = await listEvents(grid[0], grid[grid.length - 1]);
  const dayEvents = events.filter((e) => occursOn(e, selected));
  const here = `/me/calendar?m=${month}&d=${selected}`;

  const step = (n: number) => {
    const m = addMonths(month, n);
    // 달을 넘기면 그 달의 1일을 고른다. 오늘이 있는 달이면 오늘을.
    const d = today.startsWith(m) ? today : `${m}-01`;
    return `/me/calendar?m=${m}&d=${d}`;
  };

  return (
    <main className="grid gap-12 pt-6 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <section aria-labelledby="month-heading">
        <div className="mb-6 flex items-end gap-6">
          <h1 id="month-heading" className="font-ko text-3xl font-semibold">
            {monthLabel(month)}
          </h1>
          <nav aria-label="달 넘기기" className="flex gap-4 pb-1 font-ko text-sm text-ash">
            <Link href={step(-1)} scroll={false} className="hover:text-bone">
              이전 달
            </Link>
            <Link href={step(1)} scroll={false} className="hover:text-bone">
              다음 달
            </Link>
            {!today.startsWith(month) && (
              <Link href={`/me/calendar?m=${today.slice(0, 7)}&d=${today}`} scroll={false} className="text-blood hover:text-bone">
                오늘로
              </Link>
            )}
          </nav>
        </div>
        <MonthGrid month={month} selected={selected} today={today} events={events} />
      </section>

      <aside aria-labelledby="day-heading" className="lg:pt-[3.75rem]">
        <h2 id="day-heading" className="font-ko text-lg">
          {dayLabel(selected)}
          {selected === today && <span className="ml-2 text-sm text-blood">오늘</span>}
        </h2>

        {dayEvents.length > 0 ? (
          <ul className="mt-2 divide-y divide-concrete">
            {dayEvents.map((e) => (
              <EventRow key={e.id} event={e} editHref={`${here}&e=${e.id}`} countFrom={today} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 font-ko text-sm text-ash">이 날은 비어 있습니다.</p>
        )}

        <div className="mt-10 border-t border-concrete pt-6">
          <h3 className="mb-6 font-ko text-sm text-ash">{editing ? "일정 고치기" : "이 날에 일정 추가"}</h3>
          {editing ? (
            <EventForm key={editing.id} event={editing} defaultDate={selected} closeHref={here} />
          ) : (
            <EventForm key={selected} defaultDate={selected} />
          )}
        </div>
      </aside>
    </main>
  );
}
