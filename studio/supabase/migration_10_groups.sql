-- Миграция 10: топтар (ЭТАП_02, «Ученики → Группы»). Ручные топтар — қатысушыны қолмен қосу/алу.
-- Автоматты топтар (SegmentBuilder шарты бойынша) кейінірек, бұл — негіз.

create table if not exists public.user_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_group_members (
  group_id uuid not null references public.user_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.user_groups        enable row level security;
alter table public.user_group_members enable row level security;

drop policy if exists user_groups_admin on public.user_groups;
create policy user_groups_admin on public.user_groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists user_group_members_admin on public.user_group_members;
create policy user_group_members_admin on public.user_group_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index if not exists user_groups_school_idx on public.user_groups (school_id);
create index if not exists user_group_members_user_idx on public.user_group_members (user_id);
