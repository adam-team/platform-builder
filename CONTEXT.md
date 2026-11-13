# Контекст: что здесь и как работать

## Что в репозитории

Готовая обучающая платформа (`studio/`) плюс контракт, по которому агент собирает из неё платформу под конкретного эксперта.
Агент опрашивает владельца по этапам, записывает ответы в файлы проекта и меняет копию шаблона в `projects/<id>/site/`.

## Порядок работы

0. Окружение и модель → 1. Эксперт и ниша ⏸ → 2. Структура и меню ⏸ → 3. Роли ⏸ → 4. Продукты и оплата ⏸ →
5. Дизайн ⏸ → 6. Контент ⏸ → 7. Сервисы ⏸ → 8. Сборка → 9. Проверки и выкладка ⏸.
Полный контракт: `docs/agent-contract/WORKFLOW.md`.

## Команды

| Команда | Что делает |
|---|---|
| `/platform` | запускает или продолжает опрос по этапам |
| `bash scripts/bootstrap-portable.sh` | ставит окружение и проверяет сборку шаблона |
| `bash scripts/new-project.sh <id>` | создаёт `projects/<id>/` с копией шаблона и заготовками документов |
| `bash scripts/check-secrets.sh` | ищет ключи и запрещённые файлы в дереве git |
| `bash scripts/check-leftovers.sh projects/<id>/site` | ищет в сборке остатки образца: `7XXXXXXXXXX`, `Эксперт Аты-жөні`, заглушки |
| `python3 scripts/design-tokens.py <номер> [--kk]` | печатает переменные `:root`, пакеты и импорты шрифтов выбранного дизайна |
| `python3 scripts/extract-design.py <файл или ссылка>` | вариант «свой дизайн»: цвета и шрифты из PDF, картинки, сайта |
| `cd projects/<id>/site && npm run build` | сборка платформы |
| `cd projects/<id>/site && VITE_DEMO=1 npm run dev` | демо без базы на localhost:5173 |

## Где что лежит

| Что | Где |
|---|---|
| Чистый шаблон платформы, не править | `studio/` |
| Платформа конкретного ученика | `projects/<id>/site/` |
| Ответы владельца по этапам | `projects/<id>/BRIEF.md`, `STRUCTURE.md`, `DESIGN.md`, `CONTENT.md`, `INTEGRATIONS.md`, `DECISIONS.md` |
| Заготовки этих файлов | `projects/_template/` |
| Контракт этапов | `docs/agent-contract/WORKFLOW.md` |
| Банк вопросов с вариантами | `docs/agent-contract/QUESTIONS.md` |
| Карта «что менять под эксперта» | `docs/agent-contract/PERSONALIZATION.md` |
| Каталог дизайнов и шрифтов, порядок применения | `patterns/README.md`, `patterns/CATALOG.md`, `patterns/FONTS.md` |
| Картинки для выбора | `reference/style-previews/` (`structure.jpg`, `designs-A…E.jpg`, `fonts-1…4.jpg`) |
| Принципы и разборы | `knowledge/` |
| Навыки и команда агента | `.claude/skills/`, `.claude/commands/platform.md` |
| Описание платформы и SQL | `studio/README.md`, `studio/supabase/` |

## Стек шаблона

React 19, TypeScript, Vite 8, React Router 7, Supabase (Postgres, Auth, RLS, Storage, RPC), serverless-функции Vercel в `api/`
и cron, письма через Resend, резерв в Google Sheets через Apps Script, PWA, видео YouTube и Kinescope, редактор TipTap,
перетаскивание dnd-kit. Роли: free, paid, curator, admin.

## Правила

- `studio/` не правится. Работаем в `projects/<id>/site/`.
- Нет `BRIEF.md`, `STRUCTURE.md`, `DESIGN.md`: код не меняем.
- После каждого шага сборки `npm run build`. Упало: чиним, дальше не идём.
- Секреты только в `.env.local` и в настройках Vercel. В git их нет.
- Не выдумывать цены, номера, имена, отзывы, цифры результатов.
- Правки хирургические: только то, что просит этап. Работающее не ломаем и не «улучшаем заодно».

## Экономия подписки

| Делай | Не делай |
|---|---|
| Один этап за раз | «Сделай всё сразу» |
| Читать файл через `grep` или кусками, если он большой | Читать целиком `RUN_ALL_migrations.sql`, `curatorBase.json`, `demo.ts` |
| Тексты пакетом | Править одну фразу отдельным запросом |
| Проверять сборку после шага | Копить правки на десять шагов и потом искать, что сломалось |
