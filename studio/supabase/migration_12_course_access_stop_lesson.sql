-- Миграция 12: ЭТАП_03 «Доступ» (⭐, «главный механизм» — Продукт → Группа → Курс) +
-- ЭТАП_04 стоп-урок (⭐, «ключевое для проверки ДЗ»). Самые важные куски двух этапов, по просьбе Куралай.

-- Топ арқылы курсқа қолжетімділік: топтың кез келген мүшесі курсты автоматты түрде көреді
create table if not exists public.course_group_access (
  course_id uuid not null references public.courses(id) on delete cascade,
  group_id uuid not null references public.user_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, group_id)
);
alter table public.course_group_access enable row level security;
drop policy if exists course_group_access_select on public.course_group_access;
create policy course_group_access_select on public.course_group_access for select to authenticated using (true);
drop policy if exists course_group_access_admin on public.course_group_access;
create policy course_group_access_admin on public.course_group_access for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- can_view_lesson енді топ арқылы қолжетімділікті де тексереді (тікелей enrollments-тен бөлек)
create or replace function public.can_view_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from lessons l
    where l.id = p_lesson
      and (
        l.is_free_preview
        or exists (select 1 from enrollments e where e.user_id = auth.uid() and e.course_id = l.course_id)
        or exists (
          select 1 from course_group_access cga
          join user_group_members gm on gm.group_id = cga.group_id
          where cga.course_id = l.course_id and gm.user_id = auth.uid()
        )
      )
  );
$$;

-- Стоп-урок: келесі сабақ тапсырма қабылданғанша (reviewed=true) ашылмайды
alter table public.lessons add column if not exists is_stop_lesson boolean not null default false;
