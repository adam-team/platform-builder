-- «Профиль» бетіндегі «Куратормен байланысу» және «Қолдау және шығу» блоктары: бір ғана жалпы
-- куратор мен байланыс сілтемелері (әр курста бөлек емес) — олар site_settings кестесінде сақталады
-- және «Профиль» бетінде әкімші тікелей өзгерте алады.
alter table public.site_settings add column if not exists curator_name text;
alter table public.site_settings add column if not exists curator_hours text;
alter table public.site_settings add column if not exists curator_contact_url text;
alter table public.site_settings add column if not exists support_contact_url text;
alter table public.site_settings add column if not exists legal_agreement_url text;
