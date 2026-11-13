-- Миграция 39: куратор (әкімші сияқты) оқушының тапсырма жауабын және кураторлардың пікірін өшіре алады.

drop policy if exists lesson_answers_delete on public.lesson_answers;
create policy lesson_answers_delete on public.lesson_answers for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists answer_replies_delete on public.answer_replies;
create policy answer_replies_delete on public.answer_replies for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());
