import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from './_lib/adminAuth.js'

// Тек әкімшіге: пайдаланушыны (немесе бірнешеуін бірден)
//  - «деактивация»: кіре алмайды, құпия сөзі өшеді, барлық курс қолжетімділігі жабылады
//    («Жойылғандар тізімінде» көрінеді). Auth есептік жазбасын өшірмейді (ban_duration), «restore»
//    арқылы кейін қайта ашуға болады.
//  - «restore»: кіру мүмкіндігін қайтарады (курс қолжетімділігін әкімші қолмен қайта береді).
//  - «purge»: МӘҢГІЛІККЕ өшіреді — Auth есептік жазбасы және профиль (тарихы, төлемдері, жауаптары
//    түгел) қоса біржола жойылады, қалпына келтіру мүмкін емес. Тек алдымен деактивацияланған адамға
//    қолданылады (қорғаныс үшін — кездейсоқ белсенді адамды өшіріп алмас үшін).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireAdmin(req)
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error })
  const { admin, caller } = auth

  const { userIds, action } = req.body as { userIds?: string[]; action?: 'deactivate' | 'restore' | 'purge' }
  if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: 'userIds міндетті' })
  if (action !== 'deactivate' && action !== 'restore' && action !== 'purge') return res.status(400).json({ error: 'action қате' })

  const results: Record<string, { ok: boolean; error?: string }> = {}

  for (const userId of userIds) {
    try {
      if (userId === caller.id) { results[userId] = { ok: false, error: 'Өзіңізді жоя алмайсыз' }; continue }

      if (action === 'deactivate') {
        const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
        if (banError) { results[userId] = { ok: false, error: banError.message }; continue }

        const { data: enrollments } = await admin.from('enrollments').select('*').eq('user_id', userId)
        if (enrollments?.length) {
          const historyRows = enrollments.map((e) => ({
            user_id: e.user_id, course_id: e.course_id, granted_at: e.created_at, expires_at: e.expires_at,
            ended_at: new Date().toISOString(), reason: 'removed', removed_by: caller.id,
          }))
          await admin.from('enrollment_history').insert(historyRows)
          await admin.from('enrollments').delete().eq('user_id', userId)
        }

        await admin.from('user_credentials').delete().eq('user_id', userId)
        await admin.from('profiles').update({ role: 'free', deactivated_at: new Date().toISOString() }).eq('id', userId)
      } else if (action === 'restore') {
        const { error: unbanError } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
        if (unbanError) { results[userId] = { ok: false, error: unbanError.message }; continue }
        await admin.from('profiles').update({ deactivated_at: null }).eq('id', userId)
      } else {
        const { data: profile } = await admin.from('profiles').select('deactivated_at').eq('id', userId).maybeSingle()
        if (!profile?.deactivated_at) { results[userId] = { ok: false, error: 'Алдымен «толық жою» (деактивация) қажет' }; continue }
        const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
        if (deleteError) { results[userId] = { ok: false, error: deleteError.message }; continue }
        // profiles жолы auth.users-ке on delete cascade сілтейді — жоғарыдағы жол профильді, оның
        // барлық тарихын, жауаптарын, төлемдерін де автоматты өшіреді.
      }
      results[userId] = { ok: true }
    } catch (e) {
      results[userId] = { ok: false, error: e instanceof Error ? e.message : 'Белгісіз қате' }
    }
  }

  const ok = Object.values(results).every((r) => r.ok)
  return res.status(200).json({ ok, results })
}
