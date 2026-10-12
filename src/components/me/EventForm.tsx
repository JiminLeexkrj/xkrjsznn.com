"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useRef, useState } from "react";
import { type SaveState, saveEvent } from "@/app/me/actions";
import { CATEGORIES, type CalendarEvent } from "@/lib/event-types";

type EventFormProps = {
  /** 있으면 고치기, 없으면 새로 만들기 */
  event?: CalendarEvent;
  defaultDate: string;
  /** 고치기를 마치거나 그만두면 돌아갈 주소 */
  closeHref?: string;
};

const field =
  "w-full border-b border-concrete bg-transparent py-2 outline-none transition-colors placeholder:text-soot focus:border-violet";
const label = "font-ko text-xs text-ash";

export function EventForm({ event, defaultDate, closeHref }: EventFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [allDay, setAllDay] = useState(event ? !event.start_time : true);
  const [multiDay, setMultiDay] = useState(Boolean(event?.end_date));

  const [state, action, pending] = useActionState(async (prev: SaveState, formData: FormData) => {
    const result = await saveEvent(prev, formData);
    if (!result.error) {
      if (closeHref) {
        router.replace(closeHref, { scroll: false });
      } else {
        formRef.current?.reset();
        setAllDay(true);
        setMultiDay(false);
      }
    }
    return result;
  }, {});

  return (
    <form
      ref={formRef}
      // 실패했을 때 적어 둔 내용이 지워지지 않도록, React의 자동 초기화 대신 직접 보낸다
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="flex flex-col gap-5"
    >
      {event && <input type="hidden" name="id" value={event.id} />}

      <label className="flex flex-col gap-1">
        <span className={label}>무엇을</span>
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={event?.title}
          placeholder="자료구조 과제 3"
          autoComplete="off"
          className={`${field} font-ko text-lg`}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={label}>종류</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([value, c]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="category"
                value={value}
                defaultChecked={(event?.category ?? "personal") === value}
                className="peer sr-only"
              />
              <span className="flex items-center gap-2 border border-concrete px-3 py-1.5 font-ko text-sm text-ash transition-colors peer-checked:border-bone peer-checked:text-bone peer-focus-visible:outline-2 peer-focus-visible:outline-violet">
                <span aria-hidden className="size-2 rounded-full" style={{ background: c.color }} />
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className={label}>{multiDay ? "시작하는 날" : "날짜"}</span>
          <input type="date" name="date" required defaultValue={event?.date ?? defaultDate} className={field} />
        </label>
        {multiDay ? (
          <label className="flex flex-col gap-1">
            <span className={label}>끝나는 날</span>
            <input type="date" name="end_date" defaultValue={event?.end_date ?? ""} className={field} />
          </label>
        ) : (
          <div />
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 font-ko text-sm text-ash">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="all_day"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="accent-violet"
          />
          하루 종일
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={multiDay}
            onChange={(e) => setMultiDay(e.target.checked)}
            className="accent-violet"
          />
          여러 날에 걸침
        </label>
      </div>

      {!allDay && (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={label}>시작</span>
            <input
              type="time"
              name="start_time"
              required
              defaultValue={event?.start_time?.slice(0, 5) ?? "09:00"}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>끝 (없어도 됨)</span>
            <input type="time" name="end_time" defaultValue={event?.end_time?.slice(0, 5) ?? ""} className={field} />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className={label}>메모</span>
        <textarea
          name="note"
          rows={2}
          maxLength={2000}
          defaultValue={event?.note ?? ""}
          placeholder="강의실, 제출 링크, 준비물"
          className={`${field} resize-y font-ko`}
        />
      </label>

      {state.error && (
        <p role="alert" className="border-l-2 border-blood pl-3 font-ko text-sm">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-5">
        <button
          type="submit"
          disabled={pending}
          className="bg-bone px-5 py-2.5 font-ko text-sm font-medium text-void transition-colors hover:bg-violet disabled:opacity-50"
        >
          {pending ? "저장하는 중" : event ? "고친 내용 저장" : "일정 추가"}
        </button>
        {closeHref && (
          <Link href={closeHref} scroll={false} className="font-ko text-sm text-ash hover:text-bone">
            그만두기
          </Link>
        )}
      </div>
    </form>
  );
}
