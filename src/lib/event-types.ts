// 일정의 모양과 종류. 서버와 브라우저가 함께 쓴다.

// 일정의 종류. 색은 달력의 띠와 목록의 점에 쓰인다.
// 순서를 바꾸면 고르는 칸의 순서도 바뀐다. 값을 바꾸려면 데이터베이스의 check 제약도 함께 고친다.
export const CATEGORIES = {
  class: { label: "수업", color: "var(--color-frost)" },
  assignment: { label: "과제", color: "var(--color-ember)" },
  exam: { label: "시험", color: "var(--color-blood)" },
  activity: { label: "활동", color: "var(--color-violet)" },
  personal: { label: "개인", color: "var(--color-bone)" },
} as const;

export type Category = keyof typeof CATEGORIES;

export const isCategory = (value: unknown): value is Category =>
  typeof value === "string" && Object.hasOwn(CATEGORIES, value);

export type CalendarEvent = {
  id: string;
  title: string;
  /** 시작하는 날 */
  date: string;
  /** 여러 날에 걸치면 끝나는 날. 하루짜리는 null. */
  end_date: string | null;
  /** 하루 종일이면 null */
  start_time: string | null;
  end_time: string | null;
  category: Category;
  note: string | null;
  done: boolean;
};

/** 그 날에 걸치는 일정인지 */
export const occursOn = (event: CalendarEvent, date: string) =>
  event.date <= date && (event.end_date ?? event.date) >= date;
