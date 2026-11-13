import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { syncAllSheets } from './_lib/sheets.js'

// Vercel Cron (vercel.json): Supabase тегін жоспары 7 күн белсенділік болмаса «ұйықтайды» — сондықтан үнемі сұраныс жібереміз,
// және барлық пайдаланушыны Google кестеге толық көшіреміз. Көшіру тек CRON_SECRET дұрыс болғанда жүреді.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase кілттері жоқ' })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { error } = await admin.from('courses').select('id').limit(1)
  await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  const out: Record<string, unknown> = { keepalive: !error }

  // Трафик статистикасы (Админ → Трафик) тек соңғы 30 күнді көрсетеді, сондықтан 180 күннен ескі
  // сессияларды өшіреміз (traffic_events олармен бірге cascade арқылы кетеді) — база толып кетпес үшін.
  // Пайдаланушылар, курстар, төлемдерге тимейді.
  const cutoff = new Date(Date.now() - 180 * 86400000).toISOString()
  const { error: trimError, count } = await admin.from('traffic_sessions').delete({ count: 'exact' }).lt('created_at', cutoff)
  out.trafficTrimmed = trimError ? `қате: ${trimError.message}` : count ?? 0

  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization === `Bearer ${secret}`) out.backup = await syncAllSheets(admin)
  else out.backup = 'өткізілді (CRON_SECRET жоқ немесе сәйкес емес)'
  return res.status(200).json(out)
}
