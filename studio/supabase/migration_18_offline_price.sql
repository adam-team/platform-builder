-- Миграция 18: офлайн формат курса (напр. «Ипотека PRO» — онлайн/офлайн баға).
alter table public.courses add column if not exists offline_price_kzt integer;
