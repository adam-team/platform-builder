import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface SessionRow { id: string; visitor_id: string; utm_source: string | null; device: string | null; created_at: string }
interface EventRow { event_type: string; session_id: string }

// ЭТАП_11 «Трафик» — тек негізгі шолу: келушілер/тіркелулер/конверсия соңғы 30 күнде + көз бойынша
// бөлу. Көп өлшемді есептер, когорталар, ROI, сессия таймлайны — жоқ (честно, README-де жазылған).
export default function AdminTraffic() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    Promise.all([
      supabase.from('traffic_sessions').select('id, visitor_id, utm_source, device, created_at').gte('created_at', since),
      supabase.from('traffic_events').select('event_type, session_id').gte('created_at', since),
    ]).then(([s, e]) => {
      setSessions((s.data as SessionRow[]) ?? [])
      setEvents((e.data as EventRow[]) ?? [])
    })
  }, [])

  if (!sessions) return <p className="muted">Жүктелуде…</p>

  const visitors = new Set(sessions.map((s) => s.visitor_id)).size
  const pageviews = events.filter((e) => e.event_type === 'pageview').length
  const registrations = events.filter((e) => e.event_type === 'register').length
  const conversion = visitors === 0 ? 0 : Math.round((registrations / visitors) * 1000) / 10

  const bySource = new Map<string, number>()
  for (const s of sessions) {
    const key = s.utm_source || 'тікелей / белгісіз'
    bySource.set(key, (bySource.get(key) ?? 0) + 1)
  }
  const sourceRows = [...bySource.entries()].sort((a, b) => b[1] - a[1])

  if (sessions.length === 0) {
    return (
      <div className="notice">
        <h3 style={{ marginBottom: 6 }}>Деректер әлі жоқ</h3>
        <p className="muted small">
          Трекер сайттың әр бетінде іске қосылған — келушілер жиналған соң осы жерде статистика көрінеді.
          Демо-режимде деректер жиналмайды (ойдан шығарылған деректерге қоспау үшін).
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="muted small">Соңғы 30 күн.</p>
      <div className="row" style={{ marginBottom: 18 }}>
        <div className="panel" style={{ flex: '1 1 160px', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-dark)' }}>{visitors}</div>
          <div className="muted small">келушілер</div>
        </div>
        <div className="panel" style={{ flex: '1 1 160px', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{pageviews}</div>
          <div className="muted small">бет қаралымы</div>
        </div>
        <div className="panel" style={{ flex: '1 1 160px', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{registrations}</div>
          <div className="muted small">тіркелулер</div>
        </div>
        <div className="panel" style={{ flex: '1 1 160px', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{conversion}%</div>
          <div className="muted small">тіркелуге конверсия</div>
        </div>
      </div>

      <h4>Дереккөздер (UTM source)</h4>
      <table>
        <tbody>
          {sourceRows.map(([source, count]) => (
            <tr key={source}>
              <td>{source}</td>
              <td className="actions">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
