import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaff } from './_lib/adminAuth.js'
import { sendEmail } from './_lib/email.js'

// Админ клиентке курс ашқанда (AdminClients.tsx) шақырылады: клиенттің поштасына
// «сізге қолжетімділік ашылды» деген хат кетеді. Хат жіберілмей қалса да, қолжетімділіктің
// өзі (enrollments жазбасы) бұрын сақталған болады — бұл тек қосымша хабарлама.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireStaff(req)
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error })
  const { admin } = auth

  const { userId, courseId } = req.body as { userId?: string; courseId?: string }
  if (!userId || !courseId) return res.status(400).json({ error: 'userId және courseId міндетті' })

  const [{ data: profile }, { data: course }] = await Promise.all([
    admin.from('profiles').select('email, full_name').eq('id', userId).single(),
    admin.from('courses').select('title').eq('id', courseId).single(),
  ])
  if (!profile?.email || !course?.title) return res.status(404).json({ error: 'Пайдаланушы немесе курс табылмады' })

  const siteUrl = process.env.SITE_URL ?? `https://${req.headers.host ?? ''}`
  const result = await sendEmail({
    to: profile.email,
    subject: `«${course.title}» курсына қолжетімділік ашылды`,
    html: `
      <p>Сәлеметсіз бе${profile.full_name ? `, ${profile.full_name}` : ''}!</p>
      <p>Сізге <b>«${course.title}»</b> курсына қолжетімділік ашылды.</p>
      <p><a href="${siteUrl}/my-courses">Курсты бастау →</a></p>
    `,
  })
  if (!result.ok) return res.status(502).json({ error: result.error })
  return res.status(200).json({ ok: true })
}
