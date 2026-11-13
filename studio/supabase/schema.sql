-- Обучающая платформа Эксперт Аты-жөні: схема, роли и защита доступа (RLS)
-- Для НОВОГО проекта Supabase: выполнить целиком в SQL Editor → New query → Run.
-- Для уже созданного проекта, где этот файл уже запускали, используйте
-- supabase/migration_02_expert.sql — он лишь добавляет новое, ничего не стирая.

create extension if not exists pgcrypto;

-- ───────── Школа (мультитенантность, ЭТАП_01) ─────────
-- Платформа рассчитана на несколько школ. Эксперт Аты-жөні — первая школа (фиксированный id ниже),
-- остальные таблицы ссылаются на school_id корневых сущностей (profiles/courses/services/news).

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text,
  country text,
  languages jsonb not null default '["kk"]'::jsonb,
  default_currency text not null default 'KZT',
  timezone text not null default 'Asia/Almaty',
  brand_color text not null default '#1E7A4C',
  terms jsonb not null default '{"course": "курс", "module": "модуль", "student": "оқушы"}'::jsonb,
  payment_providers jsonb not null default '[]'::jsonb,
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

insert into public.schools (id, name, niche, country, languages, default_currency, timezone, brand_color, terms, payment_providers) values (
  '00000000-0000-0000-0000-000000000001', 'Эксперт Аты-жөні', 'қаржы/ипотека', 'Қазақстан',
  '["kk"]'::jsonb, 'KZT', 'Asia/Almaty', '#1E7A4C',
  '{"course": "курс", "module": "модуль", "student": "оқушы"}'::jsonb, '["kaspi_manual"]'::jsonb
);

-- ───────── Таблицы ─────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  email text not null,
  full_name text,
  phone text,
  role text not null default 'free' check (role in ('free', 'paid', 'admin')),
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Жаңалықтар: басты беттегі жаңалықтар ағыны, әкімші жазады
create table public.news (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  title text not null,
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Пайдаланушы қай жаңалықты оқығанын белгілейді — үстіндегі санақ («жаңа» белгісі) үшін
create table public.news_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  news_id uuid not null references public.news(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, news_id)
);

-- Направление курса/услуги — определяет цвет карточки на сайте (см. src/lib/content.ts)
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  title text not null,
  description text,
  features_intro text,             -- напр. «Курс нәтижесінде сіз:»
  features jsonb not null default '[]'::jsonb,  -- список пунктов ["...", "..."]
  category text not null default 'debt' check (category in ('debt', 'savings', 'house', 'mortgage_pro')),
  price_kzt integer,
  old_price_kzt integer,           -- зачёркнутая цена для скидки, необязательно
  offline_price_kzt integer,       -- офлайн формат курса (напр. Ипотека PRO), необязательно
  payment_url text,                -- ссылка Kaspi Pay на оплату этого курса
  is_published boolean not null default false,
  position integer not null default 0,
  deleted_at timestamptz,           -- жұмсақ өшіру: <UndoToast> 8 секунд, 30 күн қоқыс шелегі
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_title text,              -- название модуля для группировки в программе курса
  title text not null,
  position integer not null default 0,
  is_free_preview boolean not null default false,   -- открытый урок для бесплатных
  is_stop_lesson boolean not null default false,    -- келесі сабақ тапсырма қабылданғанша ашылмайды
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Видео и текст урока лежат ОТДЕЛЬНО: список уроков видят все,
-- а ссылку на видео база отдаёт только тем, у кого есть доступ.
create table public.lesson_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  youtube_id text,
  body text,
  materials jsonb not null default '[]'::jsonb,  -- [{"title": "...", "url": "...", "kind": "PDF"}]
  assignment_text text            -- «Тапсырма» табындағы тапсырма мәтіні
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Оқушылардың тапсырмаға жауабы — сабақ бетінде барлығына көрінеді
create table public.lesson_answers (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  reviewed boolean not null default false,  -- админ/куратор «Лента ответов»-та белгілейді (status='accepted' синоним)
  status text not null default 'pending' check (status in ('pending', 'needs_revision', 'accepted', 'no_review_needed')),
  created_at timestamptz not null default now()
);

-- Шаблон-жауаптар («⚡ Шаблоны» — жиі қолданылатын дайын фразалар)
create table public.reply_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Тарату (email-хабарлама, SegmentBuilder арқылы таңдалған адамдарға Resend-пен жіберіледі)
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

-- Жауапқа пікір — куратор (админ) немесе кез келген төлеген пайдаланушы жаза алады
create table public.answer_replies (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.lesson_answers(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Қолдау чаты: «Сұрағыңыз бар ма? Кураторға жазыңыз» — жазба ағыны, бір пайдаланушыға бір чат.
-- user_id — чат кімге тиесілі (оқушы), author_id — нақты жазған адам (сол оқушы немесе әкімші).
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Разовые услуги (консультация, разбор, сопровождение) — без уроков внутри
create table public.services (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  title text not null,
  description text,
  features_intro text,
  features jsonb not null default '[]'::jsonb,
  category text not null default 'debt' check (category in ('debt', 'savings', 'house', 'mortgage_pro', 'review', 'premium')),
  price_kzt integer,               -- null = бесплатно
  cta_label text not null default 'Жазылу',
  payment_url text,
  is_published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null default 'admin' check (source in ('admin', 'payment')),
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount_kzt integer,
  provider text not null default 'kaspi',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  external_id text,               -- id операции Kaspi (когда подключим API)
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Одна строка с текстами и фото главной страницы НА ШКОЛУ — редактируется в админке,
-- без неё сайт показывает готовые тексты по умолчанию (см. src/lib/content.ts)
create table public.site_settings (
  school_id uuid primary key references public.schools(id),
  expert_name text,
  expert_role text,
  hero_title text,
  hero_subtitle text,
  hero_photo_url text,
  about_text text,               -- короткое вступление, видно всегда
  about_more_list jsonb not null default '[]'::jsonb,  -- факты под кнопкой «Толығырақ»
  about_more_text text,          -- история (история эксперта…) под той же кнопкой
  stat1_value text, stat1_label text,
  stat2_value text, stat2_label text,
  stat3_value text, stat3_label text,
  stat4_value text, stat4_label text,
  -- Басты беттегі 4 мақсат картасы (Қарыз/Жинақ/Үй/Ипотека PRO — реті тұрақты)
  goal1_title text, goal1_text text,
  goal2_title text, goal2_text text,
  goal3_title text, goal3_text text,
  goal4_title text, goal4_text text,
  final_cta_title text, final_cta_text text, final_cta_label text,
  -- «Тегін сабақтар» беті
  free_eyebrow text, free_title text, free_text text,
  free_step1_title text, free_step1_text text,
  free_step2_title text, free_step2_text text,
  free_step3_title text, free_step3_text text,
  free_outro text,
  free_outro_list jsonb not null default '[]'::jsonb,
  free_materials_title text, free_materials_text text, free_materials_cta text,
  -- «Қызметтер» беті
  company_eyebrow text, company_title text, company_text text, company_list_intro text,
  company_list jsonb not null default '[]'::jsonb,
  cases_eyebrow text, cases_title text, cases_text text, cases_list_intro text,
  cases_list jsonb not null default '[]'::jsonb,
  cases_cta text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (school_id) values ('00000000-0000-0000-0000-000000000001');

-- Права сотрудников школы (гибко: учитель/куратор/менеджер продаж/контент-менеджер/администратор)
create table public.employee_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('teacher', 'curator', 'sales_manager', 'content_manager', 'administrator')),
  scope jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);

-- История изменений сущностей (<EntityHistory>)
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete', 'restore')),
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Файловое хранилище (<FileUploader> — учёт файлов и где используются)
create table public.files (
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

create index on public.lessons (course_id, position);
create index on public.profiles (school_id);
create index on public.courses (school_id);
create index on public.services (school_id);
create index on public.news (school_id);
create index on public.audit_log (school_id, entity_type, entity_id, created_at desc);

-- Топтар (ЭТАП_02) — қолмен толтырылатын топ, қатысушылар кестесі бөлек
create table public.user_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.user_group_members (
  group_id uuid not null references public.user_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.user_groups (school_id);
create index on public.user_group_members (user_id);

-- Сегменттер (<SegmentBuilder>) — v1: тек «ЖӘНЕ», рөл/тег/курсқа қолжетімділік шарттары
create table public.segments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  name text not null,
  entity text not null default 'users',
  conditions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.segments (school_id);

-- CRM (ЭТАП_09): канбан доска + тапсырмалар. Толық «Процессы» автоматтандыруы жоқ — оған нақты
-- queue/cron инфрақұрылымы керек, Vercel serverless функциялары «24 сағаттан кейін жалғастыру» істей
-- алмайды — жартылай жасау ойдан шығарылған функция болар еді.
create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  color text not null default '#64748B',
  stage_type text not null default 'normal' check (stage_type in ('normal', 'success', 'fail')),
  position integer not null default 0,
  unique (pipeline_id, name)
);
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages(id),
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  amount_kzt integer,
  manager_id uuid references public.profiles(id) on delete set null,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  title text not null,
  due_at timestamptz,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  manager_id uuid references public.profiles(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  result text,
  created_at timestamptz not null default now()
);
-- Трафик (ЭТАП_11) — негізгі трекинг, толық көп өлшемді есептер жоқ (честно)
create table public.traffic_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  visitor_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  landing_page text,
  device text,
  created_at timestamptz not null default now()
);
create table public.traffic_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.traffic_sessions(id) on delete cascade,
  event_type text not null check (event_type in ('pageview', 'register', 'order', 'payment')),
  path text,
  created_at timestamptz not null default now()
);
create index on public.traffic_sessions (created_at desc);
create index on public.traffic_events (session_id);

-- Жеке хабарландырулар (ЭТАП_12) — қоңырау белгішесі. Толық арна матрицасы жоқ, честно.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, read_at, created_at desc);

insert into public.pipelines (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'Сатылым');
insert into public.pipeline_stages (pipeline_id, name, color, stage_type, position) values
  ('00000000-0000-0000-0000-0000000000d1', 'Жаңа', '#64748B', 'normal', 1),
  ('00000000-0000-0000-0000-0000000000d1', 'Байланысқа шықты', '#3B6FE0', 'normal', 2),
  ('00000000-0000-0000-0000-0000000000d1', 'Ойланып жатыр', '#B8860B', 'normal', 3),
  ('00000000-0000-0000-0000-0000000000d1', 'Төлем күтуде', '#E3AE3A', 'normal', 4),
  ('00000000-0000-0000-0000-0000000000d1', 'Төленді', '#16A34A', 'success', 5),
  ('00000000-0000-0000-0000-0000000000d1', 'Бас тартты', '#DC2626', 'fail', 6);

-- Топ арқылы курсқа қолжетімділік («главный механизм» ЭТАП_03: Продукт → Топ → Курс)
create table public.course_group_access (
  course_id uuid not null references public.courses(id) on delete cascade,
  group_id uuid not null references public.user_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, group_id)
);
create index on public.enrollments (user_id);
create index on public.payments (status);
create index on public.lesson_progress (user_id);
create index on public.news (created_at desc);
create index on public.news_reads (user_id);
create index on public.lesson_answers (lesson_id);
create index on public.answer_replies (answer_id);
create index on public.support_messages (user_id, created_at);

-- ───────── Вспомогательные функции ─────────

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_view_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from lessons l
    where l.id = p_lesson
      and (
        l.is_free_preview
        or exists (select 1 from enrollments e where e.user_id = auth.uid() and e.course_id = l.course_id)
        or exists (
          select 1 from course_group_access cga
          join user_group_members gm on gm.group_id = cga.group_id
          where cga.course_id = l.course_id and gm.user_id = auth.uid()
        )
      )
  );
$$;

-- Тапсырмаға жауап жазуға/пікір қалдыруға құқығы бар ма (тегін пайдаланушыға жоқ)
create or replace function public.can_answer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('paid', 'admin'));
$$;

-- Новый пользователь в auth → автоматически профиль с ролью free
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Выдали доступ к курсу → роль paid; забрали последний → обратно free
create or replace function public.sync_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set role = 'paid' where id = new.user_id and role = 'free';
  else
    if not exists (select 1 from enrollments where user_id = old.user_id) then
      update profiles set role = 'free' where id = old.user_id and role = 'paid';
    end if;
  end if;
  return null;
end;
$$;

create trigger enrollments_sync_role
  after insert or delete on public.enrollments
  for each row execute function public.sync_role();

-- Подтверждение оплаты: открывает курс. Вызывает админ (кнопка в админке)
-- или сервер с service_role (будущий webhook Kaspi).
create or replace function public.confirm_payment(p_payment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  pay payments%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select * into pay from payments where id = p_payment for update;
  if not found then raise exception 'payment not found'; end if;
  if pay.status = 'paid' then return; end if;

  update payments set status = 'paid', paid_at = now() where id = p_payment;
  insert into enrollments (user_id, course_id, source)
  values (pay.user_id, pay.course_id, 'payment')
  on conflict (user_id, course_id) do nothing;
end;
$$;

-- ───────── Права и RLS ─────────

alter table public.profiles       enable row level security;
alter table public.courses        enable row level security;
alter table public.lessons        enable row level security;
alter table public.lesson_content enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_answers enable row level security;
alter table public.answer_replies enable row level security;
alter table public.support_messages enable row level security;
alter table public.services       enable row level security;
alter table public.enrollments    enable row level security;
alter table public.payments       enable row level security;
alter table public.site_settings  enable row level security;
alter table public.news           enable row level security;
alter table public.news_reads     enable row level security;
alter table public.schools        enable row level security;
alter table public.employee_roles enable row level security;
alter table public.audit_log      enable row level security;
alter table public.files          enable row level security;
alter table public.user_groups        enable row level security;
alter table public.user_group_members enable row level security;
alter table public.segments           enable row level security;
alter table public.course_group_access enable row level security;
alter table public.reply_templates    enable row level security;
alter table public.broadcasts         enable row level security;
alter table public.pipelines          enable row level security;
alter table public.pipeline_stages    enable row level security;
alter table public.deals              enable row level security;
alter table public.tasks              enable row level security;
alter table public.traffic_sessions   enable row level security;
alter table public.traffic_events     enable row level security;
alter table public.notifications      enable row level security;

create policy user_groups_admin on public.user_groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy user_group_members_admin on public.user_group_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy segments_admin on public.segments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy course_group_access_select on public.course_group_access for select to authenticated using (true);
create policy course_group_access_admin on public.course_group_access for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Курсы, услуги, программа уроков, настройки сайта и жаңалықтар — публичная витрина,
-- её видно и без входа (как у GetCourse). Видео и материалы урока — только
-- по правам can_view_lesson, что для платного урока требует входа.
grant usage on schema public to anon;
grant select on public.courses, public.services, public.lessons, public.lesson_content, public.site_settings, public.news to anon;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
-- Пользователь может менять в профиле имя и телефон (почта и пароль — через auth, роль — никогда)
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy courses_select on public.courses for select to anon, authenticated
  using ((is_published and deleted_at is null) or public.is_admin());
create policy courses_admin on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy services_select on public.services for select to anon, authenticated
  using (is_published or public.is_admin());
create policy services_admin on public.services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy lessons_select on public.lessons for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from courses c where c.id = course_id and c.is_published and c.deleted_at is null and lessons.deleted_at is null));
create policy lessons_admin on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy lesson_content_select on public.lesson_content for select to anon, authenticated
  using (public.can_view_lesson(lesson_id));
create policy lesson_content_admin on public.lesson_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy lesson_progress_write on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id));
create policy lesson_progress_delete on public.lesson_progress for delete to authenticated
  using (user_id = auth.uid());

create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy enrollments_admin on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payments_select on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy payments_insert on public.payments for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy site_settings_select on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_admin on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy site_settings_insert on public.site_settings for insert to authenticated
  with check (public.is_admin());

create policy schools_select on public.schools for select to anon, authenticated using (true);
create policy schools_admin on public.schools for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy employee_roles_admin on public.employee_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy audit_log_admin on public.audit_log for select to authenticated using (public.is_admin());
create policy audit_log_insert on public.audit_log for insert to authenticated with check (public.is_admin());

create policy files_admin on public.files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy news_select on public.news for select to anon, authenticated
  using (is_published or public.is_admin());
create policy news_admin on public.news for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy news_reads_select on public.news_reads for select to authenticated
  using (user_id = auth.uid());
create policy news_reads_insert on public.news_reads for insert to authenticated
  with check (user_id = auth.uid());

create policy lesson_answers_select on public.lesson_answers for select to authenticated
  using (public.can_view_lesson(lesson_id));
create policy lesson_answers_insert on public.lesson_answers for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id) and public.can_answer());
-- «Тексерілді»/мәртебе өрісін тек әкімші өзгерте алады (басқа өрістер — жоқ)
grant update (reviewed, status) on public.lesson_answers to authenticated;
create policy lesson_answers_update on public.lesson_answers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lesson_answers_delete on public.lesson_answers for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy reply_templates_admin on public.reply_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy broadcasts_admin on public.broadcasts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy pipelines_admin on public.pipelines for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pipeline_stages_admin on public.pipeline_stages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy deals_admin on public.deals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tasks_admin on public.tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy traffic_sessions_insert on public.traffic_sessions for insert to anon, authenticated with check (true);
create policy traffic_sessions_admin_select on public.traffic_sessions for select to authenticated using (public.is_admin());
create policy traffic_events_insert on public.traffic_events for insert to anon, authenticated with check (true);
create policy traffic_events_admin_select on public.traffic_events for select to authenticated using (public.is_admin());
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated with check (public.is_admin());

create policy answer_replies_select on public.answer_replies for select to authenticated
  using (exists (select 1 from lesson_answers a where a.id = answer_id and public.can_view_lesson(a.lesson_id)));
create policy answer_replies_insert on public.answer_replies for insert to authenticated
  with check (
    author_id = auth.uid() and public.can_answer()
    and exists (select 1 from lesson_answers a where a.id = answer_id and public.can_view_lesson(a.lesson_id))
  );
create policy answer_replies_delete on public.answer_replies for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Қолдау чаты: оқушы тек өз чатын оқиды/жазады, әкімші кез келген оқушының чатын оқып, жаза алады
create policy support_messages_select on public.support_messages for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (author_id = auth.uid() and (user_id = auth.uid() or public.is_admin()));

grant execute on function public.confirm_payment(uuid) to authenticated;

-- ───────── Первый администратор ─────────
-- 1) Зарегистрируйтесь на платформе со своей почтой
-- 2) Выполните (подставьте свою почту):
--
--   update public.profiles set role = 'admin' where email = 'ВАША_ПОЧТА@gmail.com';
