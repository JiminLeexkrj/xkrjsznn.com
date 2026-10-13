-- PDF 자료마다 하나씩 두는 핵심 정리 퀴즈. Supabase 대시보드의 SQL Editor에 붙여 넣어 한 번 실행한다.
-- 새로 만들면 이전 퀴즈와 푼 기록을 덮어쓴다.

create table public.study_quizzes (
  document_id uuid primary key references public.study_documents (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- [{ concept, type: 'choice' | 'ox', question, options, answer, explanation, pages }]
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  -- 문제 번호(0부터)를 키로 하는 고른 보기 번호. 다시 열면 이어서 푼다.
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.study_quizzes enable row level security;

grant select, insert, update, delete on public.study_quizzes to authenticated;

create policy "own study quizzes" on public.study_quizzes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
