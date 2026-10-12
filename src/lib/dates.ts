// 날짜는 'YYYY-MM-DD' 문자열로 다룬다. 서버(UTC)와 브라우저 어디서든 같은 날을 가리키게,
// 계산은 UTC 자정 기준 Date로만 하고 '오늘'은 서울 시간으로 정한다.

export const TIME_ZONE = "Asia/Seoul";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

export const isISODate = (value: unknown): value is string =>
  typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(parse(value).getTime());

export const isISOMonth = (value: unknown): value is string =>
  typeof value === "string" && ISO_MONTH.test(value) && Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12;

function parse(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function format(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** 서울 기준 오늘 */
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function addDays(date: string, days: number) {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

export function addMonths(month: string, months: number) {
  const d = parse(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return format(d).slice(0, 7);
}

/** 0이 일요일 */
export const weekday = (date: string) => parse(date).getUTCDay();

/** 그 달을 덮는, 일요일에 시작하는 주들의 날짜. 항상 7의 배수다. */
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const start = addDays(first, -weekday(first));
  const last = addDays(addMonths(month, 1) + "-01", -1);
  const end = addDays(last, 6 - weekday(last));
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

export const weekdayName = (date: string) => WEEKDAYS_KO[weekday(date)];
export const WEEKDAY_NAMES = WEEKDAYS_KO;

/** 2026년 10월 */
export const monthLabel = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;

/** 10월 12일 (월) */
export const dayLabel = (date: string) =>
  `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 (${weekdayName(date)})`;

/** '09:00:00'이나 '09:00'을 '09:00'으로 */
export const shortTime = (time: string | null) => (time ? time.slice(0, 5) : null);

/** 오늘부터 며칠 남았는지. 오늘이면 0, 지났으면 음수. */
export const daysFrom = (from: string, to: string) =>
  Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
