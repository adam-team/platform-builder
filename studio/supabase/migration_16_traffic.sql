-- Миграция 16: ЭТАП_11 «Трафик» — тек негізгі трекинг (беттерге кіру, UTM, тіркелу/төлем оқиғалары)
-- + жалпы шолу есебі. Толық көп өлшемді есептер, когорталар, ROI, сессия таймлайны — жоқ, честно.
-- Вебинарлар мүлдем жасалмады — Zoom OAuth/трансляция инфрақұрылымы керек, Марджан платформасында
-- қазір вебинар мүлдем жоқ функция (ешбір бұрынғы сұрауда айтылмаған).

create table if not exists public.traffic_sessions (
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

create table if not exists public.traffic_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.traffic_sessions(id) on delete cascade,
  event_type text not null check (event_type in ('pageview', 'register', 'order', 'payment')),
  path text,
  created_at timestamptz not null default now()
);

alter table public.traffic_sessions enable row level security;
alter table public.traffic_events   enable row level security;

-- Анонимды келушілер де жаза алуы керек (кірмеген күйде де трекинг жұмыс істейді)
drop policy if exists traffic_sessions_insert on public.traffic_sessions;
create policy traffic_sessions_insert on public.traffic_sessions for insert to anon, authenticated with check (true);
drop policy if exists traffic_sessions_admin_select on public.traffic_sessions;
create policy traffic_sessions_admin_select on public.traffic_sessions for select to authenticated using (public.is_admin());

drop policy if exists traffic_events_insert on public.traffic_events;
create policy traffic_events_insert on public.traffic_events for insert to anon, authenticated with check (true);
drop policy if exists traffic_events_admin_select on public.traffic_events;
create policy traffic_events_admin_select on public.traffic_events for select to authenticated using (public.is_admin());

create index if not exists traffic_sessions_created_idx on public.traffic_sessions (created_at desc);
create index if not exists traffic_events_session_idx on public.traffic_events (session_id);
