# Подготовка окружения на Windows.
#   powershell -ExecutionPolicy Bypass -File scripts/bootstrap-portable.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
function Need($cmd, $hint) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) { Write-Host "ok   $cmd" } else { Write-Host "нет  $cmd : $hint"; $script:missing += $cmd }
}
$missing = @()
Need node "winget install OpenJS.NodeJS.LTS"
Need npm  "идёт вместе с Node.js"
Need git  "winget install Git.Git"
if ($missing.Count -gt 0) { Write-Host "Не хватает: $($missing -join ', '). Поставь и запусти скрипт ещё раз."; exit 1 }
$major = [int](node -p "process.versions.node.split('.')[0]")
if ($major -lt 20) { Write-Host "Нужен Node 20+, сейчас $(node -v)"; exit 1 }
Push-Location "$root\studio"
npm install --no-audit --no-fund
npm run build | Out-Null
Pop-Location
Write-Host "Окружение готово. Дальше: опрос по docs/agent-contract/WORKFLOW.md, этап 1."
