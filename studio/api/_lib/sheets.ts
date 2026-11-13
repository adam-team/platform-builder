import type { SupabaseClient } from '@supabase/supabase-js'
import { readAllPasswords } from './vault.js'

// Google Sheets-ке (Apps Script веб-қосымшасы арқылы) толық көшірме — Supabase құлап қалса немесе ұйықтап қалса,
// барлық деректер (пайдаланушылар, курстар, сабақтар, жаңалықтар, қызметтер, төлемдер, тапсырмалар) кестеде тұрады.
// Әр «сущность» — кестенің бөлек парағы (табы). URL мен құпия сөз — тек Vercel айнымалыларында.

type Row = Record<string, string>
type SheetDef = { sheet: string; headers: string[]; rows: Row[] }

const ROLE: Record<string, string> = { free: 'Қонақ (тегін)', paid: 'Төлеген', curator: 'Куратор', admin: 'Әкімші' }
const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const STATUS: Record<string, string> = { pending: 'Тексеру керек', needs_revision: 'Пысықтауда', accepted: 'Қабылданды', no_review_needed: 'Тексеру қажет емес' }

export function sheetConfigured() {
  return !!process.env.GOOGLE_SHEET_WEBHOOK_URL && !!process.env.GOOGLE_SHEET_SECRET
}

const CALL_TIMEOUT_MS = 15_000

async function post(body: { action: 'upsert' | 'replaceAll'; sheet: string; headers: string[]; rows: Row[] }): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL
  const secret = process.env.GOOGLE_SHEET_SECRET
  if (!url || !secret) return { ok: false, error: 'Google кесте бапталмаған (GOOGLE_SHEET_WEBHOOK_URL / GOOGLE_SHEET_SECRET жоқ)' }
  const controller = new AbortController()
  // Apps Script ілініп қалса (LockService, суық старт) — бір парақ бәрін 2 минутқа созбасын: 15 секундтан
  // асса, осы парақты «қатемен» деп есептеп, келесі парақтарға (немесе әкімшінің батырмасына) кедергі жасамаймыз.
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ secret, ...body }), redirect: 'follow', signal: controller.signal })
    const text = await res.text()
    let json: { ok?: boolean; error?: string } | null = null
    try { json = JSON.parse(text) } catch { /* JSON емес (мысалы, Google кіру беті) */ }
    if (json?.ok) return { ok: true }
    const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)
    return { ok: false, error: json?.error ?? `Google жауабы ${res.status} (${new URL(res.url || url).host}): ${snippet}` }
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError'
    return { ok: false, error: aborted ? `${CALL_TIMEOUT_MS / 1000} секундте жауап келмеді (Apps Script ілінген болуы мүмкін)` : e instanceof Error ? e.message : 'Желі қатесі' }
  } finally {
    clearTimeout(timer)
  }
}

// ───────── Пайдаланушылар (бар парақ, аты мен бағандары өзгермейді — үйлесімділік үшін) ─────────

const USER_HEADERS = [
  'Пошта (логин)', 'Аты-жөні', 'Телефон', 'Түрі', 'Тіркелген күні', 'Соңғы кіру', 'Құпия сөз',
  'Курстар', 'Қолжетімділік берілген', 'Аяқталу мерзімі', 'Жабылған қолжетімділіктер', 'Соңғы жаңарту',
]

async function buildUserRows(admin: SupabaseClient, userId?: string): Promise<Row[]> {
  const profQuery = admin.from('profiles').select('id, email, full_name, phone, role, created_at, password_changed_at')
  const enrQuery = admin.from('enrollments').select('user_id, course_id, created_at, expires_at')
  const histQuery = admin.from('enrollment_history').select('user_id, course_id, ended_at, reason')
  const [{ data: profiles }, { data: enrollments }, { data: history }, { data: courses }, passwords, authList] = await Promise.all([
    userId ? profQuery.eq('id', userId) : profQuery.order('created_at'),
    userId ? enrQuery.eq('user_id', userId) : enrQuery,
    userId ? histQuery.eq('user_id', userId) : histQuery,
    admin.from('courses').select('id, title'),
    readAllPasswords(admin),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const title = (id: string) => courses?.find((c) => c.id === id)?.title ?? 'Курс'
  const lastSignIn = new Map((authList.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at]))

  return (profiles ?? []).map((p) => {
    const own = (enrollments ?? []).filter((e) => e.user_id === p.id)
    const ended = (history ?? []).filter((h) => h.user_id === p.id)
    const cred = passwords.get(p.id)
    const changedByUser = cred && p.password_changed_at ? new Date(p.password_changed_at).getTime() - new Date(cred.updatedAt).getTime() > 1500 : false
    return {
      'Пошта (логин)': p.email,
      'Аты-жөні': p.full_name ?? '',
      'Телефон': p.phone ?? '',
      'Түрі': ROLE[p.role] ?? p.role,
      'Тіркелген күні': fmt(p.created_at),
      'Соңғы кіру': fmt(lastSignIn.get(p.id) ?? null),
      'Құпия сөз': changedByUser ? 'пайдаланушы өзгерткен' : cred?.password ?? 'сақталмаған',
      'Курстар': own.map((e) => title(e.course_id)).join('\n'),
      'Қолжетімділік берілген': own.map((e) => fmt(e.created_at)).join('\n'),
      'Аяқталу мерзімі': own.map((e) => (e.expires_at ? fmt(e.expires_at) : 'мерзімсіз')).join('\n'),
      'Жабылған қолжетімділіктер': ended.map((h) => `${title(h.course_id)} — ${fmt(h.ended_at)} (${h.reason === 'expired' ? 'мерзімі аяқталды' : 'қолмен жабылды'})`).join('\n'),
      'Соңғы жаңарту': fmt(new Date().toISOString()),
    }
  })
}

export async function syncUser(admin: SupabaseClient, userId: string) {
  if (!sheetConfigured()) return { ok: false, error: 'not configured' }
  const rows = await buildUserRows(admin, userId)
  return rows.length ? post({ action: 'upsert', sheet: 'Пайдаланушылар', headers: USER_HEADERS, rows }) : { ok: false, error: 'user not found' }
}

// ───────── Толық көшірме: курстар, сабақтар, жаңалықтар, қызметтер, төлемдер, тапсырмалар ─────────

async function usersSheet(admin: SupabaseClient): Promise<SheetDef> {
  return { sheet: 'Пайдаланушылар', headers: USER_HEADERS, rows: await buildUserRows(admin) }
}

async function coursesSheet(admin: SupabaseClient): Promise<SheetDef> {
  const { data } = await admin.from('courses').select('title, category, price_kzt, old_price_kzt, is_published, deleted_at, created_at').order('position')
  const headers = ['Атауы', 'Бағыты', 'Баға', 'Ескі баға', 'Жарияланды', 'Жойылған', 'Құрылған күні']
  const rows = (data ?? []).map((c) => ({
    'Атауы': c.title, 'Бағыты': c.category, 'Баға': c.price_kzt != null ? String(c.price_kzt) : '',
    'Ескі баға': c.old_price_kzt != null ? String(c.old_price_kzt) : '', 'Жарияланды': c.is_published ? 'иә' : 'жоқ',
    'Жойылған': c.deleted_at ? 'иә' : 'жоқ', 'Құрылған күні': fmt(c.created_at),
  }))
  return { sheet: 'Курстар', headers, rows }
}

async function lessonsSheet(admin: SupabaseClient): Promise<SheetDef> {
  const [{ data: lessons }, { data: courses }, { data: contents }] = await Promise.all([
    admin.from('lessons').select('id, course_id, module_title, title, position, is_free_preview, deleted_at').order('position'),
    admin.from('courses').select('id, title'),
    admin.from('lesson_content').select('lesson_id, youtube_id, assignment_text'),
  ])
  const courseTitle = new Map((courses ?? []).map((c) => [c.id, c.title]))
  const contentByLesson = new Map((contents ?? []).map((c) => [c.lesson_id, c]))
  const headers = ['Курс', 'Модуль', 'Сабақ', 'Реті', 'Тегін', 'Бейне бар ма', 'Тапсырма бар ма', 'Жойылған']
  const rows = (lessons ?? []).map((l) => {
    const c = contentByLesson.get(l.id)
    return {
      'Курс': courseTitle.get(l.course_id) ?? '', 'Модуль': l.module_title ?? '', 'Сабақ': l.title,
      'Реті': String(l.position), 'Тегін': l.is_free_preview ? 'иә' : 'жоқ',
      'Бейне бар ма': c?.youtube_id ? 'иә' : 'жоқ', 'Тапсырма бар ма': c?.assignment_text ? 'иә' : 'жоқ',
      'Жойылған': l.deleted_at ? 'иә' : 'жоқ',
    }
  })
  return { sheet: 'Сабақтар', headers, rows }
}

async function newsSheet(admin: SupabaseClient): Promise<SheetDef> {
  const { data } = await admin.from('news').select('title, body, is_published, created_at').order('created_at', { ascending: false })
  const headers = ['Тақырып', 'Мәтін', 'Жарияланды', 'Күні']
  const rows = (data ?? []).map((n) => ({ 'Тақырып': n.title, 'Мәтін': n.body ?? '', 'Жарияланды': n.is_published ? 'иә' : 'жоқ', 'Күні': fmt(n.created_at) }))
  return { sheet: 'Жаңалықтар', headers, rows }
}

async function servicesSheet(admin: SupabaseClient): Promise<SheetDef> {
  const { data } = await admin.from('services').select('title, category, price_kzt, is_published, created_at').order('position')
  const headers = ['Атауы', 'Бағыты', 'Баға', 'Жарияланды', 'Құрылған күні']
  const rows = (data ?? []).map((s) => ({ 'Атауы': s.title, 'Бағыты': s.category, 'Баға': s.price_kzt != null ? String(s.price_kzt) : 'тегін', 'Жарияланды': s.is_published ? 'иә' : 'жоқ', 'Құрылған күні': fmt(s.created_at) }))
  return { sheet: 'Қызметтер', headers, rows }
}

async function paymentsSheet(admin: SupabaseClient): Promise<SheetDef> {
  const [{ data: payments }, { data: profiles }, { data: courses }] = await Promise.all([
    admin.from('payments').select('user_id, course_id, amount_kzt, provider, status, created_at, paid_at').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, email, full_name'),
    admin.from('courses').select('id, title'),
  ])
  const email = new Map((profiles ?? []).map((p) => [p.id, p.full_name ? `${p.full_name} (${p.email})` : p.email]))
  const courseTitle = new Map((courses ?? []).map((c) => [c.id, c.title]))
  const headers = ['Клиент', 'Курс', 'Сомасы', 'Провайдер', 'Мәртебесі', 'Құрылған күні', 'Төленген күні']
  const rows = (payments ?? []).map((p) => ({
    'Клиент': email.get(p.user_id) ?? p.user_id, 'Курс': courseTitle.get(p.course_id) ?? '',
    'Сомасы': p.amount_kzt != null ? String(p.amount_kzt) : '', 'Провайдер': p.provider,
    'Мәртебесі': p.status, 'Құрылған күні': fmt(p.created_at), 'Төленген күні': fmt(p.paid_at),
  }))
  return { sheet: 'Төлемдер', headers, rows }
}

async function assignmentsSheet(admin: SupabaseClient): Promise<SheetDef> {
  const [{ data: answers }, { data: replies }, { data: profiles }, { data: lessons }] = await Promise.all([
    admin.from('lesson_answers').select('id, lesson_id, user_id, body, status, created_at').order('created_at', { ascending: false }),
    admin.from('answer_replies').select('answer_id, author_id, body, created_at'),
    admin.from('profiles').select('id, email, full_name'),
    admin.from('lessons').select('id, title'),
  ])
  const person = (id: string) => { const p = (profiles ?? []).find((x) => x.id === id); return p ? (p.full_name || p.email) : id }
  const lessonTitle = new Map((lessons ?? []).map((l) => [l.id, l.title]))
  const headers = ['Оқушы', 'Сабақ', 'Жауабы', 'Мәртебесі', 'Жауап берілген күні', 'Кураторлардың жауабы']
  const rows = (answers ?? []).map((a) => ({
    'Оқушы': person(a.user_id), 'Сабақ': lessonTitle.get(a.lesson_id) ?? '', 'Жауабы': a.body,
    'Мәртебесі': STATUS[a.status] ?? a.status, 'Жауап берілген күні': fmt(a.created_at),
    'Кураторлардың жауабы': (replies ?? []).filter((r) => r.answer_id === a.id).map((r) => `${person(r.author_id)}: ${r.body} (${fmt(r.created_at)})`).join('\n'),
  }))
  return { sheet: 'Тапсырмалар', headers, rows }
}

// Барлық парақты қатарынан толықтай ауыстырады (replaceAll) — Supabase-тен алынған соңғы шынайы жағдай
export async function syncAllSheets(admin: SupabaseClient) {
  if (!sheetConfigured()) return { ok: false, error: 'not configured' }
  const builders = [usersSheet, coursesSheet, lessonsSheet, newsSheet, servicesSheet, paymentsSheet, assignmentsSheet]
  // Параллель: 7 парақ бір-бірін күтпейді — Apps Script LockService бәрібір өз жағында кезекке қояды,
  // ал бізде бір ғана баяу/ілінген парақ бүкіл функцияны 7×15 секундқа созбайды.
  const entries = await Promise.all(builders.map(async (build) => {
    const def = await build(admin)
    const r = await post({ action: 'replaceAll', sheet: def.sheet, headers: def.headers, rows: def.rows })
    return [def.sheet, { ...r, count: def.rows.length }] as const
  }))
  const results = Object.fromEntries(entries)
  const ok = entries.every(([, r]) => r.ok)
  return { ok, sheets: results }
}

// Ескі атау — cron.ts-те «тек пайдаланушылар» деп шатастырмас үшін жаңасына бағыттаймыз
export const syncAll = syncAllSheets
