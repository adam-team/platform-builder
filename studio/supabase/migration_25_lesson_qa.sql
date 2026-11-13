-- Сабақ астындағы «Сұрақ-жауап»: оқушылар сұрақ қояды, төлеген клиенттер мен әкімші жауап береді, тек әкімші өшіреді
create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.lesson_question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.lesson_questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.lesson_questions enable row level security;
alter table public.lesson_question_replies enable row level security;
grant select, insert, delete on public.lesson_questions to authenticated;
grant select, insert, delete on public.lesson_question_replies to authenticated;

drop policy if exists lesson_questions_select on public.lesson_questions;
create policy lesson_questions_select on public.lesson_questions for select to authenticated
  using (public.can_view_lesson(lesson_id) and public.can_answer());
drop policy if exists lesson_questions_insert on public.lesson_questions;
create policy lesson_questions_insert on public.lesson_questions for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id) and public.can_answer());
drop policy if exists lesson_questions_delete on public.lesson_questions;
create policy lesson_questions_delete on public.lesson_questions for delete to authenticated
  using (public.is_admin());

drop policy if exists lesson_question_replies_select on public.lesson_question_replies;
create policy lesson_question_replies_select on public.lesson_question_replies for select to authenticated
  using (exists (select 1 from public.lesson_questions q where q.id = question_id and public.can_view_lesson(q.lesson_id)) and public.can_answer());
drop policy if exists lesson_question_replies_insert on public.lesson_question_replies;
create policy lesson_question_replies_insert on public.lesson_question_replies for insert to authenticated
  with check (author_id = auth.uid() and public.can_answer()
    and exists (select 1 from public.lesson_questions q where q.id = question_id and public.can_view_lesson(q.lesson_id)));
drop policy if exists lesson_question_replies_delete on public.lesson_question_replies;
create policy lesson_question_replies_delete on public.lesson_question_replies for delete to authenticated
  using (public.is_admin());
