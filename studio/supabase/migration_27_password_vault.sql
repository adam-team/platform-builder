-- Әкімші берген / жасаған құпия сөздердің шифрланған көшірмесі (тек серверлік функция оқиды)
create table if not exists public.user_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  password_enc text not null,
  updated_at timestamptz not null default now()
);
alter table public.user_credentials enable row level security;
revoke all on public.user_credentials from anon, authenticated;
grant all on public.user_credentials to service_role;
