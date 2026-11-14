import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { FREEDOM_API, freedomConfig, readXml, salt, sign } from './_lib/freedompay.js'

// «Купить курс» при онлайн-оплате (VITE_PAYMENT_PROVIDER=freedom).
// Ученик должен быть залогинен. Сервер сам берёт цену курса из базы (не из браузера), создаёт заявку
// в payments и платёж в Freedom Pay, возвращает ссылку на страницу оплаты. Доступ к курсу открывает
// /api/pay-result, когда Freedom Pay сообщит об успешной оплате.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const cfg = freedomConfig()
  if ('error' in cfg) return res.status(500).json({ error: cfg.error })
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Сервер не настроен: нет VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в Vercel' })
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await db.auth.getUser(token)
  if (!auth.user) return res.status(401).json({ error: 'Войдите, чтобы купить курс' })

  const { courseId } = (req.body ?? {}) as { courseId?: string }
  if (!courseId) return res.status(400).json({ error: 'courseId обязателен' })
  const { data: course } = await db.from('courses').select('id, title, price_kzt, is_published, deleted_at').eq('id', courseId).single()
  if (!course || !course.is_published || course.deleted_at) return res.status(404).json({ error: 'Курс не найден' })
  if (!course.price_kzt || course.price_kzt <= 0) return res.status(400).json({ error: 'У курса не указана цена' })

  const { data: owned } = await db.from('enrollments').select('id').eq('user_id', auth.user.id).eq('course_id', course.id).maybeSingle()
  if (owned) return res.status(409).json({ error: 'Курс уже открыт' })

  const { data: payment, error: payErr } = await db.from('payments')
    .insert({ user_id: auth.user.id, course_id: course.id, amount_kzt: course.price_kzt, provider: 'freedom', status: 'pending' })
    .select('id').single()
  if (payErr || !payment) return res.status(500).json({ error: 'Не удалось создать заявку на оплату' })

  const site = (process.env.SITE_URL || `https://${req.headers.host ?? ''}`).replace(/\/$/, '')
  const params: Record<string, string | number> = {
    pg_merchant_id: cfg.merchantId,
    pg_order_id: payment.id,
    pg_amount: course.price_kzt,
    pg_currency: 'KZT',
    pg_description: `Курс «${course.title}»`.slice(0, 1000),
    pg_salt: salt(),
    pg_language: 'ru',
    pg_result_url: `${site}/api/pay-result`,
    pg_request_method: 'GET',
    pg_success_url: `${site}/course/${course.id}?paid=1`,
    pg_failure_url: `${site}/course/${course.id}?paid=0`,
    pg_user_id: auth.user.id,
    ...(auth.user.email ? { pg_user_contact_email: auth.user.email } : {}),
    ...(cfg.testing ? { pg_testing_mode: 1 } : {}),
  }
  const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), pg_sig: sign('init_payment.php', params, cfg.secretKey) })

  const r = await fetch(`${FREEDOM_API}/init_payment.php`, { method: 'POST', body })
  const xml = await r.text()
  const redirect = readXml(xml, 'pg_redirect_url')
  if (readXml(xml, 'pg_status') !== 'ok' || !redirect) {
    await db.from('payments').update({ status: 'failed' }).eq('id', payment.id)
    return res.status(502).json({ error: `Freedom Pay: ${readXml(xml, 'pg_error_description') ?? 'не удалось создать платёж'}` })
  }
  await db.from('payments').update({ external_id: readXml(xml, 'pg_payment_id') }).eq('id', payment.id)
  return res.status(200).json({ url: redirect })
}
