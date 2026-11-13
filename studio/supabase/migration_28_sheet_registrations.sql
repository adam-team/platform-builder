-- Жаңа тіркелген адамдар (қонақтар) Google кестеге автоматты түседі. Vercel құлап қалса да жұмыс істейді.
-- ↓ ОСЫ ЕКІ МӘНДІ АУЫСТЫРЫҢЫЗ: Apps Script «Web app URL» және сол SECRET
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_sheet_new_profile() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text := 'МЫНА_ЖЕРГЕ_WEB_APP_URL';
  v_secret text := 'МЫНА_ЖЕРГЕ_SECRET';
begin
  begin
    perform net.http_post(
      url := v_url,
      headers := '{"Content-Type": "text/plain;charset=utf-8"}'::jsonb,
      body := jsonb_build_object(
        'secret', v_secret,
        'action', 'upsert',
        'rows', jsonb_build_array(jsonb_build_object(
          'Пошта (логин)', new.email,
          'Аты-жөні', coalesce(new.full_name, ''),
          'Телефон', coalesce(new.phone, ''),
          'Түрі', case new.role when 'admin' then 'Әкімші' when 'paid' then 'Төлеген' else 'Қонақ (тегін)' end,
          'Тіркелген күні', to_char(new.created_at at time zone 'Asia/Almaty', 'DD.MM.YYYY HH24:MI')
        ))
      )
    );
  exception when others then
    null; -- кесте қолжетімсіз болса да тіркелу тоқтамайды
  end;
  return new;
end;
$$;

drop trigger if exists profiles_notify_sheet on public.profiles;
create trigger profiles_notify_sheet after insert on public.profiles
  for each row execute function public.notify_sheet_new_profile();
