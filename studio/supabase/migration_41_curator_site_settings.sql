-- Миграция 41: куратор «Профиль» бетінде өзінің байланыс мәліметін (аты, сілтемесі) өзгерте алсын.
-- site_settings бір ғана жол — сондықтан жазу құқығы бүкіл кестеге ортақ (әкімшіге ғана емес, кураторға да).
drop policy if exists site_settings_admin on public.site_settings;
create policy site_settings_admin on public.site_settings for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists site_settings_insert on public.site_settings;
create policy site_settings_insert on public.site_settings for insert to authenticated
  with check (public.is_staff());
