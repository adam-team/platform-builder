-- Миграция 13: ЭТАП_05 «Лента ответов» — толық мәртебелер жүйесі («reviewed» boolean-нің орнына).
-- reviewed бағанын алып тастамаймыз (ескі сұраулармен үйлесімділік үшін), бірақ енді status негізгі.
alter table public.lesson_answers add column if not exists status text not null default 'pending'
  check (status in ('pending', 'needs_revision', 'accepted', 'no_review_needed'));

update public.lesson_answers set status = 'accepted' where reviewed = true and status = 'pending';

-- Бұрын тек «reviewed» бағанына рұқсат берілген еді (column-level grant) — енді «status» да қосылады
grant update (reviewed, status) on public.lesson_answers to authenticated;

-- Шаблон-жауаптар (⚡ Шаблоны) — оқытушы жиі қолданатын дайын фразалар
create table if not exists public.reply_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.reply_templates enable row level security;
drop policy if exists reply_templates_admin on public.reply_templates;
create policy reply_templates_admin on public.reply_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists reply_templates_select on public.reply_templates;
create policy reply_templates_select on public.reply_templates for select to authenticated using (public.is_admin());
