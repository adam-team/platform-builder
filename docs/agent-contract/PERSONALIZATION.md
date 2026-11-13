# Карта персонализации: что менять под нового эксперта

Шаблон `studio/` собран как рабочая платформа финансового консультанта (образец) и очищен от личных данных:
телефоны заменены на `7XXXXXXXXXX`, фото и логотипы на заглушки, имя эксперта на `Эксперт Аты-жөні`,
база куратора на три примера. Интерфейс на казахском. Все пути ниже относительно `projects/<id>/site/`.

**КП-страницы и программы курсов в шаблоне (`src/data/offer*.ts`, `src/pages/Offer*.tsx`) это образец именно финансовой ниши**:
программа, тарифы, упоминания банков и застройщиков, формулировки. Для другой ниши их нужно переписать целиком под продукт владельца
(или удалить маршруты из `App.tsx`, если КП-страницы не нужны). Личные факты и цифры образца заменены на `ЗАПОЛНИТЬ`.

## Дизайн (этап 5)

| Что | Где |
|---|---|
| Цвета, радиусы, тени, светлая и тёмная тема | `src/styles.css`, блоки `:root` и `@media (prefers-color-scheme: dark)` |
| Шрифты | `package.json` (пакет `@fontsource/...`), импорты в `src/main.tsx`, переменная `--font` в `styles.css` |
| Шрифты КП-страниц | `src/lib/kpFonts.ts` |
| Логотип | `public/images/brand-logo.png`, `public/images/kp/brand.png`, `brand-light.png` |
| Иконки приложения | `public/icons/icon-192.png`, `icon-512.png`, `public/manifest.webmanifest` |
| Название вкладки и описание | `index.html` |
| Палитра обложек курсов | `COURSE_COLORS` в `src/lib/content.ts`, фоны страниц курса `PAGE_BG_PRESETS` там же |
| Цвет направления (категории) | `CATEGORY` в `src/lib/content.ts`, переменные `--debt`, `--savings`, `--house` в `styles.css` |

## Направления курсов (этап 1, 4)

Шаблон знает четыре направления: `debt`, `savings`, `house`, `mortgage_pro` и два типа услуг `review`, `premium`.
Для другой ниши:

1. Переименовать ключи в `Category` и `ServiceCategory` (`src/lib/types.ts`).
2. Обновить `CATEGORY` и `CATEGORY_ORDER` (`src/lib/content.ts`), подписи и иконки.
3. Обновить проверки `check (category in (...))` в `supabase/schema.sql` (строки с `category`) и в `RUN_ALL_migrations.sql`.
4. Заменить сид-данные: `supabase/migration_02_seed_example.sql`, `src/lib/demo.ts`, `src/lib/defaultModules.ts`.
5. Найти остатки: `grep -rn "'debt'\|'savings'\|'house'\|mortgage_pro" src api supabase`.

Если направлений нужно меньше четырёх, лишние убрать из `CATEGORY_ORDER`, а в схеме оставить (не ломает).

## Структура и меню (этап 2, 3)

| Что | Где |
|---|---|
| Маршруты | `src/App.tsx` |
| Верхнее и нижнее меню, вкладки по ролям | `src/components/Layout.tsx` (нижние вкладки `GUEST_TABS`, `PAID_TABS`, `ADMIN_TABS`, `STAFF_TABS`; верхнее меню `GUEST_TOPNAV`, `PAID_TOPNAV`, `ADMIN_TOPNAV`) |
| Меню админки (разделы и пункты) | `src/pages/admin/adminSections.ts` |
| Роли и подписи ролей | `src/lib/roles.ts`, `src/lib/types.ts` |
| Блоки главной | `src/pages/Home.tsx`, тексты `SiteSettings` в `src/lib/types.ts` |
| Команда-палитра (Cmd+K) | `src/components/CommandPalette.tsx` берёт данные из `adminSections.ts` |

Убрать раздел из админки: удалить объект из `SECTIONS`. Файл компонента можно оставить, импорт убрать, чтобы сборка не ругалась.

## Продукты и оплата (этап 4)

| Что | Где |
|---|---|
| Ссылки WhatsApp, консультации, поддержки | `src/lib/content.ts` (`CONSULTATION_URL`, `SUPPORT_CONTACT_URL`), `checkout.ts`, `checkoutDebt.ts` |
| Ссылка оплаты курса | поле `payment_url` курса, редактируется в админке «Оқыту → Тренингтер» |
| КП-страницы | `src/pages/Offer*.tsx`, `src/data/offer*.ts`, стили `offer.css`, `offer-debt.css`, маршруты в `App.tsx` |
| Письмо «доступ открыт» | `api/_lib/emailTemplates.ts` |
| Резерв в Google Sheets | `api/_lib/sheets.ts`, `docs/google-sheet-apps-script.gs` |

Номера в шаблоне стоят как `7XXXXXXXXXX`. Подставляет владелец, агент номера не выдумывает.

## Тексты (этап 6)

Большая часть текстов главной, «О эксперте», «Услуги», «Бесплатные уроки» редактируется владельцем в админке прямо на странице,
значения хранятся в таблице `site_settings`. Стартовые значения: `src/lib/content.ts`, `src/lib/types.ts` (поля), `supabase/migration_04_about.sql`.
Агент заполняет стартовые значения из `CONTENT.md`, дальше владелец правит сам.

База куратора-бота: `src/data/curatorBase.json` (массив объектов `id, question, questionKz, keywords, keywordsKz, answer, answerKz`).
Скрипт `scripts/build-curator-kb.mjs` собирает базу из Word или Excel владельца.

## Язык интерфейса (этап 1, вопрос A4)

Шаблон на казахском. Если нужен русский или английский:

1. Составь список файлов со строками: `grep -rlE "[әғқңөұүһі]" src api` (казахские буквы).
2. Переводи файл за файлом, `npm run build` после каждого пакета.
3. Не переводить ключи базы, поля БД и значения `role`, `category`, `status`.
4. Письма: `api/_lib/emailTemplates.ts`. Юридические страницы: не переводить, спросить у владельца готовый текст.
5. Фиксируй в `DECISIONS.md`: какие файлы переведены.

Два языка с переключателем это отдельная большая доработка (нужна i18n-прослойка). Предупреди владельца о сроках до начала.

## Что не трогать без причины

- `src/lib/supabase.ts`, `src/lib/auth.tsx`, `src/lib/access.ts`: вход и права.
- Политики RLS в `supabase/*.sql`: от них зависит безопасность данных учеников.
- `api/_lib/adminAuth.ts`, `api/_lib/vault.ts`: проверка админа и шифрование.
- `vercel.json`: заголовки безопасности и cron.

Правки здесь только если без них нельзя, и всегда с записью в `DECISIONS.md`.
