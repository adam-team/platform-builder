---
name: platform-workflow
description: Use at the start of every new learning-platform project in this repository (new platform, "собери платформу", "обучающая платформа", "школа онлайн", "кабинет ученика", «новый проект»). Runs the staged questionnaire one question at a time (expert and niche, structure and menus, roles, products and prices, design picker, content, services), writes BRIEF/STRUCTURE/DESIGN/CONTENT files, and only then builds the site from studio/.
---

# Этапы сборки платформы

Полный порядок: `docs/agent-contract/WORKFLOW.md`. Прочитать его перед первым вопросом владельцу. Банк вопросов: `docs/agent-contract/QUESTIONS.md`.

1. **Модель и окружение.** Opus, усилие не ниже high; Codex `gpt-5.6-sol` xhigh. `bash scripts/bootstrap-portable.sh`.
2. **Эксперт и ниша** ⏸: кто, чему учит, для кого, язык, название. Файл `BRIEF.md`.
3. **Структура** ⏸: картинка `reference/style-previews/structure.jpg`, страницы, меню сайта, меню кабинета, меню админки. Файл `STRUCTURE.md`.
4. **Роли** ⏸: гость, оплативший, куратор, админ; задания, чаты, календарь. Дополняет `STRUCTURE.md`.
5. **Продукты** ⏸: курсы, цены, оплата, КП-страницы. Таблица в `BRIEF.md`.
6. **Дизайн** ⏸: картинка `reference/style-previews/designs.jpg`, номер 1-8 или свой, шрифты, логотип. Файл `DESIGN.md`.
7. **Контент** ⏸: герой, об эксперте, курсы, уроки, видео, база куратора. Файл `CONTENT.md`.
8. **Сервисы** ⏸: Supabase, Vercel, Resend, Google Sheets. Файл `INTEGRATIONS.md`, без секретов.
9. **Сборка** по навыку `platform-build` в `projects/<id>/site/`, затем проверки и выкладка ⏸.

Один вопрос за раз, с вариантами. После ответа «Понял так: … Верно?». Не начинать сборку без `BRIEF.md`, `STRUCTURE.md`, `DESIGN.md`.
Не выдумывать цены, номера, имена и цифры. Ничего не ставить владельцу в терминал: ставит агент. Пароли и ключи он вводит сам.
