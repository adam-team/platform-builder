-- Пайдаланушылар бөлімі: қолжетімділік мерзімі, «жойылғандар тізімі», соңғы кіру, құпия сөз өзгерген уақыты

alter table public.enrollments add column if not exists expires_at timestamptz;
alter table public.profiles add column if not exists password_changed_at timestamptz;

-- Аяқталған / қолмен жабылған қолжетімділіктердің тарихы (Жойылғандар тізімі)
create table if not exists public.enrollment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  granted_at timestamptz,
  expires_at timestamptz,
  ended_at timestamptz not null default now(),
  reason text not null default 'removed',
  removed_by uuid references public.profiles(id) on delete set null
);
alter table public.enrollment_history enable row level security;
grant select, insert, update, delete on public.enrollment_history to authenticated;
drop policy if exists enrollment_history_admin on public.enrollment_history;
create policy enrollment_history_admin on public.enrollment_history for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Мерзімі өткен қолжетімділікті жабады (тарихқа жазып, жолды өшіреді; рөлді sync_role триггері өзі қайтарады)
create or replace function public.expire_enrollments() returns void
language plpgsql security definer set search_path = public as $$
begin
  with gone as (
    delete from public.enrollments where expires_at is not null and expires_at <= now()
    returning user_id, course_id, created_at, expires_at
  )
  insert into public.enrollment_history (user_id, course_id, granted_at, expires_at, reason)
  select user_id, course_id, created_at, expires_at, 'expired' from gone;
end;
$$;
grant execute on function public.expire_enrollments() to authenticated;

-- Әкімші курсқа қолжетімділікті қолмен жабады
create or replace function public.remove_enrollment(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Тек әкімші'; end if;
  insert into public.enrollment_history (user_id, course_id, granted_at, expires_at, reason, removed_by)
  select user_id, course_id, created_at, expires_at, 'removed', auth.uid()
  from public.enrollments where user_id = p_user and course_id = p_course;
  delete from public.enrollments where user_id = p_user and course_id = p_course;
end;
$$;
grant execute on function public.remove_enrollment(uuid, uuid) to authenticated;

-- Әкімшіге: соңғы кіру және пошта расталғаны (auth.users деректері)
create or replace function public.admin_user_stats() returns table (user_id uuid, last_sign_in_at timestamptz, email_confirmed_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then return; end if;
  return query select u.id, u.last_sign_in_at, u.email_confirmed_at from auth.users u;
end;
$$;
grant execute on function public.admin_user_stats() to authenticated;

-- Пайдаланушы өз құпия сөзін өзгертсе — әкімшіге көрінетін белгі
create or replace function public.note_password_changed() returns void
language sql security definer set search_path = public as $$
  update public.profiles set password_changed_at = now() where id = auth.uid();
$$;
grant execute on function public.note_password_changed() to authenticated;

-- Мерзімі өткен қолжетімділік клиентке бірден көрінбейді
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select to authenticated
  using ((user_id = auth.uid() and (expires_at is null or expires_at > now())) or public.is_admin());

create or replace function public.can_view_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
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
