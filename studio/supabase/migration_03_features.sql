-- Миграция 03: списки преимуществ у курсов и услуг (точные тексты из ТЗ).
-- Выполнить в SQL Editor после migration_02_expert.sql. Ничего не удаляет.

alter table public.courses
  add column if not exists features_intro text,
  add column if not exists features jsonb not null default '[]'::jsonb;

alter table public.services
  add column if not exists features_intro text,
  add column if not exists features jsonb not null default '[]'::jsonb;
