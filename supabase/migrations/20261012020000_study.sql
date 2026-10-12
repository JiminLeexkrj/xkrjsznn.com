-- 공부 공간. 과목마다 프로젝트를 두고, 그 안에 PDF를 올리면 페이지마다 해설이 붙는다.
-- Supabase 대시보드의 SQL Editor에 붙여 넣어 한 번 실행한다.

create table public.study_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create index study_projects_user_idx on public.study_projects (user_id, created_at);

create table public.study_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.study_projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  -- Storage의 study-pdfs 버킷 안 경로. '<user_id>/<문서 id>.pdf'
  storage_path text not null unique,
  page_count integer not null check (page_count between 1 and 2000),
  size_bytes bigint not null check (size_bytes > 0),
  -- 마지막으로 보던 페이지. 다시 열면 여기서 시작한다.
  last_page integer not null default 1 check (last_page >= 1),
  created_at timestamptz not null default now()
);

create index study_documents_project_idx on public.study_documents (project_id, created_at);

create table public.study_explanations (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid not null references public.study_documents (id) on delete cascade,
  page integer not null check (page >= 1),
  content text not null check (char_length(content) between 1 and 30000),
  model text not null,
  created_at timestamptz not null default now(),
  primary key (document_id, page)
);

-- 로그인한 사람은 자기 것만 보고 고칠 수 있다. 앱은 여기에 더해 주인 이메일인지도 확인한다.
alter table public.study_projects enable row level security;
alter table public.study_documents enable row level security;
alter table public.study_explanations enable row level security;

grant select, insert, update, delete on public.study_projects, public.study_documents, public.study_explanations to authenticated;

create policy "own study projects" on public.study_projects
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own study documents" on public.study_documents
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own study explanations" on public.study_explanations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- PDF 파일. 공개하지 않고, 자기 이름(user_id) 폴더 안에서만 읽고 쓰고 지운다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-pdfs', 'study-pdfs', false, 52428800, array['application/pdf']);

create policy "read own study pdfs" on storage.objects
  for select to authenticated
  using (bucket_id = 'study-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "add own study pdfs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'study-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "remove own study pdfs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'study-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
