import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertManageable, requireStaff } from './_lib/adminAuth.js'
import { sendEmail } from './_lib/email.js'
import { accessEmail } from './_lib/emailTemplates.js'
import { storePassword } from './_lib/vault.js'
import { syncUser } from './_lib/sheets.js'

// Әкімші басқа пайдаланушының поштасын/құпия сөзін/рөлін/атын/телефонын өзгертеді.
// Басқа адамның auth-деректерін өзгерту service_role керек — сондықтан серверлік функция.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireStaff(req)
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error })
  const { admin, role: callerRole } = auth

  const { userId, password, email, role, fullName, phone, notify } = req.body as {
    userId?: string; password?: string; email?: string; role?: 'free' | 'paid' | 'curator' | 'admin'
    fullName?: string; phone?: string; notify?: boolean
  }
  if (!userId) return res.status(400).json({ error: 'userId міндетті' })
  // Куратор: рөлді өзгерте алмайды және әкімшіге/кураторға тиісе алмайды
  if (callerRole !== 'admin' && role) return res.status(403).json({ error: 'Рөлді тек әкімші өзгерте алады' })
  const blocked = await assertManageable(admin, callerRole, userId)
  if (blocked) return res.status(403).json({ error: blocked })
  if (password && password.length < 8) return res.status(400).json({ error: 'Пароль — кемінде 8 таңба' })

  if (password || email) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ...(password ? { password } : {}),
      ...(email ? { email, email_confirm: true } : {}),
    })
    if (error) return res.status(400).json({ error: error.message })
  }

  const patch: Record<string, unknown> = {}
  if (email) patch.email = email
  if (role) patch.role = role
  if (fullName !== undefined) patch.full_name = fullName
  if (phone !== undefined) patch.phone = phone || null
  const changedAt = new Date().toISOString()
  if (password) patch.password_changed_at = changedAt
  if (Object.keys(patch).length) {
    const { error } = await admin.from('profiles').update(patch).eq('id', userId)
    if (error) return res.status(500).json({ error: error.message })
  }

  if (password) await storePassword(admin, userId, password, changedAt)

  let emailSent: boolean | undefined
  let emailError: string | undefined
  if (notify && (password || email)) {
    const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', userId).single()
    if (profile?.email) {
      const siteUrl = process.env.SITE_URL ?? `https://${req.headers.host ?? ''}`
      const result = await sendEmail({
        to: profile.email,
        subject: 'Кіру мәліметтеріңіз жаңартылды',
        html: accessEmail({ siteUrl, name: profile.full_name ?? '', message: `Сәлеметсіз бе${profile.full_name ? `, ${profile.full_name}` : ''}! Кіру мәліметтеріңіз жаңартылды.`, login: profile.email, password, courses: [] }),
      })
      emailSent = result.ok
      if (!result.ok) emailError = result.error
    }
  }

  const sheet = await syncUser(admin, userId).catch(() => ({ ok: false }))
  return res.status(200).json({ sheetSynced: sheet.ok, ok: true, emailSent, emailError })
}
