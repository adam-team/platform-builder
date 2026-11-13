import { useEffect, useState, type FormEvent } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../lib/supabase'
import { VIDEO_ERROR, parseVideoInput, videoInputFromStored } from '../../lib/video'
import { CATEGORY_ORDER, CATEGORY } from '../../lib/content'
import { useUndoToast } from '../../components/UndoToast'
import DataTable, { type DataTableColumn } from '../../components/DataTable'
import TagInput from '../../components/TagInput'
import TrashPanel from '../../components/TrashPanel'
import type { Category, Course, Lesson, Material, Timecode, UserGroup } from '../../lib/types'
import { scheduleBackup } from '../../lib/backup'

const linesToList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

// GetCourse-тегі «Тренингтер» сияқты: тізім → таңдалған курс → «Мазмұны / Баптаулар» табтары.
// Курсты ашпай тұрып өзгерту мүмкін емес — алдымен ішіне кіресіз, содан кейін өзгертесіз.
export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState('')
  const { show: showUndo } = useUndoToast()

  async function load() {
    const { data } = await supabase.from('courses').select('*').is('deleted_at', null).order('position')
    setCourses((data as Course[]) ?? [])
  }
  useEffect(() => { load() }, [])

  const selected = courses.find((c) => c.id === selectedId) ?? null

  async function createCourse(e: FormEvent) {
    e.preventDefault()
    setError('')
    const { data, error } = await supabase
      .from('courses')
      .insert({ title: newTitle, category: 'debt', is_published: false, position: courses.length })
      .select('id')
      .single()
    if (error || !data) return setError(error?.message ?? 'Қате')
    setNewTitle('')
    setCreating(false)
    scheduleBackup()
    await load()
    setSelectedId(data.id as string)
  }

  async function remove(course: Course) {
    await supabase.from('courses').update({ deleted_at: new Date().toISOString() }).eq('id', course.id)
    if (selectedId === course.id) setSelectedId(null)
    scheduleBackup()
    load()
    showUndo(`«${course.title}» өшірілді.`, async () => {
      await supabase.from('courses').update({ deleted_at: null }).eq('id', course.id)
      scheduleBackup()
      load()
    })
  }

  async function bulkPublish(ids: string[], value: boolean) {
    await supabase.from('courses').update({ is_published: value }).in('id', ids)
    load()
  }
  async function bulkDelete(ids: string[]) {
    await supabase.from('courses').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    load()
    showUndo(`${ids.length} курс өшірілді.`, async () => {
      await supabase.from('courses').update({ deleted_at: null }).in('id', ids)
      load()
    })
  }

  if (selected) {
    return <CourseDetail course={selected} onBack={() => setSelectedId(null)} onChanged={load} />
  }

  const columns: DataTableColumn<Course>[] = [
    {
      key: 'title', label: 'Атауы', sortable: true,
      render: (c) => (
        <span onClick={() => setSelectedId(c.id)} style={{ cursor: 'pointer' }}>
          <b>{c.title}</b> {!c.is_published && <span className="badge">жоба</span>}
        </span>
      ),
    },
    {
      key: 'category', label: 'Бағыт', sortable: true, filterable: false,
      value: (c) => CATEGORY[c.category].label,
      render: (c) => <span className="badge" style={{ borderColor: CATEGORY[c.category].color, color: CATEGORY[c.category].color }}>{CATEGORY[c.category].label}</span>,
    },
    {
      key: 'actions', label: '', filterable: false,
      render: (c) => (
        <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <button className="secondary btn-sm" onClick={() => setSelectedId(c.id)}>Ашу →</button>
          <button className="danger btn-sm" onClick={() => remove(c)}>Өшіру</button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Тренингтер</h3>
        <div className="row" style={{ gap: 8 }}>
          <TrashPanel table="courses" titleField="title" onRestored={load} />
          <button onClick={() => setCreating((v) => !v)}>{creating ? 'Болдырмау' : '+ Жаңа курс'}</button>
        </div>
      </div>

      {creating && (
        <form className="panel" onSubmit={createCourse}>
          <label>Атауы<input required autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></label>
          {error && <p className="error">{error}</p>}
          <button>Құру және ашу</button>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={courses}
        emptyState={<p className="muted">Курстар әлі жоқ. «+ Жаңа курс» батырмасын басыңыз.</p>}
        bulkActions={[
          { label: 'Жариялау', onRun: (ids) => bulkPublish(ids, true) },
          { label: 'Жасыру', onRun: (ids) => bulkPublish(ids, false) },
          { label: 'Өшіру', danger: true, onRun: bulkDelete },
        ]}
      />
    </>
  )
}

const DETAIL_TABS = ['Мазмұны', 'Қолжетімділік', 'Баптаулар'] as const

function CourseDetail({ course, onBack, onChanged }: { course: Course; onBack: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<(typeof DETAIL_TABS)[number]>('Мазмұны')

  return (
    <div>
      <p className="small muted" style={{ marginBottom: 6 }}>
        <button className="secondary" onClick={onBack}>← Тренингтер</button>
      </p>
      <h2 style={{ marginBottom: 4 }}>{course.title}</h2>
      <span className="badge" style={{ borderColor: CATEGORY[course.category].color, color: CATEGORY[course.category].color, marginBottom: 16, display: 'inline-block' }}>
        {CATEGORY[course.category].label}
      </span>

      <div className="tabs" style={{ marginTop: 12 }}>
        {DETAIL_TABS.map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Мазмұны' && <LessonsManager course={course} />}
      {tab === 'Қолжетімділік' && <CourseAccessTab course={course} />}
      {tab === 'Баптаулар' && <CourseSettingsForm course={course} onSaved={onChanged} />}
    </div>
  )
}

// «Доступ» ⭐ (ЭТАП_03) — «главный механизм»: Топ → Курс. Топ мүшесі болса, курс автоматты ашылады
// (can_view_lesson SQL функциясы арқылы — тікелей enrollments-тен бөлек тексеріледі).
function CourseAccessTab({ course }: { course: Course }) {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set())
  const [directCount, setDirectCount] = useState(0)

  async function load() {
    const [g, m, link, enr] = await Promise.all([
      supabase.from('user_groups').select('*').is('deleted_at', null).order('name'),
      supabase.from('user_group_members').select('group_id'),
      supabase.from('course_group_access').select('group_id').eq('course_id', course.id),
      supabase.from('enrollments').select('user_id').eq('course_id', course.id),
    ])
    setGroups((g.data as UserGroup[]) ?? [])
    const counts: Record<string, number> = {}
    for (const row of m.data ?? []) counts[row.group_id] = (counts[row.group_id] ?? 0) + 1
    setMemberCounts(counts)
    setLinkedIds(new Set((link.data ?? []).map((r) => r.group_id)))
    setDirectCount((enr.data ?? []).length)
  }
  useEffect(() => { load() }, [course.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(groupId: string, linked: boolean) {
    if (linked) await supabase.from('course_group_access').delete().eq('course_id', course.id).eq('group_id', groupId)
    else await supabase.from('course_group_access').insert({ course_id: course.id, group_id: groupId })
    load()
  }

  const groupTotal = groups.filter((g) => linkedIds.has(g.id)).reduce((sum, g) => sum + (memberCounts[g.id] ?? 0), 0)

  return (
    <div className="panel">
      <h4 style={{ marginTop: 0 }}>Топтар арқылы қолжетімділік</h4>
      <p className="muted small">Таңдалған топтың кез келген мүшесі бұл курсты автоматты түрде көреді (Продукт → Топ → Курс тізбегі).</p>
      {groups.length === 0 && <p className="muted small">Топтар әлі жоқ — «Оқушылар → Топтар» бөлімінде құрыңыз.</p>}
      {groups.map((g) => {
        const linked = linkedIds.has(g.id)
        return (
          <label key={g.id} className="check">
            <input type="checkbox" checked={linked} onChange={() => toggle(g.id, linked)} /> {g.name}{' '}
            <span className="muted small">({memberCounts[g.id] ?? 0} оқушы)</span>
          </label>
        )
      })}
      <p className="small" style={{ marginTop: 12 }}>
        {linkedIds.size === 0 && directCount === 0 ? (
          <span className="error">⚠ Ешкім қолжетімділік бермеген — бұл курсты ешкім көрмейді.</span>
        ) : (
          <>Қазір қолжетімділік бар: <b>{directCount}</b> оқушыда тікелей + топтар арқылы шамамен <b>{groupTotal}</b> оқушыда (қабаттасулар болуы мүмкін).</>
        )}
      </p>
    </div>
  )
}

function CourseSettingsForm({ course, onSaved }: { course: Course; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: course.title,
    description: course.description ?? '',
    featuresIntro: course.features_intro ?? '',
    features: course.features.join('\n'),
    category: course.category,
    price_kzt: course.price_kzt?.toString() ?? '',
    old_price_kzt: course.old_price_kzt?.toString() ?? '',
    payment_url: course.payment_url ?? '',
    position: String(course.position ?? 0),
    is_published: course.is_published,
  })
  const [tags, setTags] = useState<string[]>(course.tags ?? [])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    const row = {
      title: form.title,
      description: form.description || null,
      features_intro: form.featuresIntro || null,
      features: linesToList(form.features),
      category: form.category,
      price_kzt: form.price_kzt ? Number(form.price_kzt) : null,
      old_price_kzt: form.old_price_kzt ? Number(form.old_price_kzt) : null,
      payment_url: form.payment_url || null,
      position: Number(form.position) || 0,
      is_published: form.is_published,
      tags,
    }
    const { error } = await supabase.from('courses').update(row).eq('id', course.id)
    if (error) return setError(error.message)
    setSaved(true)
    scheduleBackup()
    onSaved()
  }

  return (
    <form className="panel" onSubmit={save}>
      <label>Атауы<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label>Сипаттама<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label>Артықшылықтар тізімінің тақырыбы (мысалы «Курс нәтижесінде сіз:»)
        <input value={form.featuresIntro} onChange={(e) => setForm({ ...form, featuresIntro: e.target.value })} />
      </label>
      <label>Артықшылықтар тізімі (әр жол — жеке пункт)
        <textarea rows={5} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
      </label>
      <div className="row">
        <label>Бағыт (түс)
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY[c].label}</option>)}
          </select>
        </label>
        <label className="narrow">Реті<input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label>
      </div>
      <div className="row">
        <label>Ескі баға, ₸ (жеңілдік үшін, міндетті емес)<input type="number" min="0" value={form.old_price_kzt} onChange={(e) => setForm({ ...form, old_price_kzt: e.target.value })} /></label>
        <label>Баға, ₸<input type="number" min="0" value={form.price_kzt} onChange={(e) => setForm({ ...form, price_kzt: e.target.value })} /></label>
      </div>
      <label>Kaspi Pay төлем сілтемесі<input value={form.payment_url} onChange={(e) => setForm({ ...form, payment_url: e.target.value })} /></label>
      <label className="check"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Жарияланды (клиенттерге көрінеді)</label>
      <label>Тегтер (ішкі белгілеу, клиенттерге көрінбейді)<TagInput value={tags} onChange={setTags} /></label>
      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Сақталды.</p>}
      <button>Сақтау</button>
    </form>
  )
}

const emptyLesson = { title: '', module_title: '', position: '0', video: '', duration_minutes: '', body: '', assignment_text: '', is_free_preview: false, is_stop_lesson: false }
const emptyMaterial: Material = { title: '', url: '', kind: 'PDF' }
const emptyTimecode: Timecode = { time: '0:00', label: '' }

function LessonsManager({ course }: { course: Course }) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [form, setForm] = useState(emptyLesson)
  const [materials, setMaterials] = useState<Material[]>([])
  const [timecodes, setTimecodes] = useState<Timecode[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const { show: showUndo } = useUndoToast()

  async function load() {
    const { data } = await supabase.from('lessons').select('*').eq('course_id', course.id).is('deleted_at', null).order('position')
    setLessons((data as Lesson[]) ?? [])
  }
  useEffect(() => { load() }, [course.id])

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    let youtubeId: string | null = null
    if (form.video.trim()) {
      youtubeId = parseVideoInput(form.video)
      if (!youtubeId) return setError(VIDEO_ERROR)
    }

    const row = {
      course_id: course.id,
      title: form.title,
      module_title: form.module_title || null,
      position: Number(form.position) || 0,
      is_free_preview: form.is_free_preview,
      is_stop_lesson: form.is_stop_lesson,
    }
    let lessonId = editingId
    if (editingId) {
      const { error } = await supabase.from('lessons').update(row).eq('id', editingId)
      if (error) return setError(error.message)
    } else {
      const { data, error } = await supabase.from('lessons').insert(row).select('id').single()
      if (error || !data) return setError(error?.message ?? 'Қате')
      lessonId = data.id as string
    }
    const { error } = await supabase
      .from('lesson_content')
      .upsert({
        lesson_id: lessonId,
        youtube_id: youtubeId,
        body: form.body || null,
        assignment_text: form.assignment_text || null,
        materials: materials.filter((m) => m.title && m.url),
        timecodes: timecodes.filter((t) => t.time && t.label),
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      })
    if (error) return setError(error.message)

    setForm({ ...emptyLesson, position: String(lessons.length + 1) })
    setMaterials([])
    setTimecodes([])
    setEditingId(null)
    setAdding(false)
    scheduleBackup()
    load()
  }

  async function edit(lesson: Lesson) {
    const { data } = await supabase.from('lesson_content').select('*').eq('lesson_id', lesson.id).maybeSingle()
    setEditingId(lesson.id)
    setAdding(true)
    setForm({
      title: lesson.title,
      module_title: lesson.module_title ?? '',
      position: String(lesson.position),
      video: videoInputFromStored(data?.youtube_id),
      duration_minutes: data?.duration_minutes ? String(data.duration_minutes) : '',
      body: data?.body ?? '',
      assignment_text: data?.assignment_text ?? '',
      is_free_preview: lesson.is_free_preview,
      is_stop_lesson: lesson.is_stop_lesson,
    })
    setMaterials((data?.materials as Material[]) ?? [])
    setTimecodes((data?.timecodes as Timecode[]) ?? [])
  }

  function startAdd() {
    setEditingId(null)
    setForm({ ...emptyLesson, position: String(lessons.length + 1) })
    setMaterials([])
    setTimecodes([])
    setAdding(true)
  }

  async function remove(lesson: Lesson) {
    await supabase.from('lessons').update({ deleted_at: new Date().toISOString() }).eq('id', lesson.id)
    scheduleBackup()
    load()
    showUndo(`«${lesson.title}» сабағы өшірілді.`, async () => {
      await supabase.from('lessons').update({ deleted_at: null }).eq('id', lesson.id)
      scheduleBackup()
      load()
    })
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>Сабақтар</h4>
        <div className="row" style={{ gap: 8 }}>
          <TrashPanel table="lessons" titleField="title" matchColumn="course_id" matchValue={course.id} onRestored={load} />
          {!adding && <button onClick={startAdd}>+ Сабақ қосу</button>}
        </div>
      </div>
      <LessonsTable lessons={lessons} onEdit={edit} onRemove={remove} onReordered={load} />

      {adding && (
        <form className="panel" onSubmit={save}>
          <h4>{editingId ? 'Сабақты өзгерту' : 'Жаңа сабақ'}</h4>
          <div className="row">
            <label>Атауы<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="narrow">Реті<input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label>
          </div>
          <label>Модуль атауы (сабақтарды топтастыру үшін, міндетті емес)<input value={form.module_title} onChange={(e) => setForm({ ...form, module_title: e.target.value })} placeholder="1-модуль. Қазіргі жағдайды талдау" /></label>
          <div className="row">
            <label>Видео сілтемесі — Kinescope немесе YouTube (клиенттер сілтемені көрмейді)<input value={form.video} onChange={(e) => setForm({ ...form, video: e.target.value })} placeholder="https://kinescope.io/... немесе https://youtu.be/..." /></label>
            <label className="narrow">Ұзақтығы, мин<input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="15" /></label>
          </div>
          <label>Сабақ мәтіні (Сипаттама, әр жолды жаңа тармақтан бастасаңыз — тізім болып көрінеді)<textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={'Бір ғана мәтін де болады,\nне әр жол — жеке тармақ (checklist түрінде)'} /></label>
          <label>Тапсырма мәтіні (оқушылар осыны көреді және жауап жазады)
            <textarea rows={3} value={form.assignment_text} onChange={(e) => setForm({ ...form, assignment_text: e.target.value })} placeholder="Мысалы: өз төлем қабілеттілігіңізді есептеп, нәтижені төменде жазыңыз." />
          </label>

          <p className="small muted">Материалдар (PDF, кесте, чек-лист):</p>
          {materials.map((m, i) => (
            <div className="row" key={i}>
              <label className="narrow">Түрі<input value={m.kind} onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))} /></label>
              <label>Атауы<input value={m.title} onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></label>
              <label>Сілтеме<input value={m.url} onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} /></label>
              <button type="button" className="secondary" onClick={() => setMaterials(materials.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setMaterials([...materials, { ...emptyMaterial }])}>+ Материал қосу</button>

          <p className="small muted" style={{ marginTop: 14 }}>Тайм-кодтар (видеода басу арқылы секіру үшін, міндетті емес):</p>
          {timecodes.map((t, i) => (
            <div className="row" key={i}>
              <label className="narrow">Уақыты<input value={t.time} onChange={(e) => setTimecodes(timecodes.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} placeholder="1:20" /></label>
              <label>Атауы<input value={t.label} onChange={(e) => setTimecodes(timecodes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Негізгі идея" /></label>
              <button type="button" className="secondary" onClick={() => setTimecodes(timecodes.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setTimecodes([...timecodes, { ...emptyTimecode }])}>+ Тайм-код қосу</button>

          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={form.is_free_preview} onChange={(e) => setForm({ ...form, is_free_preview: e.target.checked })} /> Тегін сабақ (төлемсіз көрінеді)
          </label>
          <label className="check">
            <input type="checkbox" checked={form.is_stop_lesson} onChange={(e) => setForm({ ...form, is_stop_lesson: e.target.checked })} /> Стоп-сабақ (тапсырма қабылданғанша келесі сабақ ашылмайды)
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button>{editingId ? 'Сабақты сақтау' : 'Сабақ қосу'}</button>
            <button type="button" className="secondary" onClick={() => { setAdding(false); setEditingId(null) }}>Болдырмау</button>
          </div>
        </form>
      )}
    </div>
  )
}

// Drag-and-drop (dnd-kit) — сабақ ретін ⋮⋮ ұстап тасымалдап өзгерту, бөлек «ретін өзгерту» бетінсіз
function LessonsTable({
  lessons, onEdit, onRemove, onReordered,
}: { lessons: Lesson[]; onEdit: (l: Lesson) => void; onRemove: (l: Lesson) => void; onReordered: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = lessons.findIndex((l) => l.id === active.id)
    const newIndex = lessons.findIndex((l) => l.id === over.id)
    const next = arrayMove(lessons, oldIndex, newIndex)
    await Promise.all(next.map((l, i) => supabase.from('lessons').update({ position: i + 1 }).eq('id', l.id)))
    onReordered()
  }

  if (lessons.length === 0) return <p className="muted">Сабақтар әлі жоқ</p>

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <table>
          <tbody>
            {lessons.map((l) => (
              <SortableLessonRow key={l.id} lesson={l} onEdit={onEdit} onRemove={onRemove} />
            ))}
          </tbody>
        </table>
      </SortableContext>
    </DndContext>
  )
}

function SortableLessonRow({ lesson: l, onEdit, onRemove }: { lesson: Lesson; onEdit: (l: Lesson) => void; onRemove: (l: Lesson) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: l.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ width: 24, cursor: 'grab', color: 'var(--muted)' }} {...attributes} {...listeners}>⋮⋮</td>
      <td onClick={() => onEdit(l)} style={{ cursor: 'pointer' }}>
        {l.position}. {l.module_title && <span className="muted small">{l.module_title} · </span>}{l.title}{' '}
        {l.is_free_preview && <span className="badge ok">тегін</span>} {l.is_stop_lesson && <span className="badge">🛑 стоп</span>}
      </td>
      <td className="actions">
        <button className="secondary" onClick={() => onEdit(l)}>Өзгерту</button>
        <button className="danger" onClick={() => onRemove(l)}>Өшіру</button>
      </td>
    </tr>
  )
}
