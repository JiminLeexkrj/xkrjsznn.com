// KU LMS+ 확장이 보내 주는 LMS 항목의 모양. 서버와 브라우저가 함께 쓴다.

import { CATEGORIES } from "./event-types";

export const LMS_BASE = "https://mylms.korea.ac.kr";

export const LMS_KINDS = ["assignment", "quiz", "event", "video"] as const;
export const LMS_STAGES = ["due", "event", "open", "unlock", "late", "lock"] as const;

export type LmsKind = (typeof LMS_KINDS)[number];
export type LmsStage = (typeof LMS_STAGES)[number];

/** 색은 직접 만든 일정의 종류와 맞춘다. 퀴즈는 시험, 영상과 수업 일정은 수업의 색. */
export const LMS_COLORS: Record<LmsKind, string> = {
  assignment: CATEGORIES.assignment.color,
  quiz: CATEGORIES.exam.color,
  event: CATEGORIES.class.color,
  video: CATEGORIES.class.color,
};

/**
 * 사이트에 보여 줄 단계. 저장은 전부 하고, 여기 있는 것만 목록과 달력에 나온다.
 * 영상의 열람 시작, 지각 마감, 열람 종료, 마감 없는 공개는 확장의 캘린더에서만 본다.
 */
export const SHOWN_STAGES: readonly LmsStage[] = ["due", "event"];

/** 남은 날을 세는 단계 */
export const isDeadline = (stage: LmsStage) => stage === "due";

export type LmsMark = {
  key: string;
  course_name: string | null;
  kind: LmsKind;
  stage: LmsStage;
  label: string;
  title: string;
  /** ISO 시각 */
  at: string;
  url: string | null;
  done: boolean;
  /** 서울 기준 날짜와 시각. 읽을 때 at에서 만든다. */
  date: string;
  time: string;
};
