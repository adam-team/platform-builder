import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Сколько жаңалықтар пайдаланушы әлі оқымаған — бейджик санағы үшін.
export function useUnreadNewsCount(userId: string | undefined) {
  const [count, setCount] = useState(0)

  async function refresh() {
    if (!userId) return setCount(0)
    const [{ data: news }, { data: reads }] = await Promise.all([
      supabase.from('news').select('id').eq('is_published', true),
      supabase.from('news_reads').select('news_id').eq('user_id', userId),
    ])
    const readIds = new Set((reads ?? []).map((r) => r.news_id as string))
    setCount(((news as { id: string }[]) ?? []).filter((n) => !readIds.has(n.id)).length)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return { count, refresh }
}

// Барлық жаңалықты «оқылды» деп белгілейді (жаңалықтар бетін ашқанда шақырылады)
export async function markAllNewsRead(userId: string) {
  const { data: news } = await supabase.from('news').select('id').eq('is_published', true)
  const rows = ((news as { id: string }[]) ?? []).map((n) => ({ user_id: userId, news_id: n.id }))
  if (rows.length === 0) return
  await supabase.from('news_reads').upsert(rows, { onConflict: 'user_id,news_id', ignoreDuplicates: true })
}

// Жаңа жаңалық шыққанда барлық төлеген клиентке (role = paid) қоңырау белгісіне хабарландыру жібереді.
// Тек әкімші шақырады (notifications кестесіне жазуға тек әкімшінің құқығы бар).
export async function notifyPaidUsersAboutNews(title: string, body: string | null): Promise<{ count: number; error?: string }> {
  const { data: users, error } = await supabase.from('profiles').select('id').eq('role', 'paid')
  if (error) return { count: 0, error: error.message }
  const ids = ((users as { id: string }[]) ?? []).map((u) => u.id)
  const preview = body ? (body.length > 140 ? `${body.slice(0, 140)}…` : body) : null
  for (let i = 0; i < ids.length; i += 500) {
    const rows = ids.slice(i, i + 500).map((user_id) => ({ user_id, title: `Жаңалық: ${title}`, body: preview, link: '/#news' }))
    const { error: insertError } = await supabase.from('notifications').insert(rows)
    if (insertError) return { count: i, error: insertError.message }
  }
  return { count: ids.length }
}
