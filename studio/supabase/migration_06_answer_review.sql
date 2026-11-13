-- Миграция 06: «Тексерілді» белгісі у ответов — для «Жауаптар ленасы» в админке
-- (единый список ответов учеников по всем курсам). Выполнить после
-- migration_05_news_assignments_profile.sql.

alter table public.lesson_answers
  add column if not exists reviewed boolean not null default false;

grant update (reviewed) on public.lesson_answers to authenticated;
drop policy if exists lesson_answers_update on public.lesson_answers;
create policy lesson_answers_update on public.lesson_answers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
