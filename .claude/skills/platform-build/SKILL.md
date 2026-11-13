---
name: platform-build
description: Use when building or editing a student's platform in projects/<id>/site/ after BRIEF.md, STRUCTURE.md and DESIGN.md are filled: apply design tokens, directions, menus, roles, texts, SQL and checks to the studio/ template. Also for any edit of the platform code (React, Supabase SQL, Vercel api/).
---

# Сборка платформы из шаблона

Карта «что где менять»: `docs/agent-contract/PERSONALIZATION.md`. Читать до первой правки кода.

## Порядок

1. Дизайн: `:root` в `src/styles.css`, шрифты в `src/main.tsx` и `package.json`, логотип и иконки в `public/`, `index.html`.
2. Направления, роли, меню: `src/lib/types.ts`, `src/lib/content.ts`, `src/components/Layout.tsx`, `src/App.tsx`, `src/pages/admin/adminSections.ts`.
3. База: `supabase/schema.sql` и `RUN_ALL_migrations.sql` под ниши и сиды. Новая миграция отдельным файлом `migration_42_*.sql`, старые не переписывать.
4. Тексты: `src/lib/content.ts`, `defaultModules.ts`, `demo.ts`, КП-страницы.
5. Язык интерфейса, если не казахский: отдельный проход, пакетами, сборка после каждого.
6. Проверки: `npm run build`, `VITE_DEMO=1 npm run dev` и скриншоты, `bash scripts/check-secrets.sh`, `bash scripts/check-leftovers.sh projects/<id>/site`.

## Правила

- `studio/` не править. Работаем только в `projects/<id>/site/`.
- Хирургические правки: меняем то, что просит этап. Работающее не удаляем и не «улучшаем заодно».
- Не трогать без причины: `src/lib/supabase.ts`, `auth.tsx`, `access.ts`, политики RLS, `api/_lib/adminAuth.ts`, `vault.ts`, `vercel.json`. Правка здесь = запись в `DECISIONS.md`.
- После каждого шага `npm run build`. Упало: чиним, дальше не идём.
- Большие файлы (`RUN_ALL_migrations.sql`, `curatorBase.json`, `demo.ts`) не читать целиком: `grep -n` и `sed -n 'A,Bp'`.
- Секреты только в `.env.local` и настройках Vercel. Никаких ключей в коде, коммитах и чате.
- Не выдумывать цены, номера, имена, отзывы. Нет данных: `ЗАПОЛНИТЬ`, и пункт в `DECISIONS.md`.
