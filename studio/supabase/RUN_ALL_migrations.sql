-- Склеенные миграции 02–08 в один файл — чтобы вставить в SQL Editor одним разом,
-- а не открывать 7 файлов по очереди. Сами номерные файлы (migration_02...08) остаются
-- основными — этот файл только для удобной разовой вставки, в репозитории не нужен постоянно.
-- Безопасно даже если что-то из этого уже применялось раньше (все операции идемпотентны).

-- ======================================================================
-- migration_02_expert.sql
-- ======================================================================
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

-- ======================================================================
-- migration_03_features.sql
-- ======================================================================
-- Миграция 03: списки преимуществ у курсов и услуг (точные тексты из ТЗ).
-- Выполнить в SQL Editor после migration_02_expert.sql. Ничего не удаляет.

alter table public.courses
  add column if not exists features_intro text,
  add column if not exists features jsonb not null default '[]'::jsonb;

alter table public.services
  add column if not exists features_intro text,
  add column if not exists features jsonb not null default '[]'::jsonb;

-- ======================================================================
-- migration_04_about.sql
-- ======================================================================
-- Миграция 04: блок «Эксперт туралы» — короткое вступление всегда видно,
-- список фактов и история — под кнопкой «Толығырақ» (сворачиваемый блок из ТЗ).
-- Выполнить после migration_03_features.sql. Ничего не удаляет.

alter table public.site_settings
  add column if not exists about_more_list jsonb not null default '[]'::jsonb,
  add column if not exists about_more_text text;

-- ======================================================================
-- migration_05_news_assignments_profile.sql
-- ======================================================================
-- Миграция 05: жаңалықтар (news), тапсырмаға жауап/пікір (lesson_answers, answer_replies),
-- профильде телефон (phone). Выполнить после migration_04_about.sql. Ничего не удаляет.

alter table public.profiles
  add column if not exists phone text;

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.news_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  news_id uuid not null references public.news(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, news_id)
);

alter table public.lesson_content
  add column if not exists assignment_text text;

create table if not exists public.lesson_answers (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.answer_replies (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.lesson_answers(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists news_created_at_idx on public.news (created_at desc);
create index if not exists news_reads_user_id_idx on public.news_reads (user_id);
create index if not exists lesson_answers_lesson_id_idx on public.lesson_answers (lesson_id);
create index if not exists answer_replies_answer_id_idx on public.answer_replies (answer_id);

create or replace function public.can_answer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('paid', 'admin'));
$$;

alter table public.news           enable row level security;
alter table public.news_reads     enable row level security;
alter table public.lesson_answers enable row level security;
alter table public.answer_replies enable row level security;

grant usage on schema public to anon;
grant select on public.news to anon;

-- Пользователь теперь может обновлять ещё и телефон (почта/пароль — через auth)
grant update (phone) on public.profiles to authenticated;

drop policy if exists news_select on public.news;
create policy news_select on public.news for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists news_admin on public.news;
create policy news_admin on public.news for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists news_reads_select on public.news_reads;
create policy news_reads_select on public.news_reads for select to authenticated
  using (user_id = auth.uid());
drop policy if exists news_reads_insert on public.news_reads;
create policy news_reads_insert on public.news_reads for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists lesson_answers_select on public.lesson_answers;
create policy lesson_answers_select on public.lesson_answers for select to authenticated
  using (public.can_view_lesson(lesson_id));
drop policy if exists lesson_answers_insert on public.lesson_answers;
create policy lesson_answers_insert on public.lesson_answers for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id) and public.can_answer());
drop policy if exists lesson_answers_delete on public.lesson_answers;
create policy lesson_answers_delete on public.lesson_answers for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists answer_replies_select on public.answer_replies;
create policy answer_replies_select on public.answer_replies for select to authenticated
  using (exists (select 1 from lesson_answers a where a.id = answer_id and public.can_view_lesson(a.lesson_id)));
drop policy if exists answer_replies_insert on public.answer_replies;
create policy answer_replies_insert on public.answer_replies for insert to authenticated
  with check (
    author_id = auth.uid() and public.can_answer()
    and exists (select 1 from lesson_answers a where a.id = answer_id and public.can_view_lesson(a.lesson_id))
  );
drop policy if exists answer_replies_delete on public.answer_replies;
create policy answer_replies_delete on public.answer_replies for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ======================================================================
-- migration_06_answer_review.sql
-- ======================================================================
-- Миграция 06: «Тексерілді» белгісі у ответов — для «Жауаптар ленасы» в админке
-- (единый список ответов учеников по всем курсам). Выполнить после
-- migration_05_news_assignments_profile.sql.

alter table public.lesson_answers
  add column if not exists reviewed boolean not null default false;

grant update (reviewed) on public.lesson_answers to authenticated;
drop policy if exists lesson_answers_update on public.lesson_answers;
create policy lesson_answers_update on public.lesson_answers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ======================================================================
-- migration_07_support_chat.sql
-- ======================================================================
-- Миграция 07: чат «Сұрағыңыз бар ма? Кураторға жазыңыз» — плавающая кнопка на сайте
-- и «Хабарлар → Кіріс» в админке. Выполнить после migration_06_answer_review.sql.

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_user_id_idx on public.support_messages (user_id, created_at);

alter table public.support_messages enable row level security;

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (author_id = auth.uid() and (user_id = auth.uid() or public.is_admin()));

-- ======================================================================
-- migration_08_site_blocks.sql
-- ======================================================================
-- Миграция 08: раньше карточки целей на главной, интро+шаги на странице бесплатных уроков,
-- блок о компании Brand, блок кейсов и финальный призыв к действию были зашиты в коде
-- (src/lib/content.ts) и не редактировались из админки. Теперь всё это — колонки site_settings,
-- редактируются на страницах «Сайт → Басты бет / Тегін сабақтар / Қызметтер беті».
-- Выполнить после migration_07_support_chat.sql. Ничего не удаляет.

alter table public.site_settings
  add column if not exists goal1_title text, add column if not exists goal1_text text,
  add column if not exists goal2_title text, add column if not exists goal2_text text,
  add column if not exists goal3_title text, add column if not exists goal3_text text,
  add column if not exists goal4_title text, add column if not exists goal4_text text,
  add column if not exists final_cta_title text,
  add column if not exists final_cta_text text,
  add column if not exists final_cta_label text,
  add column if not exists free_eyebrow text,
  add column if not exists free_title text,
  add column if not exists free_text text,
  add column if not exists free_step1_title text, add column if not exists free_step1_text text,
  add column if not exists free_step2_title text, add column if not exists free_step2_text text,
  add column if not exists free_step3_title text, add column if not exists free_step3_text text,
  add column if not exists free_outro text,
  add column if not exists free_outro_list jsonb not null default '[]'::jsonb,
  add column if not exists free_materials_title text,
  add column if not exists free_materials_text text,
  add column if not exists free_materials_cta text,
  add column if not exists company_eyebrow text,
  add column if not exists company_title text,
  add column if not exists company_text text,
  add column if not exists company_list_intro text,
  add column if not exists company_list jsonb not null default '[]'::jsonb,
  add column if not exists cases_eyebrow text,
  add column if not exists cases_title text,
  add column if not exists cases_text text,
  add column if not exists cases_list_intro text,
  add column if not exists cases_list jsonb not null default '[]'::jsonb,
  add column if not exists cases_cta text;

