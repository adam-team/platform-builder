-- Миграция 34: әкімшінің беттерді тікелей өңдеуі (Басты бет / Қызметтер / Тегін сабақтар) + курс мұқабасына өз фото.
-- Ештеңе өшірмейді. Қайта іске қосуға болады (if not exists).

-- 1) Мәтіндер мен батырма сілтемелері (site_settings)
alter table public.site_settings
  add column if not exists hero_btn1_label text, add column if not exists hero_btn1_url text,
  add column if not exists hero_btn2_label text, add column if not exists hero_btn2_url text,
  add column if not exists hero_btn3_label text, add column if not exists hero_btn3_url text,
  add column if not exists goals_eyebrow text, add column if not exists goals_title text, add column if not exists goals_text text,
  add column if not exists goal_link_label text,
  add column if not exists about_eyebrow text, add column if not exists about_title text,
  add column if not exists about_toggle_label text,
  add column if not exists free_home_button_label text,
  add column if not exists news_eyebrow text, add column if not exists news_title text,
  add column if not exists final_cta_url text,
  add column if not exists services_eyebrow text, add column if not exists services_title text, add column if not exists services_text text,
  add column if not exists cases_cta_url text,
  add column if not exists free_materials_url text;

-- 2) Курс мұқабасына өз фото
alter table public.courses add column if not exists card_image_url text;

-- 3) Тегін сабақтар — бөлек кесте (әкімші видео сілтемесін өзгертеді, жаңа сабақ қосады)
create table if not exists public.free_lessons (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  title text not null,
  category text not null default 'debt' check (category in ('debt', 'savings', 'house', 'mortgage_pro')),
  youtube_id text,
  position integer not null default 0,
  show_on_home boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.free_lessons enable row level security;
drop policy if exists free_lessons_read on public.free_lessons;
create policy free_lessons_read on public.free_lessons for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists free_lessons_admin on public.free_lessons;
create policy free_lessons_admin on public.free_lessons for all to authenticated using (public.is_admin()) with check (public.is_admin());
create index if not exists free_lessons_position_idx on public.free_lessons (position);

-- Бар «тегін алдын ала көру» сабақтарын жаңа кестеге бір рет көшіреміз (кесте бос болса ғана)
insert into public.free_lessons (title, category, youtube_id, position, show_on_home)
select x.title, x.category, x.youtube_id, (row_number() over (order by x.category, x.position))::int,
       x.rn = 1 and x.category in ('debt', 'house')
from (
  select l.title, c.category, lc.youtube_id, l.position,
         row_number() over (partition by c.category order by l.position) as rn
  from public.lessons l
  join public.courses c on c.id = l.course_id
  left join public.lesson_content lc on lc.lesson_id = l.id
  where l.is_free_preview and l.deleted_at is null and c.deleted_at is null
) x
where not exists (select 1 from public.free_lessons);
