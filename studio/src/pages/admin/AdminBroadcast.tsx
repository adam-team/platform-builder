import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import SegmentBuilder from '../../components/SegmentBuilder'
import type { Broadcast, Course, Profile } from '../../lib/types'

// ЭТАП_08 «Рассылки» — честный срез: тек email арнасы (Telegram/WhatsApp боты — бөлек, нақты аккаунт
// керек), SegmentBuilder арқылы алушыларды таңдап, Resend-пен жібереді. Визуалды хат конструкторы,
// цепочки, A/B-тест — жоқ.
export default function AdminBroadcast() {
  const { session } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [access, setAccess] = useState<Map<string, Set<string>>>(new Map())
  const [segmentIds, setSegmentIds] = useState<Set<string> | null>(null)
  const [history, setHistory] = useState<Broadcast[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [p, c, e, h] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('courses').select('*'),
      supabase.from('enrollments').select('user_id, course_id'),
      supabase.from('broadcasts').select('*').order('sent_at', { ascending: false }).limit(20),
    ])
    setProfiles((p.data as Profile[]) ?? [])
    setCourses((c.data as Course[]) ?? [])
    const map = new Map<string, Set<string>>()
    for (const row of e.data ?? []) {
      if (!map.has(row.user_id)) map.set(row.user_id, new Set())
      map.get(row.user_id)!.add(row.course_id)
    }
    setAccess(map)
    setHistory((h.data as Broadcast[]) ?? [])
  }
  useEffect(() => { load() }, [])

  const recipients = segmentIds === null ? profiles : profiles.filter((p) => segmentIds.has(p.id))

  async function send(e: FormEvent) {
    e.preventDefault()
    if (recipients.length === 0) return setError('Алушылар жоқ — сегмент таңдаңыз.')
    if (!confirm(`${recipients.length} адамға хат жіберу керек пе?`)) return
    setBusy(true)
    setError('')
    setResult('')
    const res = await fetch('/api/send-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ subject, body, userIds: recipients.map((p) => p.id) }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error ?? 'Қате шықты')
    setResult(`${data.sent} / ${data.total} адамға жіберілді.`)
    setSubject('')
    setBody('')
    load()
  }

  return (
    <>
      <p className="muted small">
        Тек email арнасы (Resend арқылы). Telegram/WhatsApp таратуы — бот аккаунттарын қосқаннан кейін
        бөлек жасалады.
      </p>

      <form className="panel" onSubmit={send}>
        <h4 style={{ marginTop: 0 }}>Кімге</h4>
        <SegmentBuilder profiles={profiles} accessByUser={access} courses={courses} onFilteredChange={setSegmentIds} />

        <label>Тақырып<input required value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label>Хат мәтіні<textarea required rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></label>

        {error && <p className="error">{error}</p>}
        {result && <p className="success">{result}</p>}
        <button disabled={busy}>{busy ? 'Жіберілуде…' : `Жіберу (${recipients.length} адамға)`}</button>
      </form>

      <h4>Соңғы таратулар</h4>
      <table>
        <tbody>
          {history.length === 0 && <tr><td className="muted">Таратулар әлі жоқ</td></tr>}
          {history.map((b) => (
            <tr key={b.id}>
              <td>
                <b>{b.subject}</b>
                <div className="muted small">{new Date(b.sent_at).toLocaleString('ru-RU')} · {b.recipient_count} адамға жіберілді</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
