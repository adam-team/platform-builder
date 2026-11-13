import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from './_lib/adminAuth.js'
import { readPassword } from './_lib/vault.js'

// Әкімшіге пайдаланушының құпия сөзін көрсетеді — тек әкімші (немесе жүйе) орнатқан соңғы құпия сөз.
// Пайдаланушы өзі өзгерткен болса, жаңа құпия сөз бізге белгісіз (changedByUser = true).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireAdmin(req)
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error })
  const { admin } = auth

  const { userId } = req.body as { userId?: string }
  if (!userId) return res.status(400).json({ error: 'userId міндетті' })

  const [{ password, updatedAt }, { data: profile }] = await Promise.all([
    readPassword(admin, userId),
    admin.from('profiles').select('password_changed_at').eq('id', userId).single(),
  ])
  const changedAt = profile?.password_changed_at ? new Date(profile.password_changed_at).getTime() : 0
  const changedByUser = !!updatedAt && changedAt - new Date(updatedAt).getTime() > 1500
  return res.status(200).json({ password: changedByUser ? null : password, stored: !!updatedAt, changedByUser })
}
