# Установка окружения

Выполняет агент, не владелец. Одна команда:

```bash
bash scripts/bootstrap-portable.sh        # Mac и Linux
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-portable.ps1   # Windows
```

Скрипт проверяет и ставит недостающее:

1. **Node.js 20+** и **npm**. Нет: Mac через Homebrew (`brew install node`), Windows через `winget install OpenJS.NodeJS.LTS`.
2. **git**.
3. Зависимости чистого шаблона: `npm install` в `studio/` (нужны для проверки сборки и демо-режима).
4. Проверка сборки шаблона: `npm run build` в `studio/`.
5. Проверка сторожа секретов: `bash scripts/check-secrets.sh`.

## Проверка, что всё готово

```bash
cd studio && npm run build      # должно закончиться "built in ..."
```

Демо без базы (по желанию, чтобы показать владельцу, как выглядит шаблон):

```bash
cd studio && VITE_DEMO=1 npm run dev     # сайт на http://localhost:5173
```

Демо-логины и данные вымышленные, лежат в `studio/src/lib/demo.ts`.

## Сервисы (потом, этап 7)

Ставить ничего не нужно, нужны аккаунты: GitHub, Supabase, Vercel, Resend. Агент ведёт по шагам, владелец создаёт аккаунты сам.
Файл окружения: `projects/<id>/site/.env.local` (в git не попадает). Образец: `studio/.env.example`.

## Когда готово

Сразу переходи к опросу: `docs/agent-contract/WORKFLOW.md`, этап 1. Владельцу напиши одной строкой, что окружение готово.
