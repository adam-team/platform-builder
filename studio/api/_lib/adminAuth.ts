import type { VercelRequest } from '@vercel/node'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

// Общая проверка для всех серверных функций админки: создаёт клиент с service_role
// и убеждается, что запрос пришёл именно от вошедшего администратора.
export async function requireAdmin(
  req: VercelRequest,
): Promise<{ admin: SupabaseClient; caller: User } | { error: string; status: number }> {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    const missing = [!url && 'VITE_SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ')
    return { error: `Сервер не настроен: в Vercel нет переменной ${missing}. Проверьте точное имя и сделайте Redeploy`, status: 500 }
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const { data: callerAuth } = await admin.auth.getUser(token)
  if (!callerAuth.user) return { error: 'Требуется вход', status: 401 }

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerAuth.user.id).single()
  if (callerProfile?.role !== 'admin') return { error: 'Только для администратора', status: 403 }

  return { admin, caller: callerAuth.user }
}

export type Staff = { admin: SupabaseClient; caller: User; role: 'admin' | 'curator' }

// Әкімші НЕМЕСЕ куратор. Куратор тек қонақ/төлеген пайдаланушыларға тиісе алады (әкімші мен басқа кураторға емес) —
// оны әр функция assertManageable арқылы тексереді.
export async function requireStaff(req: VercelRequest): Promise<Staff | { error: string; status: number }> {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    const missing = [!url && 'VITE_SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ')
    return { error: `Сервер не настроен: в Vercel нет переменной ${missing}. Проверьте точное имя и сделайте Redeploy`, status: 500 }
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const { data: callerAuth } = await admin.auth.getUser(token)
  if (!callerAuth.user) return { error: 'Требуется вход', status: 401 }
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerAuth.user.id).single()
  const role = callerProfile?.role
  if (role !== 'admin' && role !== 'curator') return { error: 'Тек әкімші немесе куратор үшін', status: 403 }
  return { admin, caller: callerAuth.user, role }
}

// Куратор әкімшіні/кураторды өзгерте алмайды. Әкімші — кез келген адамды.
export async function assertManageable(admin: SupabaseClient, role: 'admin' | 'curator', targetUserId: string): Promise<string | null> {
  if (role === 'admin') return null
  const { data } = await admin.from('profiles').select('role').eq('id', targetUserId).maybeSingle()
  if (data && data.role !== 'free' && data.role !== 'paid') return 'Куратор әкімшіні немесе басқа кураторды өзгерте алмайды'
  return null
}
