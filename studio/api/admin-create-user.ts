import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomInt } from 'node:crypto'
import { assertManageable, requireStaff } from './_lib/adminAuth.js'
import { sendEmail } from './_lib/email.js'
import { accessEmail } from './_lib/emailTemplates.js'
import { storePassword } from './_lib/vault.js'

type CourseGrant = { courseId: string; amount?: number | null; unit?: 'day' | 'week' | 'month' | 'year' | null }

function generatePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join('')
}

function addPeriod(from: Date, amount: number, unit: CourseGrant['unit']): Date {
  const d = new Date(from)
  if (unit === 'day') d.setDate(d.getDate() + amount)
  else if (unit === 'week') d.setDate(d.getDate() + amount * 7)
  else if (unit === 'month') d.setMonth(d.getMonth() + amount)
  else if (unit === 'year') d.setFullYear(d.getFullYear() + amount)
  return d
}

// Пайдаланушыны әкімші қосады: құпия сөзді өзі жасайды, курстарға мерзімімен қолжетімділік береді
// және пошта арқылы сайт/логин/құпия сөз жібереді. Пошта бар болса — тек қолжетімділік қосылады.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireStaff(req)
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error })
  const { admin, caller, role: callerRole } = auth

  const body = req.body as {
    email?: string; fullName?: string; phone?: string; role?: 'free' | 'paid' | 'curator' | 'admin'
    message?: string; courses?: CourseGrant[]; grantedAt?: string; sendEmail?: boolean; asStaff?: boolean
  }
  const email = (body.email ?? '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Электрондық пошта дұрыс емес' })
  const grantedAt = body.grantedAt ? new Date(body.grantedAt) : new Date()
  if (Number.isNaN(grantedAt.getTime())) return res.status(400).json({ error: 'Қолжетімділік күні дұрыс емес' })
  const courses = body.courses ?? []

  // Куратор куратор шақыра алады, бірақ әкімші тағайындай алмайды (тек нақты әкімшінің құзыры)
  const wantsAdmin = body.role === 'admin' || (body.asStaff && body.role !== 'curator')
  if (callerRole !== 'admin' && wantsAdmin) return res.status(403).json({ error: 'Әкімшіні тек әкімші тағайындай алады' })

  const { data: existing } = await admin.from('profiles').select('id, full_name').eq('email', email).maybeSingle()
  if (existing) {
    const blocked = await assertManageable(admin, callerRole, existing.id as string)
    if (blocked) return res.status(403).json({ error: blocked })
  }
  let userId = existing?.id as string | undefined
  let password: string | undefined
  const isNew = !existing

  if (isNew) {
    password = generatePassword()
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: body.fullName ?? '' } })
    if (error || !data.user) return res.status(400).json({ error: error?.message ?? 'Пайдаланушыны құру мүмкін болмады' })
    userId = data.user.id
    const now = new Date().toISOString()
    await admin.from('profiles').update({ password_changed_at: now }).eq('id', userId)
    await storePassword(admin, userId, password, now)
  }
  if (!userId) return res.status(500).json({ error: 'Пайдаланушы табылмады' })

  const profilePatch: Record<string, unknown> = {}
  if (body.fullName) profilePatch.full_name = body.fullName
  if (body.phone) profilePatch.phone = body.phone
  if (body.role === 'curator') profilePatch.role = 'curator'
  else if (body.role === 'admin' || body.asStaff) profilePatch.role = 'admin'
  if (Object.keys(profilePatch).length) await admin.from('profiles').update(profilePatch).eq('id', userId)

  const granted: { title: string; expiresAt: string | null }[] = []
  if (courses.length) {
    const { data: courseRows } = await admin.from('courses').select('id, title').in('id', courses.map((c) => c.courseId))
    const rows = courses.map((c) => ({
      user_id: userId,
      course_id: c.courseId,
      source: 'admin',
      granted_by: caller.id,
      created_at: grantedAt.toISOString(),
      expires_at: c.amount && c.unit ? addPeriod(grantedAt, c.amount, c.unit).toISOString() : null,
    }))
    const { error: enrollError } = await admin.from('enrollments').upsert(rows, { onConflict: 'user_id,course_id' })
    if (enrollError) return res.status(500).json({ error: `Пайдаланушы бар, бірақ қолжетімділік берілмеді: ${enrollError.message}` })
    for (const r of rows) granted.push({ title: courseRows?.find((c) => c.id === r.course_id)?.title ?? 'Курс', expiresAt: r.expires_at })
    if (isNew || existing) await admin.from('profiles').update({ role: 'paid' }).eq('id', userId).eq('role', 'free')
  }

  let emailSent = false
  let emailError: string | undefined
  if (body.sendEmail !== false) {
    const siteUrl = process.env.SITE_URL ?? `https://${req.headers.host ?? ''}`
    const name = body.fullName || existing?.full_name || ''
    const message = (body.message || 'Сәлеметсіз бе, {name}! Сізге платформаға қолжетімділік ашылды.').replace(/\{name\}/g, name || 'құрметті қолданушы')
    const result = await sendEmail({
      to: email,
      subject: body.role === 'curator' ? 'Сізге куратор ретінде қолжетімділік ашылды' : body.asStaff || body.role === 'admin' ? 'Сізге әкімші ретінде қолжетімділік ашылды' : 'Платформаға қолжетімділік ашылды',
      html: accessEmail({ siteUrl, name, message, login: email, password, courses: granted }),
    })
    emailSent = result.ok
    if (!result.ok) emailError = result.error
  }

  // Google кестеге жазу мұнда жоқ — Apps Script ілініп қалса, пайдаланушы қосу секундтап созылмасын
  // (бұл жерде 15 секундқа дейін тоқтап тұратын еді). Кестеге жазу клиенттегі scheduleBackup() арқылы
  // бөлек, фонда, жауапты күттірмей жүреді (UserForms.tsx submit-те шақырылады).
  return res.status(200).json({ userId, existing: !isNew, password, emailSent, emailError })
}
