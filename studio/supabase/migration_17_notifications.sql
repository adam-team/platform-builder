-- Миграция 17: ЭТАП_12 «Панель уведомлений» — честный срез: нақты, жеке хабарландырулар кестесі
-- (толық матрица — оқиға түрлері × арналар (email/Telegram/push) — жоқ, ол бөлек үлкен жұмыс,
-- Telegram боты/push инфрақұрылымы керек). Қазір: тапсырма қабылданды/пысықтауға қайтарылды.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check (public.is_admin());

create index if not exists notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
