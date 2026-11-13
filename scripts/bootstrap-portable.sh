#!/usr/bin/env bash
# Подготовка окружения на новой машине (macOS / Linux / WSL).
#   bash scripts/bootstrap-portable.sh
# Проверяет Node 20+, npm, git; ставит зависимости шаблона studio/ и проверяет, что он собирается; ставит сторож секретов.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

missing=()
check() { command -v "$1" >/dev/null 2>&1 && echo "ok   $1" || { echo "нет  $1: $2"; missing+=("$1"); }; }
check node "нужен Node.js 20 или новее (Mac: brew install node)"
check npm  "идёт вместе с Node.js"
check git  "нужен для хранения кода и выкладки"
check python3 "нужен для сторожа чтения файлов (хук Claude Code)"
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [[ "$major" -ge 20 ]] || { echo "нет  node >= 20: сейчас $(node -v)"; missing+=("node20"); }
fi
if [[ ${#missing[@]} -gt 0 ]]; then
  echo; echo "Не хватает: ${missing[*]}. Поставь недостающее и запусти скрипт ещё раз."; exit 1
fi

if [[ -d "$root/.git" ]]; then bash "$root/scripts/hooks/install.sh"; fi

echo "Ставлю зависимости шаблона (1-3 минуты)..."
( cd "$root/studio" && npm install --no-audit --no-fund )
echo "Проверяю сборку шаблона..."
( cd "$root/studio" && npm run build >/dev/null )
echo "Сборка шаблона проходит."

bash "$root/scripts/check-secrets.sh" || true
echo; echo "Окружение готово. Дальше: опрос по docs/agent-contract/WORKFLOW.md, этап 1."
