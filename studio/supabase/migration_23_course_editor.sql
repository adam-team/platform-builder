-- Курс ішіндегі редактор: модульдер кестесі, ашылу күні, чаттар, Top-30 атауы, сурет жүктеу

-- 1) Модульдер (ертеректе тек lessons.module_title мәтіні болатын)
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null default 0,
  number_label text,
  title text not null,
  subtitle text,
  is_locked boolean not null default false,
  opens_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.course_modules enable row level security;
grant select on public.course_modules to anon, authenticated;
grant insert, update, delete on public.course_modules to authenticated;

drop policy if exists course_modules_select on public.course_modules;
create policy course_modules_select on public.course_modules for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.is_published and c.deleted_at is null));
drop policy if exists course_modules_admin on public.course_modules;
create policy course_modules_admin on public.course_modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) Сабақтар модульге байланады, ашылу күні / жабу
alter table public.lessons
  add column if not exists module_id uuid references public.course_modules(id) on delete set null,
  add column if not exists is_locked boolean not null default false,
  add column if not exists opens_at timestamptz;

-- 3) Бұрынғы module_title топтарынан модуль жолдарын жасау (бір рет)
insert into public.course_modules (course_id, position, number_label, title)
select course_id, row_number() over (partition by course_id order by min(position)), lpad((row_number() over (partition by course_id order by min(position)))::text, 2, '0'), module_title
from public.lessons
where module_title is not null and module_id is null and deleted_at is null
  and not exists (select 1 from public.course_modules cm where cm.course_id = lessons.course_id and cm.title = lessons.module_title)
group by course_id, module_title
;

update public.lessons l set module_id = m.id
from public.course_modules m
where l.module_id is null and l.course_id = m.course_id and l.module_title = m.title;

-- сабақ реті = модуль нөмірі * 100 + сабақ нөмірі
with numbered as (
  select l.id, m.position * 100 + row_number() over (partition by l.module_id order by l.position) as newpos
  from public.lessons l join public.course_modules m on m.id = l.module_id
)
update public.lessons l set position = n.newpos from numbered n where l.id = n.id;

-- 4) Курс: Top-30 атауы және чаттар тізімі
alter table public.courses
  add column if not exists top30_title text,
  add column if not exists chats jsonb not null default '[]'::jsonb;

update public.courses set chats =
  (case when whatsapp_url is not null then jsonb_build_array(jsonb_build_object('title', 'WhatsApp чаты', 'url', whatsapp_url)) else '[]'::jsonb end)
  || (case when telegram_url is not null then jsonb_build_array(jsonb_build_object('title', 'Telegram чаты', 'url', telegram_url)) else '[]'::jsonb end)
where chats = '[]'::jsonb and (whatsapp_url is not null or telegram_url is not null);

-- 5) Жабық / күні әлі келмеген сабақтардың мазмұнын оқушыларға бермеу (нағыз қорғаныс)
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
        or exists (select 1 from enrollments e where e.user_id = auth.uid() and e.course_id = l.course_id)
        or exists (
          select 1 from course_group_access cga
          join user_group_members gm on gm.group_id = cga.group_id
          where cga.course_id = l.course_id and gm.user_id = auth.uid()
        )
      )
  );
$$;

-- 6) Курс суреттері үшін сақтау орны (тек әкімші жүктейді, бәрі көреді)
insert into storage.buckets (id, name, public) values ('course-media', 'course-media', true) on conflict (id) do nothing;
drop policy if exists course_media_read on storage.objects;
create policy course_media_read on storage.objects for select using (bucket_id = 'course-media');
drop policy if exists course_media_insert on storage.objects;
create policy course_media_insert on storage.objects for insert to authenticated with check (bucket_id = 'course-media' and public.is_admin());
drop policy if exists course_media_update on storage.objects;
create policy course_media_update on storage.objects for update to authenticated using (bucket_id = 'course-media' and public.is_admin());
drop policy if exists course_media_delete on storage.objects;
create policy course_media_delete on storage.objects for delete to authenticated using (bucket_id = 'course-media' and public.is_admin());
