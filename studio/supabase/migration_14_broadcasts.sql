-- Миграция 14: ЭТАП_08 «Рассылки» — честный срез. Telegram/WhatsApp/Instagram боттар үшін нақты
-- сыртқы аккаунт керек (мен өзім аша алмаймын) — сол себепті тек email арнасы, SegmentBuilder арқылы
-- таңдалған адамдарға Resend арқылы жіберіледі. Жүрегі бар email-хабарлама, толық конструктор емес.
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);
alter table public.broadcasts enable row level security;
drop policy if exists broadcasts_admin on public.broadcasts;
create policy broadcasts_admin on public.broadcasts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
