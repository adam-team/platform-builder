import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatKzt } from '../../lib/content'
import type { Course, Payment, Profile } from '../../lib/types'

export default function AdminStats() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [enrollCount, setEnrollCount] = useState(0)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('enrollments').select('id'),
    ]).then(([p, c, pay, e]) => {
      setProfiles((p.data as Profile[]) ?? [])
      setCourses((c.data as Course[]) ?? [])
      setPayments((pay.data as Payment[]) ?? [])
      setEnrollCount(e.data?.length ?? 0)
    })
  }, [])

  if (!profiles) return <p className="muted">Жүктелуде…</p>

  const free = profiles.filter((p) => p.role === 'free').length
  const paid = profiles.filter((p) => p.role === 'paid').length
  const admins = profiles.filter((p) => p.role === 'admin').length
  const revenue = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount_kzt ?? 0), 0)
  const recent = profiles.slice(0, 8)

  const cards = [
    { label: 'Барлық қолданушы', value: profiles.length },
    { label: 'Тегін', value: free },
    { label: 'Төлеген', value: paid },
    { label: 'Әкімші', value: admins },
    { label: 'Курстар', value: courses.length },
    { label: 'Берілген қолжетімділік', value: enrollCount },
    { label: 'Жалпы түсім', value: formatKzt(revenue) },
  ]

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 24 }}>
        {cards.map((c) => (
          <div className="panel" key={c.label} style={{ margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brand-dark)' }}>{c.value}</div>
            <div className="muted small">{c.label}</div>
          </div>
        ))}
      </div>

      <h3>Жаңа тіркелгендер</h3>
      <table>
        <tbody>
          {recent.map((p) => (
            <tr key={p.id}>
              <td>
                <b>{p.full_name || '—'}</b> <span className="muted small">{p.email}</span>
                <div className="muted small">{new Date(p.created_at).toLocaleDateString('ru-RU')}</div>
              </td>
              <td className="actions"><span className="badge ok">{p.role}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
