import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { toLocalInput } from '../lib/access'
import type { CourseModule, Lesson } from '../lib/types'

export type LessonMeta = { lesson_id: string; assignment_text: string | null; duration_minutes: number | null }
type Access = 'open' | 'closed' | 'date'
type LessonDraft = { id?: string; number: string; title: string; hasAssignment: boolean; duration: string; access: Access; opensAt: string }

const MAX_LESSONS = 20

function accessOf(item: { is_locked: boolean; opens_at: string | null }): Access {
  return item.is_locked ? 'closed' : item.opens_at ? 'date' : 'open'
}

function AccessFields({ access, opensAt, onChange }: { access: Access; opensAt: string; onChange: (a: Access, d: string) => void }) {
  return (
    <div className="access-fields" title="Қолжетімділік">
      <select value={access} onChange={(e) => onChange(e.target.value as Access, opensAt)}>
        <option value="open">Ашық</option>
        <option value="closed">Жабық</option>
        <option value="date">Күні бойынша ашылады</option>
      </select>
      {access === 'date' && <input type="datetime-local" required value={opensAt} onChange={(e) => onChange(access, e.target.value)} />}
    </div>
  )
}

// Модуль қосу / өзгерту: нөмірі, атауы, қосымша тақырыбы, ашылу күні және сабақтар (20-ға дейін)
export default function ModuleForm({
  courseId, module, lessons, contentByLesson, nextNumber, onSaved, onCancel,
}: {
  courseId: string
  module?: CourseModule
  lessons: Lesson[]
  contentByLesson: Map<string, LessonMeta>
  nextNumber: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [number, setNumber] = useState(String(module?.position ?? nextNumber))
  const [title, setTitle] = useState(module?.title ?? '')
  const [subtitle, setSubtitle] = useState(module?.subtitle ?? '')
  const [access, setAccess] = useState<Access>(module ? accessOf(module) : 'open')
  const [opensAt, setOpensAt] = useState(toLocalInput(module?.opens_at))
  const [drafts, setDrafts] = useState<LessonDraft[]>(
    lessons.length > 0
      ? lessons.map((l) => {
          const meta = contentByLesson.get(l.id)
          return {
            id: l.id,
            number: String(l.position % 100 || 1),
            title: l.title,
            hasAssignment: !!meta?.assignment_text,
            duration: meta?.duration_minutes ? String(meta.duration_minutes) : '',
            access: accessOf(l),
            opensAt: toLocalInput(l.opens_at),
          }
        })
      : [{ number: '1', title: '', hasAssignment: false, duration: '', access: 'open', opensAt: '' }],
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function updateDraft(i: number, patch: Partial<LessonDraft>) {
    setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const num = Math.max(1, parseInt(number, 10) || nextNumber)
    const moduleRow = {
      course_id: courseId,
      position: num,
      number_label: String(num).padStart(2, '0'),
      title,
      subtitle: subtitle || null,
      is_locked: access === 'closed',
      opens_at: access === 'date' && opensAt ? new Date(opensAt).toISOString() : null,
    }
    let moduleId = module?.id
    if (module) {
      const { error } = await supabase.from('course_modules').update(moduleRow).eq('id', module.id)
      if (error) { setBusy(false); return setError(error.message) }
    } else {
      const { data, error } = await supabase.from('course_modules').insert(moduleRow).select('id').single()
      if (error || !data) { setBusy(false); return setError(error?.message ?? 'Қате') }
      moduleId = data.id as string
    }

    const keptIds = new Set(drafts.filter((d) => d.id).map((d) => d.id as string))
    for (const l of lessons) {
      if (!keptIds.has(l.id)) await supabase.from('lessons').update({ deleted_at: new Date().toISOString() }).eq('id', l.id)
    }

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      const lessonRow = {
        course_id: courseId,
        module_id: moduleId,
        module_title: title,
        title: d.title,
        position: num * 100 + Math.min(99, Math.max(1, parseInt(d.number, 10) || i + 1)),
        is_locked: d.access === 'closed',
        opens_at: d.access === 'date' && d.opensAt ? new Date(d.opensAt).toISOString() : null,
      }
      let lessonId = d.id
      if (d.id) {
        const { error } = await supabase.from('lessons').update(lessonRow).eq('id', d.id)
        if (error) { setBusy(false); return setError(error.message) }
      } else {
        const { data, error } = await supabase.from('lessons').insert({ ...lessonRow, is_free_preview: false }).select('id').single()
        if (error || !data) { setBusy(false); return setError(error?.message ?? 'Қате') }
        lessonId = data.id as string
      }
      const previous = d.id ? contentByLesson.get(d.id) : undefined
      const contentRow = {
        lesson_id: lessonId,
        assignment_text: d.hasAssignment ? previous?.assignment_text || 'Тапсырма мәтіні жақында қосылады.' : null,
        duration_minutes: d.duration ? Number(d.duration) : null,
      }
      const { error } = d.id
        ? await supabase.from('lesson_content').upsert(contentRow)
        : await supabase.from('lesson_content').insert({ ...contentRow, body: null, materials: [], timecodes: [] })
      if (error) { setBusy(false); return setError(error.message) }
    }
    setBusy(false)
    onSaved()
  }

  return (
    <form className="panel module-form" onSubmit={save}>
      <h3 style={{ marginBottom: 14 }}>{module ? 'Модульді өзгерту' : 'Жаңа модуль'}</h3>
      <div className="row">
        <label className="narrow">Модуль нөмірі<input type="number" min="1" required value={number} onChange={(e) => setNumber(e.target.value)} /></label>
        <label>Модуль атауы<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Қазіргі жағдайды талдау" /></label>
      </div>
      <label>Модуль туралы қысқаша (қосымша тақырып)<input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Бұл модульде не туралы айтылады" /></label>
      <div className="field-block">
        <span className="small muted">Модульдің қолжетімділігі (төлеген оқушылар үшін)</span>
        <AccessFields access={access} opensAt={opensAt} onChange={(a, d) => { setAccess(a); setOpensAt(d) }} />
      </div>

      <p className="small muted" style={{ margin: '14px 0 8px' }}>Сабақтар ({drafts.length} / {MAX_LESSONS}):</p>
      {drafts.map((d, i) => (
        <div key={d.id ?? `new-${i}`} className="lesson-draft">
          <div className="row">
            <label className="narrow">№<input type="number" min="1" max="99" value={d.number} onChange={(e) => updateDraft(i, { number: e.target.value })} /></label>
            <label>Сабақ атауы<input required value={d.title} onChange={(e) => updateDraft(i, { title: e.target.value })} /></label>
            <label className="narrow">Минут<input type="number" min="0" value={d.duration} onChange={(e) => updateDraft(i, { duration: e.target.value })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={d.hasAssignment} onChange={(e) => updateDraft(i, { hasAssignment: e.target.checked })} /> Тапсырма бар</label>
          <span className="small muted">Сабақтың қолжетімділігі:</span>
          <AccessFields access={d.access} opensAt={d.opensAt} onChange={(a, date) => updateDraft(i, { access: a, opensAt: date })} />
          <button type="button" className="btn btn-outline btn-sm btn-delete-lesson" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}>Сабақты өшіру</button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={drafts.length >= MAX_LESSONS}
        onClick={() => setDrafts([...drafts, { number: String(drafts.length + 1), title: '', hasAssignment: false, duration: '', access: 'open', opensAt: '' }])}
      >
        + Сабақ қосу
      </button>

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Сақталып жатыр…' : 'Сақтау'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Болдырмау</button>
      </div>
    </form>
  )
}
