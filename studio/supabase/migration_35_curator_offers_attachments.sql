-- Миграция 35: 1) «Куратор» рөлі; 2) КП беттерін өңдеу (offer_pages); 3) курсты алу сілтемесі (courses.buy_url);
-- 4) тапсырмаға фото/файл/YouTube тіркеу (жауап пен пікірде).
-- Ештеңе өшірмейді. Қайта іске қосуға болады. migration_34 (free_lessons) іске қосылған болса — жақсы, қосылмаса да бұл файл жұмыс істейді.

-- ───────── 0) migration_34-тегі кестеге құқықтарды нақты беру (егер бұрын берілмеген болса) ─────────
do $$
begin
  if to_regclass('public.free_lessons') is not null then
    grant select on public.free_lessons to anon;
    grant select, insert, update, delete on public.free_lessons to authenticated;
  end if;
end $$;

-- ───────── 1) Куратор рөлі ─────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('free', 'paid', 'curator', 'admin'));

create or replace function public.is_curator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'curator');
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'curator'));
$$;
-- Куратор тек кәдімгі пайдаланушыларды (қонақ/төлеген) басқара алады — әкімшіні және басқа кураторды емес
create or replace function public.is_manageable_user(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_user and role in ('free', 'paid'));
$$;

-- Куратор тапсырмаға жауап/пікір жаза алады
create or replace function public.can_answer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('paid', 'curator', 'admin'));
$$;

-- Барлық сабақты көру: әкімші және куратор (жауаптарды тексеру үшін)
create or replace function public.can_view_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from lessons l
    left join course_modules m on m.id = l.module_id
    where l.id = p_lesson
      and not l.is_locked and (l.opens_at is null or l.opens_at <= now())
      and (m.id is null or (not m.is_locked and (m.opens_at is null or m.opens_at <= now())))
      and (
        l.is_free_preview
        or exists (select 1 from enrollments e where e.user_id = auth.uid() and e.course_id = l.course_id and (e.expires_at is null or e.expires_at > now()))
        or exists (
          select 1 from course_group_access cga
          join user_group_members gm on gm.group_id = cga.group_id
          where cga.course_id = l.course_id and gm.user_id = auth.uid()
        )
      )
  );
$$;

-- Профильдерді көру (аттарын көрсету үшін). Өзгерту құқығы бұрынғыдай — тек өзі; басқаларды серверлік функция арқылы.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

-- Қолжетімділік беру/жабу: куратор тек қонақ/төлеген пайдаланушыларға
drop policy if exists enrollments_curator on public.enrollments;
create policy enrollments_curator on public.enrollments for all to authenticated
  using (public.is_curator() and public.is_manageable_user(user_id))
  with check (public.is_curator() and public.is_manageable_user(user_id));

drop policy if exists enrollment_history_curator on public.enrollment_history;
create policy enrollment_history_curator on public.enrollment_history for select to authenticated
  using (public.is_curator() and public.is_manageable_user(user_id));

create or replace function public.remove_enrollment(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or (public.is_curator() and public.is_manageable_user(p_user))) then
    raise exception 'Рұқсат жоқ';
  end if;
  insert into public.enrollment_history (user_id, course_id, granted_at, expires_at, reason, removed_by)
  select user_id, course_id, created_at, expires_at, 'removed', auth.uid()
  from public.enrollments where user_id = p_user and course_id = p_course;
  delete from public.enrollments where user_id = p_user and course_id = p_course;
end;
$$;
grant execute on function public.remove_enrollment(uuid, uuid) to authenticated;

create or replace function public.admin_user_stats() returns table (user_id uuid, last_sign_in_at timestamptz, email_confirmed_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_staff() then return; end if;
  return query
    select u.id, u.last_sign_in_at, u.email_confirmed_at from auth.users u
    where public.is_admin() or public.is_manageable_user(u.id);
end;
$$;
grant execute on function public.admin_user_stats() to authenticated;

-- Пайдаланушылар кестесіндегі прогресс (тек көру)
drop policy if exists lesson_progress_curator_select on public.lesson_progress;
create policy lesson_progress_curator_select on public.lesson_progress for select to authenticated
  using (public.is_curator() and public.is_manageable_user(user_id));

-- Тапсырма жауаптарын тексеру: әкімші мен куратор
drop policy if exists lesson_answers_update on public.lesson_answers;
create policy lesson_answers_update on public.lesson_answers for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists lesson_answers_delete on public.lesson_answers;
create policy lesson_answers_delete on public.lesson_answers for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Оқушыға хабарландыру (жауап қабылданды / пысықтау керек) — куратор да жібере алады
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check (public.is_staff());
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Дайын жауап шаблондарын куратор да қолдана алады (өзгерту — тек әкімші)
drop policy if exists reply_templates_select on public.reply_templates;
create policy reply_templates_select on public.reply_templates for select to authenticated using (public.is_staff());

-- ───────── 2) КП беттерінің мазмұны (әкімші «Өзгерту» арқылы өңдейді) ─────────
create table if not exists public.offer_pages (
  slug text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.offer_pages enable row level security;
grant select on public.offer_pages to anon;
grant select, insert, update, delete on public.offer_pages to authenticated;
drop policy if exists offer_pages_read on public.offer_pages;
create policy offer_pages_read on public.offer_pages for select to anon, authenticated using (true);
drop policy if exists offer_pages_admin on public.offer_pages;
create policy offer_pages_admin on public.offer_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────── 3) «Курсты алу» батырмасының сілтемесі (бос болса — стандартты: КП беті немесе order_url) ─────────
alter table public.courses add column if not exists buy_url text;

-- ───────── 4) Тапсырмаға тіркемелер ─────────
alter table public.lesson_answers add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.answer_replies add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.answer_replies add column if not exists youtube_id text;

-- Жеке (private) қойма: оқушының фотолары мен куратор жауап файлдары. Жол: <оқушының user_id>/…
insert into storage.buckets (id, name, public) values ('answer-files', 'answer-files', false) on conflict (id) do nothing;
drop policy if exists answer_files_select on storage.objects;
create policy answer_files_select on storage.objects for select to authenticated
  using (bucket_id = 'answer-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
drop policy if exists answer_files_insert on storage.objects;
create policy answer_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'answer-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
drop policy if exists answer_files_delete on storage.objects;
create policy answer_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'answer-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
