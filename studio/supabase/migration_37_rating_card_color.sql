-- Миграция 37: «ТОП-30» (рейтинг) картасының тақырып жазуының түсі бөлек басқарылады —
-- бос болса, бұрынғыдай алтын түсті болып қалады.
alter table public.courses add column if not exists rating_ink text;
