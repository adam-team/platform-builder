import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CourseSaleCard from '../components/CourseSaleCard'
import { CONSULTATION_URL, DEFAULT_KP_LINK, courseBuyLink } from '../lib/content'
import type { Course } from '../lib/types'

// Әкімшіге ғана: курстардың сату беті (клиент көретіндей) және әр курстың «Курсты алу» батырмасының сілтемесін өзгерту.
// Сілтеме — КП беті («/offer/…», оны бетте «Өзгерту» арқылы өңдеуге болады) немесе WhatsApp/басқа сыртқы сілтеме.
export default function PaidCourses() {
  const [courses, setCourses] = useState<Course[] | null>(null)

  async function load() {
    const { data } = await supabase.from('courses').select('*').is('deleted_at', null).order('position')
    setCourses((data as Course[]) ?? [])
  }
  useEffect(() => { load() }, [])

  if (!courses) return <p className="muted">Жүктелуде…</p>

  return (
    <>
      <div className="section-head" style={{ marginTop: 20 }}>
        <span className="eyebrow" style={{ color: 'var(--brand)' }}>ӘКІМШІ</span>
        <h1>Ақылы курстар</h1>
        <p className="muted small" style={{ maxWidth: '62ch' }}>
          Клиент осы карточкаларды көреді. Әр курстың төменгі батырмасы қайда апаратынын осында өзгертесіз: КП бетіне немесе WhatsApp-қа (басқа сілтемеге).
          КП бетінің мәтінін өзгерту үшін сол бетті ашып, жоғарғы оң жақтағы «✎ Өзгерту» батырмасын басыңыз.
        </p>
      </div>

      <div className="grid grid-3">
        {courses.map((course) => (
          <CourseSaleCard key={course.id} course={course} open={false} footer={<BuyLinkEditor course={course} onSaved={load} />} />
        ))}
      </div>
      {courses.length === 0 && <p className="muted">Курс әлі жоқ.</p>}
    </>
  )
}

function BuyLinkEditor({ course, onSaved }: { course: Course; onSaved: () => void }) {
  const current = courseBuyLink(course) ?? ''
  const [value, setValue] = useState(current)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const internal = value.startsWith('/offer/')
  const presets = [
    { label: 'КП: Қарызсыз өмір', url: '/offer/karyzsyz-omir' },
    { label: 'КП: Ипотека PRO', url: '/offer/ipoteka-pro' },
    { label: 'WhatsApp', url: CONSULTATION_URL },
  ]

  async function save(next: string | null) {
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.from('courses').update({ buy_url: next }).eq('id', course.id)
    setBusy(false)
    if (error) return setMsg({ kind: 'error', text: /buy_url/.test(error.message) ? 'Supabase-те жаңа SQL-миграция (migration_35) іске қосылмаған.' : error.message })
    setMsg({ kind: 'ok', text: next ? 'Сақталды — батырма енді осы сілтемеге апарады.' : 'Стандартты сілтемеге қайтарылды.' })
    if (!next) setValue(DEFAULT_KP_LINK[course.category] ?? course.order_url ?? '')
    onSaved()
  }

  return (
    <div className="buy-link-editor">
      <label>«Курсты алу» батырмасының сілтемесі
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="/offer/… немесе https://wa.clck.bar/…" />
      </label>
      <div className="tag-input-suggest" style={{ margin: '0 0 8px' }}>
        {presets.map((p) => <button type="button" key={p.url} onClick={() => setValue(p.url)}>{p.label}</button>)}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || !value.trim() || value === current} onClick={() => save(value.trim())}>Сақтау</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || !course.buy_url} onClick={() => save(null)}>Стандартқа қайтару</button>
        {internal && <Link to={value} className="btn btn-outline btn-sm">КП бетін өзгерту →</Link>}
      </div>
      {msg && <p className={msg.kind === 'ok' ? 'success small' : 'error small'}>{msg.text}</p>}
    </div>
  )
}
