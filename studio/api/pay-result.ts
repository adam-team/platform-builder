import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { freedomConfig, resultResponse, verify } from './_lib/freedompay.js'

// Уведомление Freedom Pay о результате оплаты (pg_result_url, метод GET — параметры в адресе).
// Проверяем подпись, сверяем сумму с заявкой и при успехе открываем курс через confirm_payment
// (та же функция, что у кнопки «Подтвердить» в админке). Повторные уведомления безопасны.
const SCRIPT = 'pay-result'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  const cfg = freedomConfig()
  if ('error' in cfg) return res.status(500).send(cfg.error)

  const raw = { ...(req.query as Record<string, string | string[]>), ...((req.method === 'POST' && req.body && typeof req.body === 'object') ? req.body : {}) }
  const p: Record<string, string> = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]))
  const reply = (status: 'ok' | 'rejected' | 'error', text: string) => res.status(200).send(resultResponse(SCRIPT, status, text, cfg.secretKey))

  if (!verify(SCRIPT, p, cfg.secretKey)) return reply('error', 'Неверная подпись')

  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).send('Нет VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: payment } = await db.from('payments').select('id, amount_kzt, status').eq('id', p.pg_order_id).maybeSingle()
  if (!payment) return reply('error', 'Заказ не найден')
  if (payment.status === 'paid') return reply('ok', 'Заказ уже оплачен')

  if (p.pg_result !== '1') {
    await db.from('payments').update({ status: 'failed', external_id: p.pg_payment_id ?? null }).eq('id', payment.id)
    return reply('ok', 'Оплата не прошла')
  }
  if (Number(p.pg_amount) < Number(payment.amount_kzt ?? 0)) return reply('rejected', 'Сумма меньше цены курса')

  await db.from('payments').update({ external_id: p.pg_payment_id ?? null }).eq('id', payment.id)
  const { error } = await db.rpc('confirm_payment', { p_payment: payment.id })
  if (error) return res.status(500).send(`confirm_payment: ${error.message}`) // не 200 — Freedom Pay повторит уведомление
  return reply('ok', 'Курс открыт')
}
