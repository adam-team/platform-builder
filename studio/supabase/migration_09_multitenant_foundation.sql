-- Миграция 09: фундамент под мультишкольность (ЭТАП_01 из папки «Задачи»).
-- До сих пор платформа была рассчитана на одну школу («зашито» в site_settings как singleton-строку).
-- Теперь у нас таблица schools, и всё привязывается к school_id. Данные Эксперт Аты-жөні становятся
-- ПЕРВОЙ школой в новой модели — ничего не удаляется, все существующие строки просто получают school_id.
-- Выполнить после migration_08_site_blocks.sql.

-- ───────── Школа (аккаунт) — «Паспорт платформы» из ЭТАП_01 ─────────
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text,                                    -- ниша: влияет только на демо-данные/подсказки
  country text,
  languages jsonb not null default '["kk"]'::jsonb,
  default_currency text not null default 'KZT',
  timezone text not null default 'Asia/Almaty',
  brand_color text not null default '#1E7A4C',
  terms jsonb not null default '{"course": "курс", "module": "модуль", "student": "оқушы"}'::jsonb,
  payment_providers jsonb not null default '[]'::jsonb,   -- напр. ["kaspi_manual"]
  messengers jsonb not null default '[]'::jsonb,
  video_provider text,
  subdomain text unique,
  custom_domain text unique,
  logo_url text,
  tariff text not null default 'free',
  storage_limit_gb integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Первая (и пока единственная) школа — Эксперт Аты-жөні, с её реальными данными
insert into public.schools (id, name, niche, country, languages, default_currency, timezone, brand_color, terms, payment_providers)
values (
  '00000000-0000-0000-0000-000000000001',
  'Эксперт Аты-жөні',
  'қаржы/ипотека',
  'Қазақстан',
  '["kk"]'::jsonb,
  'KZT',
  'Asia/Almaty',
  '#1E7A4C',
  '{"course": "курс", "module": "модуль", "student": "оқушы"}'::jsonb,
  '["kaspi_manual"]'::jsonb
)
on conflict (id) do nothing;

-- ───────── school_id — на корневых сущностях (дочерние наследуют через FK: lessons→courses, enrollments→profiles+courses и т.д.) ─────────
alter table public.profiles add column if not exists school_id uuid references public.schools(id);
alter table public.courses  add column if not exists school_id uuid references public.schools(id);
alter table public.services add column if not exists school_id uuid references public.schools(id);
alter table public.news     add column if not exists school_id uuid references public.schools(id);

update public.profiles set school_id = '00000000-0000-0000-0000-000000000001' where school_id is null;
update public.courses  set school_id = '00000000-0000-0000-0000-000000000001' where school_id is null;
update public.services set school_id = '00000000-0000-0000-0000-000000000001' where school_id is null;
update public.news     set school_id = '00000000-0000-0000-0000-000000000001' where school_id is null;

alter table public.profiles alter column school_id set not null;
alter table public.courses  alter column school_id set not null;
alter table public.services alter column school_id set not null;
alter table public.news     alter column school_id set not null;

-- Дефолт, чтобы существующий код (пока однотенантный рантайм) мог вставлять строки без school_id
alter table public.profiles alter column school_id set default '00000000-0000-0000-0000-000000000001';
alter table public.courses  alter column school_id set default '00000000-0000-0000-0000-000000000001';
alter table public.services alter column school_id set default '00000000-0000-0000-0000-000000000001';
alter table public.news     alter column school_id set default '00000000-0000-0000-0000-000000000001';

create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists courses_school_id_idx  on public.courses (school_id);
create index if not exists services_school_id_idx on public.services (school_id);
create index if not exists news_school_id_idx      on public.news (school_id);

-- ───────── site_settings: было singleton (id boolean), стало по одной строке на школу ─────────
alter table public.site_settings add column if not exists school_id uuid references public.schools(id);
update public.site_settings set school_id = '00000000-0000-0000-0000-000000000001' where school_id is null;
alter table public.site_settings alter column school_id set not null;
alter table public.site_settings drop constraint if exists site_settings_pkey;
alter table public.site_settings add constraint site_settings_school_id_key unique (school_id);
alter table public.site_settings alter column id drop not null;
alter table public.site_settings alter column id drop default;

drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings for select to anon, authenticated using (true);
drop policy if exists site_settings_admin on public.site_settings;
create policy site_settings_admin on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists site_settings_insert on public.site_settings;
create policy site_settings_insert on public.site_settings for insert to authenticated
  with check (public.is_admin());

-- ───────── Новые фундаментальные таблицы из модели ЭТАП_01 ─────────

-- Права сотрудников (учитель/куратор/менеджер продаж/контент-менеджер/администратор — гибко, по школе)
create table if not exists public.employee_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('teacher', 'curator', 'sales_manager', 'content_manager', 'administrator')),
  scope jsonb not null default '{}'::jsonb,   -- напр. {"course_ids": [...]} — на какие курсы/воронки распространяется
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);

-- История изменений (<EntityHistory> — кто/когда/что поменял, откуда/куда)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,      -- напр. 'course', 'lesson', 'product'
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete', 'restore')),
  diff jsonb not null default '{}'::jsonb,   -- {"field": {"from": ..., "to": ...}}
  created_at timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on public.audit_log (school_id, entity_type, entity_id, created_at desc);

-- Файловое хранилище (<FileUploader> — учёт загруженных файлов и где используются)
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  path text not null,
  size_bytes bigint not null default 0,
  mime text,
  folder text,
  used_in jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.schools        enable row level security;
alter table public.employee_roles enable row level security;
alter table public.audit_log      enable row level security;
alter table public.files          enable row level security;

-- <TagInput> — кез келген сущностіге тег (қазір: курстар мен пайдаланушылар)
alter table public.courses  add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists tags jsonb not null default '[]'::jsonb;

-- ───────── Жұмсақ өшіру (<ConfirmDialog>+<UndoToast> — 8 секунд ішінде «Болдырмау», 30 күн қоқыс шелегі) ─────────
alter table public.courses add column if not exists deleted_at timestamptz;
alter table public.lessons add column if not exists deleted_at timestamptz;

drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to anon, authenticated
  using ((is_published and deleted_at is null) or public.is_admin());

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from courses c where c.id = course_id and c.is_published and c.deleted_at is null and lessons.deleted_at is null));

drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools for select to anon, authenticated using (true);
drop policy if exists schools_admin on public.schools;
create policy schools_admin on public.schools for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists employee_roles_admin on public.employee_roles;
create policy employee_roles_admin on public.employee_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_log_admin on public.audit_log;
create policy audit_log_admin on public.audit_log for select to authenticated using (public.is_admin());
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert on public.audit_log for insert to authenticated with check (public.is_admin());

drop policy if exists files_admin on public.files;
create policy files_admin on public.files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
