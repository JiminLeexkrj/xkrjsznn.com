-- 일정. Supabase 대시보드의 SQL Editor에 붙여 넣어 한 번 실행한다.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  date date not null,
  end_date date check (end_date is null or end_date > date),
  start_time time,
  end_time time check (end_time is null or start_time is not null),
  category text not null default 'personal'
    check (category in ('class', 'assignment', 'exam', 'activity', 'personal')),
  note text check (note is null or char_length(note) <= 2000),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index events_user_date_idx on public.events (user_id, date);

-- 로그인한 사람은 자기 일정만 보고 고칠 수 있다. 앱은 여기에 더해 주인 이메일인지도 확인한다.
alter table public.events enable row level security;

create policy "read own events" on public.events
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "add own events" on public.events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "change own events" on public.events
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "remove own events" on public.events
  for delete to authenticated
  using ((select auth.uid()) = user_id);
