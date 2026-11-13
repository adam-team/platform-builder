import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from './_lib/adminAuth.js'
import { sendEmail } from './_lib/email.js'

// ЭТАП_08 «Рассылки» — тек email арнасы (Telegram/WhatsApp үшін нақты бот керек, ол бөлек тапсырма).
// SegmentBuilder-де таңдалған userIds осында келеді, әр адамға жеке хат жіберіледі (Resend бір-бірден,
// көп адам болса — баяу болуы мүмкін, шағын мектеп үшін жеткілікті; үлкен базаға queue керек болады).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAdmin(req)
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error })
  const { admin, caller } = auth

  const { subject, body, userIds } = req.body as { subject?: string; body?: string; userIds?: string[] }
  if (!subject || !body) return res.status(400).json({ error: 'Тақырып пен мәтін міндетті' })
  if (!userIds?.length) return res.status(400).json({ error: 'Алушылар таңдалмаған' })

  const { data: recipients } = await admin.from('profiles').select('email').in('id', userIds)
  const emails = (recipients ?? []).map((r) => r.email).filter(Boolean)

  let sent = 0
  for (const email of emails) {
    const result = await sendEmail({ to: email, subject, html: body.replace(/\n/g, '<br>') })
    if (result.ok) sent++
  }

  await admin.from('broadcasts').insert({ subject, body, recipient_count: sent, created_by: caller.id })

  return res.status(200).json({ ok: true, sent, total: emails.length })
}
