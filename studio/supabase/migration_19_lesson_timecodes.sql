-- Жаңа өріс: сабақ бетінде видео тайм-кодтары (басқанда видео сол жерден ашылады)
alter table public.lesson_content add column if not exists timecodes jsonb not null default '[]'::jsonb;

-- Барлық курста бірдей стандарт: сабақтар модульге топтастырылады («Үй аламын» курсындағыдай)
update public.lessons set module_title = '1-модуль. Қазіргі жағдайды талдау' where id = '1eb01048-85a4-499f-a88c-a06272ae09ac';
update public.lessons set module_title = '2-модуль. Қарызды жүйелеу' where id = 'cd46c7da-8e54-4c38-9c64-0bc8af7764f8';
update public.lessons set module_title = '3-модуль. Қарызсыз өмірге жол картасы' where id = 'e6eb5e57-3c8b-4226-a560-f722d6d1ea3e';

update public.lessons set module_title = '1-модуль. Ақша неге жиналмайды' where id = '09c51800-91de-4d94-b25c-ba837849cfc4';
update public.lessons set module_title = '2-модуль. Бюджет жүйесі' where id = 'bc757b16-0942-4725-bf63-1f3d2c03c872';
update public.lessons set module_title = '3-модуль. Жинақ жоспары' where id = 'daacf73b-b748-4a57-9c1a-bd000564bace';

update public.lessons set module_title = '1-модуль. Бағдарламаларды талдау' where id = '29f15caf-bd8d-40ef-8ccf-7fb760c222e1';
update public.lessons set module_title = '2-модуль. Қаржылық жағдайды анықтау' where id = '6a0c95b2-8219-4041-9dff-908fc70d8c87';

-- Материал жоқ сабақтарға болжамды сипаттама қосамыз (видеосыз), сонда олар «құлыпталған» болып көрінбейді.
-- Куралай видео мен материалдарды кейін өзі AdminCourses бетінде толтырады.
insert into public.lesson_content (lesson_id, body, materials, timecodes)
values
  ('b74d1e60-e3eb-49fa-a02a-ef7c2e5cc26a', 'Баспанаға қажет бюджетті есептейміз.', '[]'::jsonb, '[]'::jsonb),
  ('eb1ac4e1-3bd5-4fcc-9cd2-10b9e4c81cbd', 'Алғашқы жарна жоспарын құрамыз.', '[]'::jsonb, '[]'::jsonb),
  ('5b9e3af1-abd0-4a4c-98bd-3fe9df244a7c', 'Төлем қабілеттілігі дегеніміз не — негізгі ұғымдар.', '[]'::jsonb, '[]'::jsonb),
  ('799385cf-7ff1-4543-bac0-21e801a69e24', 'Бұл сабақта банк сіздің табысыңызды, шығындарыңызды және несие тарихыңызды қалай бағалайтынын түсінесіз.', '[]'::jsonb, '[]'::jsonb),
  ('e7f41828-7842-4535-b344-47a47f457d86', 'Ипотекалық калькулятормен жұмыс істеуді үйренеміз.', '[]'::jsonb, '[]'::jsonb),
  ('29f15caf-bd8d-40ef-8ccf-7fb760c222e1', 'Нарықтағы ипотекалық бағдарламаларды салыстырамыз.', '[]'::jsonb, '[]'::jsonb),
  ('6a0c95b2-8219-4041-9dff-908fc70d8c87', 'Клиенттің төлем қабілеттілігін бағалау әдістемесі.', '[]'::jsonb, '[]'::jsonb),
  ('bc757b16-0942-4725-bf63-1f3d2c03c872', 'Жеке бюджет жүйесін енгізу қадамдары.', '[]'::jsonb, '[]'::jsonb),
  ('daacf73b-b748-4a57-9c1a-bd000564bace', 'Ақша жинаудың тұрақты жоспарын құрамыз.', '[]'::jsonb, '[]'::jsonb),
  ('cd46c7da-8e54-4c38-9c64-0bc8af7764f8', 'Қай қарызды бірінші жабу керегін қалай анықтау керек.', '[]'::jsonb, '[]'::jsonb),
  ('e6eb5e57-3c8b-4226-a560-f722d6d1ea3e', 'Қарызсыз өмірге шығудың нақты жол картасы.', '[]'::jsonb, '[]'::jsonb)
on conflict (lesson_id) do update set body = excluded.body;
