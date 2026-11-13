import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CURRENT_SCHOOL_ID } from '../lib/school'
import type { Course, Profile, Role, Segment, SegmentCondition } from '../lib/types'

const ROLE_LABEL: Record<Role, string> = { free: 'тегін', paid: 'төлеген', curator: 'куратор', admin: 'әкімші' }

function matches(p: Profile, access: Set<string>, cond: SegmentCondition): boolean {
  if (cond.field === 'role') return p.role === cond.value
  if (cond.field === 'tag') return p.tags.includes(cond.value)
  if (cond.field === 'course_access') return cond.op === 'has' ? access.has(cond.value) : !access.has(cond.value)
  return true
}

// <SegmentBuilder> (ЭТАП_01, компонент B) v1 — тек «ЖӘНЕ» логикасы, шектеулі шарттар (рөл/тег/курсқа
// қолжетімділік). Толық нұсқа (ИЛИ/НЕ, тіркелген күн, тапсырма орындау және т.б.) — келесі кезекте.
export default function SegmentBuilder({
  profiles,
  accessByUser,
  courses,
  onFilteredChange,
}: {
  profiles: Profile[]
  accessByUser: Map<string, Set<string>>
  courses: Course[]
  onFilteredChange: (ids: Set<string> | null) => void
}) {
  const [conditions, setConditions] = useState<SegmentCondition[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [activeSegmentId, setActiveSegmentId] = useState('')

  useEffect(() => {
    supabase.from('segments').select('*').eq('entity', 'users').order('created_at', { ascending: false })
      .then(({ data }) => setSegments((data as Segment[]) ?? []))
  }, [])

  const matchedIds = conditions.length === 0
    ? null
    : new Set(profiles.filter((p) => conditions.every((c) => matches(p, accessByUser.get(p.id) ?? new Set(), c))).map((p) => p.id))

  useEffect(() => { onFilteredChange(matchedIds) }, [JSON.stringify(conditions)]) // eslint-disable-line react-hooks/exhaustive-deps

  function addCondition() {
    setConditions([...conditions, { field: 'role', op: 'eq', value: 'paid' }])
    setActiveSegmentId('')
  }
  function updateCondition(i: number, next: SegmentCondition) {
    setConditions(conditions.map((c, j) => (j === i ? next : c)))
    setActiveSegmentId('')
  }
  function removeCondition(i: number) {
    setConditions(conditions.filter((_, j) => j !== i))
    setActiveSegmentId('')
  }
  function reset() {
    setConditions([])
    setActiveSegmentId('')
  }
  function loadSegment(id: string) {
    setActiveSegmentId(id)
    const seg = segments.find((s) => s.id === id)
    setConditions(seg ? seg.conditions : [])
  }
  async function saveAsSegment() {
    const name = prompt('Сегменттің атауы:')
    if (!name) return
    const { data } = await supabase.from('segments').insert({ name, entity: 'users', conditions, school_id: CURRENT_SCHOOL_ID }).select('*').single()
    if (data) setSegments([data as Segment, ...segments])
  }

  return (
    <div className="segment-builder">
      <div className="row" style={{ alignItems: 'center' }}>
        <select value={activeSegmentId} onChange={(e) => (e.target.value ? loadSegment(e.target.value) : reset())}>
          <option value="">-- барлық пайдаланушылар --</option>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" className="secondary btn-sm" onClick={addCondition}>+ Шарт</button>
        {conditions.length > 0 && (
          <>
            <button type="button" className="secondary btn-sm" onClick={saveAsSegment}>Сегмент ретінде сақтау</button>
            <button type="button" className="secondary btn-sm" onClick={reset}>Сброс</button>
          </>
        )}
        <span className="muted small" style={{ marginLeft: 'auto' }}>
          {matchedIds === null ? `Барлығы: ${profiles.length}` : `Табылды: ${matchedIds.size}`}
        </span>
      </div>

      {conditions.map((c, i) => (
        <div className="row segment-condition" key={i}>
          <select
            value={c.field}
            onChange={(e) => {
              const field = e.target.value as SegmentCondition['field']
              if (field === 'role') updateCondition(i, { field, op: 'eq', value: 'paid' })
              else if (field === 'tag') updateCondition(i, { field, op: 'has', value: '' })
              else updateCondition(i, { field, op: 'has', value: courses[0]?.id ?? '' })
            }}
          >
            <option value="role">Рөлі</option>
            <option value="tag">Тегі</option>
            <option value="course_access">Курсқа қолжетімділік</option>
          </select>

          {c.field === 'role' && (
            <select value={c.value} onChange={(e) => updateCondition(i, { ...c, value: e.target.value as Role })}>
              {(['free', 'paid', 'curator', 'admin'] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          )}
          {c.field === 'tag' && (
            <input placeholder="тег атауы" value={c.value} onChange={(e) => updateCondition(i, { ...c, value: e.target.value })} />
          )}
          {c.field === 'course_access' && (
            <>
              <select value={c.op} onChange={(e) => updateCondition(i, { ...c, op: e.target.value as 'has' | 'not_has' })}>
                <option value="has">бар</option>
                <option value="not_has">жоқ</option>
              </select>
              <select value={c.value} onChange={(e) => updateCondition(i, { ...c, value: e.target.value })}>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </>
          )}
          <button type="button" className="secondary btn-sm" onClick={() => removeCondition(i)}>✕</button>
        </div>
      ))}
    </div>
  )
}
