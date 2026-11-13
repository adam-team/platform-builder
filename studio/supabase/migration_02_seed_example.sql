-- Миграция 02: добавляет то, что нужно для платформы Эксперт Аты-жөні,
-- к уже созданной базе (где supabase/schema.sql уже выполняли раньше).
-- Ничего не удаляет и не затирает. Выполнить целиком в SQL Editor → Run.

alter table public.courses
  add column if not exists category text not null default 'debt'
    check (category in ('debt', 'savings', 'house', 'mortgage_pro')),
  add column if not exists old_price_kzt integer,
  add column if not exists position integer not null default 0;

alter table public.lessons
  add column if not exists module_title text;

alter table public.lesson_content
  add column if not exists materials jsonb not null default '[]'::jsonb;

create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists lesson_progress_user_id_idx on public.lesson_progress (user_id);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'debt'
    check (category in ('debt', 'savings', 'house', 'mortgage_pro', 'review', 'premium')),
  price_kzt integer,
  cta_label text not null default 'Жазылу',
  payment_url text,
  is_published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  expert_name text,
  expert_role text,
  hero_title text,
  hero_subtitle text,
  hero_photo_url text,
  about_text text,
  stat1_value text, stat1_label text,
  stat2_value text, stat2_label text,
  stat3_value text, stat3_label text,
  stat4_value text, stat4_label text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (true) on conflict (id) do nothing;

alter table public.lesson_progress enable row level security;
alter table public.services        enable row level security;
alter table public.site_settings   enable row level security;

-- Публичная витрина: курсы, услуги, программа уроков и настройки сайта видны без входа
grant usage on schema public to anon;
grant select on public.courses, public.services, public.lessons, public.lesson_content, public.site_settings to anon;

drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from courses c where c.id = course_id and c.is_published));

drop policy if exists lesson_content_select on public.lesson_content;
create policy lesson_content_select on public.lesson_content for select to anon, authenticated
  using (public.can_view_lesson(lesson_id));

drop policy if exists services_select on public.services;
create policy services_select on public.services for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists services_admin on public.services;
create policy services_admin on public.services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists lesson_progress_select on public.lesson_progress;
create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists lesson_progress_write on public.lesson_progress;
create policy lesson_progress_write on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id));
drop policy if exists lesson_progress_delete on public.lesson_progress;
create policy lesson_progress_delete on public.lesson_progress for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings for select to anon, authenticated using (true);
drop policy if exists site_settings_admin on public.site_settings;
create policy site_settings_admin on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
