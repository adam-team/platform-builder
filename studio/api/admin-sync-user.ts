import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertManageable, requireStaff } from './_lib/adminAuth.js'
import { syncAllSheets, syncUser } from './_lib/sheets.js'

// Әкімші: бір пайдаланушыны ({ userId }) немесе бәрін ({ all: true }) Google кестеге қайта жазады
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireStaff(req)
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error })
  const { userId, all } = req.body as { userId?: string; all?: boolean }
  if (all) {
    if (auth.role !== 'admin') return res.status(403).json({ error: 'Толық көшіруді тек әкімші жасай алады' })
    const r = await syncAllSheets(auth.admin)
    return res.status(r.ok ? 200 : 502).json(r)
  }
  if (!userId) return res.status(400).json({ error: 'userId немесе all міндетті' })
  const blocked = await assertManageable(auth.admin, auth.role, userId)
  if (blocked) return res.status(403).json({ error: blocked })
  const r = await syncUser(auth.admin, userId)
  return res.status(r.ok ? 200 : 502).json(r)
}
