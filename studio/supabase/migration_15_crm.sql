-- Миграция 15: ЭТАП_09 CRM — честный срез. «Процессы» (автоматизация: триггер → пауза N сағат →
-- әрекет) нақты queue/cron инфрақұрылымын талап етеді (Vercel serverless функциялары stateless,
-- «24 сағаттан кейін жалғастыру» істей алмайды) — оны жасамадым, бұл ойдан шығарылған болар еді.
-- Жасалғаны: Канбан доска (сделки) + тапсырмалар тізімі — нақты, өз бетінше жұмыс істейтін бөлік.

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  color text not null default '#64748B',
  stage_type text not null default 'normal' check (stage_type in ('normal', 'success', 'fail')),
  position integer not null default 0,
  unique (pipeline_id, name)
);

create table if not exists public.deals (
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

create table if not exists public.tasks (
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

alter table public.pipelines       enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals           enable row level security;
alter table public.tasks           enable row level security;

drop policy if exists pipelines_admin on public.pipelines;
create policy pipelines_admin on public.pipelines for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists pipeline_stages_admin on public.pipeline_stages;
create policy pipeline_stages_admin on public.pipeline_stages for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists deals_admin on public.deals;
create policy deals_admin on public.deals for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists tasks_admin on public.tasks;
create policy tasks_admin on public.tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Әдепкі доска — GetCourse-тегі стандартты кезеңдер
insert into public.pipelines (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'Сатылым') on conflict (id) do nothing;
insert into public.pipeline_stages (pipeline_id, name, color, stage_type, position) values
  ('00000000-0000-0000-0000-0000000000d1', 'Жаңа', '#64748B', 'normal', 1),
  ('00000000-0000-0000-0000-0000000000d1', 'Байланысқа шықты', '#3B6FE0', 'normal', 2),
  ('00000000-0000-0000-0000-0000000000d1', 'Ойланып жатыр', '#B8860B', 'normal', 3),
  ('00000000-0000-0000-0000-0000000000d1', 'Төлем күтуде', '#E3AE3A', 'normal', 4),
  ('00000000-0000-0000-0000-0000000000d1', 'Төленді', '#16A34A', 'success', 5),
  ('00000000-0000-0000-0000-0000000000d1', 'Бас тартты', '#DC2626', 'fail', 6)
on conflict (pipeline_id, name) do nothing;

create index if not exists deals_stage_idx on public.deals (stage_id);
create index if not exists tasks_manager_idx on public.tasks (manager_id, status);
