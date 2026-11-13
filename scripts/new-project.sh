#!/usr/bin/env bash
# Новый проект платформы: копия чистого шаблона studio/ и заготовки документов этапов.
#   bash scripts/new-project.sh <id>
# id: латиница, цифры, дефис (например anna-english). Повторный запуск ничего не затирает.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ID="${1:?укажи id проекта: латиница, цифры, дефис}"
[[ "$ID" =~ ^[a-zA-Z0-9-]+$ ]] || { echo "id только из латиницы, цифр и дефиса: $ID" >&2; exit 2; }
[[ "$ID" != "_template" ]] || { echo "это имя занято под заготовку" >&2; exit 2; }

P="$ROOT/projects/$ID"
mkdir -p "$P"
for f in BRIEF.md STRUCTURE.md DESIGN.md CONTENT.md INTEGRATIONS.md DECISIONS.md; do
  [[ -f "$P/$f" ]] || sed "s/{{ID}}/$ID/g" "$ROOT/projects/_template/$f" > "$P/$f"
done

if [[ ! -d "$P/site" ]]; then
  mkdir -p "$P/site"
  rsync -a --exclude node_modules --exclude dist --exclude tsconfig.tsbuildinfo --exclude .env.local "$ROOT/studio/" "$P/site/"
  echo "копия шаблона: projects/$ID/site/"
else
  echo "projects/$ID/site уже есть, не трогаю"
fi
echo "готово: projects/$ID/  (дальше этап 1: BRIEF.md)"
