-- Сабақ беті: «Бұл сабақта» тізімі, презентация/конспект сілтемелері, ЖИ-куратор файлы
alter table public.lesson_content
  add column if not exists outcomes jsonb not null default '[]'::jsonb,
  add column if not exists presentation_url text,
  add column if not exists notes_url text;

create table if not exists public.lesson_curator_files (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  context text not null,
  updated_at timestamptz not null default now()
);
alter table public.lesson_curator_files enable row level security;
grant select on public.lesson_curator_files to authenticated;
grant insert, update, delete on public.lesson_curator_files to authenticated;

drop policy if exists lesson_curator_files_select on public.lesson_curator_files;
create policy lesson_curator_files_select on public.lesson_curator_files for select to authenticated
  using (public.can_view_lesson(lesson_id));
drop policy if exists lesson_curator_files_admin on public.lesson_curator_files;
create policy lesson_curator_files_admin on public.lesson_curator_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
