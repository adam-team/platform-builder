# Происхождение и атрибуция

**Platform Builder**: агентский контракт для сборки обучающих платформ. Автор шаблона платформы и этого репозитория: Куралай.

## Заимствованная структура

Формат агентского репозитория (точки входа `CLAUDE.md` и `AGENTS.md`, пошаговый контракт с остановками, файлы-замки этапов,
`START.md`, `SETUP.md`, `CONTEXT.md`, сторож секретов и хук перед коммитом, workflow `secret-scan`) адаптирован из проекта
**Reels Pipeline Automontaj** Александра (@saint4ai), onAI Academy:
https://github.com/saint4ai/reels-pipline-automotaj, лицензия MIT.
Скрипты `scripts/check-secrets.sh`, `scripts/hooks/pre-commit`, `scripts/hooks/install.sh` и `.github/workflows/secret-scan.yml` взяты оттуда с минимальными правками.
`.claude/skills/karpathy-guidelines/SKILL.md` основан на наблюдениях Andrej Karpathy о типичных ошибках LLM при написании кода.

Лицензия MIT требует сохранять уведомление об авторстве во всех копиях и существенных частях. Текст лицензии: `THIRD_PARTY_NOTICES.md`.

## Сторонние компоненты платформы

Зависимости `studio/package.json` (React, Vite, Supabase JS, TipTap, dnd-kit, recharts, date-fns, lucide-react, mammoth, xlsx, fontsource)
распространяются под своими лицензиями. Условия правообладателей остаются в силе.
