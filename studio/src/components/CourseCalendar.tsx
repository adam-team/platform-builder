import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { CourseEvent } from '../lib/types'

const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан']
const WEEKDAYS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс']

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const timeLabel = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export default function CourseCalendar({ courseId, isAdmin: editing }: { courseId: string; isAdmin: boolean }) {
  const [events, setEvents] = useState<CourseEvent[]>([])
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', starts_at: '', link: '' })
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('course_events').select('*').eq('course_id', courseId).order('starts_at')
    setEvents((data as CourseEvent[]) ?? [])
  }
  useEffect(() => { load() }, [courseId])

  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('course_events').insert({
      course_id: courseId,
      title: form.title,
      starts_at: new Date(form.starts_at).toISOString(),
      link: form.link || null,
    })
    if (error) return setError(error.message)
    setForm({ title: '', starts_at: '', link: '' })
    setAdding(false)
    load()
  }

  async function remove(id: string) {
    await supabase.from('course_events').delete().eq('id', id)
    load()
  }

  const byDay = new Map<string, CourseEvent[]>()
  for (const ev of events) {
    const k = dayKey(new Date(ev.starts_at))
    byDay.set(k, [...(byDay.get(k) ?? []), ev])
  }

  const firstWeekday = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const todayKey = dayKey(new Date())

  const now = Date.now()
  const listed = selected
    ? byDay.get(selected) ?? []
    : events.filter((ev) => new Date(ev.starts_at).getTime() >= now - 3600_000).slice(0, 4)

  return (
    <div className="aside-card">
      <h4 className="aside-title">Кесте</h4>
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Алдыңғы ай">‹</button>
        <b>{MONTHS[month.getMonth()]} {month.getFullYear()}</b>
        <button type="button" className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Келесі ай">›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => <span key={w} className="cal-wd">{w}</span>)}
        {cells.map((day, i) => {
          if (day == null) return <span key={i} />
          const k = `${month.getFullYear()}-${month.getMonth()}-${day}`
          const has = byDay.has(k)
          const cls = ['cal-day', has ? 'has' : '', k === todayKey ? 'today' : '', k === selected ? 'selected' : ''].join(' ')
          return (
            <button key={i} type="button" className={cls} onClick={() => setSelected(k === selected ? null : k)}>{day}</button>
          )
        })}
      </div>

      <div className="cal-events">
        {listed.length === 0 && <p className="muted small">{selected ? 'Бұл күні оқиға жоқ.' : 'Жақын арада оқиға жоқ.'}</p>}
        {listed.map((ev) => {
          const d = new Date(ev.starts_at)
          return (
            <div key={ev.id} className="cal-event">
              <span className="cal-event-date">{d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}<br />{timeLabel(d)}</span>
              <span className="cal-event-title">
                {ev.link ? <a href={ev.link} target="_blank" rel="noopener noreferrer">{ev.title}</a> : ev.title}
              </span>
              {editing && <button type="button" className="cal-del" onClick={() => remove(ev.id)} aria-label="Өшіру">✕</button>}
            </div>
          )
        })}
      </div>

      {editing && (adding ? (
        <form className="cal-form" onSubmit={add}>
          <input required placeholder="Оқиға атауы" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          <input placeholder="Сілтеме (Zoom, міндетті емес)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn btn-primary btn-sm">Қосу</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>Болдырмау</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-outline btn-sm btn-block" onClick={() => setAdding(true)}>+ Оқиға қосу</button>
      ))}
    </div>
  )
}
