import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Әкімші орнатқан құпия сөздің AES-256-GCM шифрланған көшірмесі. Кілт — PASSWORD_VAULT_KEY (болса) немесе
// service_role кілтінен туындайды. Кестеге браузер қол жеткізе алмайды (RLS + revoke), тек осы серверлік функциялар.
const keyOf = () => createHash('sha256').update(`vault:${process.env.PASSWORD_VAULT_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest()

function encrypt(text: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyOf(), iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.')
}

function decrypt(payload: string): string | null {
  try {
    const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64'))
    const decipher = createDecipheriv('aes-256-gcm', keyOf(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

export async function storePassword(admin: SupabaseClient, userId: string, password: string, at: string) {
  await admin.from('user_credentials').upsert({ user_id: userId, password_enc: encrypt(password), updated_at: at })
}

export async function readPassword(admin: SupabaseClient, userId: string): Promise<{ password: string | null; updatedAt: string | null }> {
  const { data } = await admin.from('user_credentials').select('password_enc, updated_at').eq('user_id', userId).maybeSingle()
  if (!data) return { password: null, updatedAt: null }
  return { password: decrypt(data.password_enc), updatedAt: data.updated_at }
}

export async function readAllPasswords(admin: SupabaseClient): Promise<Map<string, { password: string | null; updatedAt: string }>> {
  const { data } = await admin.from('user_credentials').select('user_id, password_enc, updated_at')
  return new Map((data ?? []).map((r) => [r.user_id as string, { password: decrypt(r.password_enc as string), updatedAt: r.updated_at as string }]))
}
