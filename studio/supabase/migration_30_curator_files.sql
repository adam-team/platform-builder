-- AI-куратордың қосымша білім файлдары: бірнеше файл, жалпы (lesson_id бос) немесе бір сабаққа арналған
create table if not exists public.curator_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade,
  name text not null,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.curator_files enable row level security;
grant select, insert, update, delete on public.curator_files to authenticated;

drop policy if exists curator_files_select on public.curator_files;
create policy curator_files_select on public.curator_files for select to authenticated
  using (public.can_answer() and (lesson_id is null or public.can_view_lesson(lesson_id)));
drop policy if exists curator_files_admin on public.curator_files;
create policy curator_files_admin on public.curator_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
