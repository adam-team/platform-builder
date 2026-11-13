-- Миграция 05: жаңалықтар (news), тапсырмаға жауап/пікір (lesson_answers, answer_replies),
-- профильде телефон (phone). Выполнить после migration_04_about.sql. Ничего не удаляет.

alter table public.profiles
  add column if not exists phone text;

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.news_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  news_id uuid not null references public.news(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, news_id)
);

alter table public.lesson_content
  add column if not exists assignment_text text;

create table if not exists public.lesson_answers (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.answer_replies (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.lesson_answers(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists news_created_at_idx on public.news (created_at desc);
create index if not exists news_reads_user_id_idx on public.news_reads (user_id);
create index if not exists lesson_answers_lesson_id_idx on public.lesson_answers (lesson_id);
create index if not exists answer_replies_answer_id_idx on public.answer_replies (answer_id);

create or replace function public.can_answer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('paid', 'admin'));
$$;

alter table public.news           enable row level security;
alter table public.news_reads     enable row level security;
alter table public.lesson_answers enable row level security;
alter table public.answer_replies enable row level security;

grant usage on schema public to anon;
grant select on public.news to anon;

-- Пользователь теперь может обновлять ещё и телефон (почта/пароль — через auth)
grant update (phone) on public.profiles to authenticated;

drop policy if exists news_select on public.news;
create policy news_select on public.news for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists news_admin on public.news;
create policy news_admin on public.news for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists news_reads_select on public.news_reads;
create policy news_reads_select on public.news_reads for select to authenticated
  using (user_id = auth.uid());
drop policy if exists news_reads_insert on public.news_reads;
create policy news_reads_insert on public.news_reads for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists lesson_answers_select on public.lesson_answers;
create policy lesson_answers_select on public.lesson_answers for select to authenticated
  using (public.can_view_lesson(lesson_id));
drop policy if exists lesson_answers_insert on public.lesson_answers;
create policy lesson_answers_insert on public.lesson_answers for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id) and public.can_answer());
drop policy if exists lesson_answers_delete on public.lesson_answers;
create policy lesson_answers_delete on public.lesson_answers for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists answer_replies_select on public.answer_replies;
create policy answer_replies_select on public.answer_replies for select to authenticated
  using (exists (select 1 from lesson_answers a where a.id = answer_id and public.can_view_lesson(a.lesson_id)));
drop policy if exists answer_replies_insert on public.answer_replies;
create policy answer_replies_insert on public.answer_replies for insert to authenticated
  with check (
    author_id = auth.uid() and public.can_answer()
    and exists (select 1 from lesson_answers a where a.id = answer_id and public.can_view_lesson(a.lesson_id))
  );
drop policy if exists answer_replies_delete on public.answer_replies;
create policy answer_replies_delete on public.answer_replies for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());
