#!/usr/bin/env bash
# Ищет в собранной платформе остатки образца: заглушки номеров, имя-заглушку, плейсхолдеры.
#   bash scripts/check-leftovers.sh projects/<id>/site
# Выход 0: чисто. Выход 1: найдено, список показан. Остатки допустимы только если владелец оставил их сознательно (DECISIONS.md).
set -uo pipefail
DIR="${1:?укажи папку сайта: projects/<id>/site}"
[[ -d "$DIR" ]] || { echo "нет папки $DIR" >&2; exit 2; }
PAT='7XXXXXXXXXX|Эксперт Аты-жөні|Бренд атауы|ВАША_ПОЧТА|ЗАПОЛНИТЬ|ФОТО ЭКСПЕРТА|ВАШ ЛОГОТИП|СКРИН ОПЛАТЫ'
hits=$(grep -rnIE "$PAT" "$DIR" --exclude-dir=node_modules --exclude-dir=dist --exclude=package-lock.json 2>/dev/null | cut -c1-160 || true)
if [[ -n "$hits" ]]; then
  echo "Остатки образца и заглушки:"; echo "$hits" | head -60
  echo; echo "Всего строк: $(echo "$hits" | wc -l | tr -d ' '). Заменить или записать в DECISIONS.md, почему оставлено."
  exit 1
fi
echo "остатков образца не найдено"
