import { isDemo, supabase } from './supabase'

// Google-кестеге автоматты сақтық көшірме: батырма басудың орнына, әкімші контентті өзгерткен сайын
// фондық сұраныс жіберіледі (нәтижесін күтпейміз, интерфейсті бөгемейді). Бір минут ішінде бірнеше
// өзгеріс болса — бәрі бір ғана сұранысқа жиналады (debounce), сервердегі толық көшірмені артық жүктемеу үшін.
const MIN_GAP_MS = 60_000
let pending: ReturnType<typeof setTimeout> | null = null
let lastRun = 0

async function runBackup() {
  lastRun = Date.now()
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return
    await fetch('/api/admin-sync-user', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ all: true }) })
  } catch { /* фондық сақтық көшірме — қатесі интерфейске шықпайды, келесі әрекетте қайта көрінеді */ }
}

// Курс, сабақ, жаңалық, қызмет, төлем, тапсырма — контентке қатысты кез келген сақтаудан/өшіруден кейін шақырылады
export function scheduleBackup() {
  if (isDemo) return
  if (pending) return
  const wait = Math.max(2_000, MIN_GAP_MS - (Date.now() - lastRun))
  pending = setTimeout(() => { pending = null; runBackup() }, wait)
}
