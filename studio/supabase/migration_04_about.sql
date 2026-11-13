-- Миграция 04: блок «Эксперт туралы» — короткое вступление всегда видно,
-- список фактов и история — под кнопкой «Толығырақ» (сворачиваемый блок из ТЗ).
-- Выполнить после migration_03_features.sql. Ничего не удаляет.

alter table public.site_settings
  add column if not exists about_more_list jsonb not null default '[]'::jsonb,
  add column if not exists about_more_text text;
