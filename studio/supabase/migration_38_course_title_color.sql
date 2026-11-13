-- Миграция 38: курс тақырыбының (фото жоқ болғандағы жасыл жолақ) түсі модуль/батырма түсінен бөлек басқарылады.
alter table public.courses add column if not exists title_color text;
