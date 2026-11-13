-- Курс ішіндегі бет: мұқаба суреті, фон, чат сілтемелері, Top-30, кесте (күнтізбе)
alter table public.courses
  add column if not exists cover_image_url text,
  add column if not exists bg_image_url text,
  add column if not exists whatsapp_url text,
  add column if not exists telegram_url text,
  add column if not exists top30_url text;

create table if not exists public.course_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  link text,
  created_at timestamptz not null default now()
);
alter table public.course_events enable row level security;
grant select, insert, update, delete on public.course_events to authenticated;

drop policy if exists course_events_select on public.course_events;
create policy course_events_select on public.course_events for select to authenticated
  using (public.is_admin() or exists (select 1 from public.enrollments e where e.course_id = course_events.course_id and e.user_id = auth.uid()));
drop policy if exists course_events_admin on public.course_events;
create policy course_events_admin on public.course_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- «Қарызсыз өмір» курсының мұқабасы
update public.courses set cover_image_url = '/images/course-cover-debt.jpg' where id = 'c18908aa-2db5-4780-98b2-4fc2398995a7';
