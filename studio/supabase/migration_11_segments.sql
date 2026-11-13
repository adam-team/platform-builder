-- Миграция 11: сегменттер (ЭТАП_01/02, <SegmentBuilder>). v1 — тек «ЖӘНЕ» логикасы,
-- үш шарт түрі: рөл, тег, курсқа қолжетімділік. ИЛИ/НЕ және басқа өрістер кейін кеңейтіледі.
create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  name text not null,
  entity text not null default 'users',
  conditions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.segments enable row level security;
drop policy if exists segments_admin on public.segments;
create policy segments_admin on public.segments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index if not exists segments_school_idx on public.segments (school_id);

-- QA-түзету (ЭТАП_14 #5): топты өшіру де UndoToast-пен нақты қалпына келуі керек, жалған батырма болмасын
alter table public.user_groups add column if not exists deleted_at timestamptz;
