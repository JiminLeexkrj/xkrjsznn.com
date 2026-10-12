-- KU LMS+ 확장 프로그램이 보내 주는 LMS 마감과 일정. Supabase 대시보드의 SQL Editor에 붙여 넣어 한 번 실행한다.
-- 확장이 동기화할 때마다 통째로 맞추므로 사이트에서는 읽기만 한다. 직접 만든 일정(events)과는 섞지 않는다.

create table public.lms_marks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 확장이 붙인 이름. 'assignment-123', 'video-456-due'처럼 LMS 항목과 단계마다 하나
  key text not null check (char_length(key) between 1 and 200),
  course_name text check (course_name is null or char_length(course_name) <= 200),
  kind text not null check (kind in ('assignment', 'quiz', 'event', 'video')),
  stage text not null check (stage in ('due', 'event', 'open', 'unlock', 'late', 'lock')),
  label text not null check (char_length(label) between 1 and 40),
  title text not null check (char_length(title) between 1 and 300),
  at timestamptz not null,
  url text check (url is null or url like 'https://mylms.korea.ac.kr/%'),
  done boolean not null default false,
  synced_at timestamptz not null,
  primary key (user_id, key)
);

create index lms_marks_user_at_idx on public.lms_marks (user_id, at);

alter table public.lms_marks enable row level security;

grant select, insert, update, delete on public.lms_marks to authenticated;

create policy "read own lms marks" on public.lms_marks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "add own lms marks" on public.lms_marks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "change own lms marks" on public.lms_marks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "remove own lms marks" on public.lms_marks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
