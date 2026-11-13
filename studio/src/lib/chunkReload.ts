// Vercel-де жаңа нұсқа шыққанда ашық тұрған беттегі ескі JS-файлдар жойылады, ал «лениво» жүктелетін
// беттер (React.lazy) сол ескі файлдарды сұрайды → «Failed to fetch dynamically imported module».
// Шешім: бір рет автоматты түрде бетті қайта жүктеу (қайталанбауы үшін sessionStorage белгісі бар).
const KEY = 'chunk-reload-at'

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Loading chunk [\w-]+ failed|Loading CSS chunk/i.test(msg)
}

// true — бетті қайта жүктеуді бастадық; false — жақында жүктегенбіз (шексіз циклден қорғаныс)
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch { /* sessionStorage жоқ — бәрібір бір рет жүктеп көреміз */ }
  window.location.reload()
  return true
}
