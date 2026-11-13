-- Миграция 40: пайдаланушыны «толық жою» (кіру мүмкіндігін тоқтату, құпия сөзді өшіру, барлық
-- курс қолжетімділігін жабу) — бірақ профиль өзі қалады, сондықтан кейін «Қалпына келтіру» арқылы
-- қайта кіргізуге болады. Нақты Auth есептік жазбасын өшірмейді (ban_duration арқылы бұғаттайды).
alter table public.profiles add column if not exists deactivated_at timestamptz;
create index if not exists profiles_deactivated_idx on public.profiles (deactivated_at) where deactivated_at is not null;
