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
