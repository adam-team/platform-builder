import Collapsible from '../components/Collapsible'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { coursePageBackground, courseCardAccent, courseTitleAccent, formatKzt, ratingInk } from '../lib/content'
import { formatOpenDate, isOpenNow } from '../lib/access'
import { createDefaultModules } from '../lib/defaultModules'
import { uploadCourseImage } from '../lib/media'
import CourseCalendar from '../components/CourseCalendar'
import { ChatsCard, Top30Card } from '../components/CourseAsideCards'
import CourseThemePanel from '../components/CourseThemePanel'
import ModuleForm, { type LessonMeta } from '../components/ModuleForm'
import type { Course, CourseModule, Lesson } from '../lib/types'
import { isStaff } from '../lib/roles'

type Group = { key: string; module: CourseModule | null; title: string; lessons: Lesson[] }


// Онлайн-оплата Freedom Pay включается переменной VITE_PAYMENT_PROVIDER=freedom (см. docs/PAYMENTS.md)
const ONLINE_PAY = import.meta.env.VITE_PAYMENT_PROVIDER === 'freedom'

export default function CoursePage() {
  const { courseId } = useParams()
  const { profile, session } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [moduleRows, setModuleRows] = useState<CourseModule[]>([])
  const [contentByLesson, setContentByLesson] = useState<Map<string, LessonMeta>>(new Map())
  const [hasAccess, setHasAccess] = useState(false)
  const [pending, setPending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [creatingModules, setCreatingModules] = useState(false)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const lastLoadKey = useRef('')

  const isAdmin = profile?.role === 'admin'
  const staff = isStaff(profile?.role)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    if (!courseId) return
    const key = `${courseId}:${profile?.id ?? ''}`
    if (lastLoadKey.current !== key) { setLoaded(false); lastLoadKey.current = key }
    Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('lessons').select('*').eq('course_id', courseId).is('deleted_at', null).order('position'),
      supabase.from('course_modules').select('*').eq('course_id', courseId).order('position'),
      profile ? supabase.from('enrollments').select('id').eq('user_id', profile.id).eq('course_id', courseId) : Promise.resolve({ data: [] as { id: string }[] }),
      profile ? supabase.from('payments').select('id').eq('user_id', profile.id).eq('course_id', courseId).eq('status', 'pending') : Promise.resolve({ data: [] as { id: string }[] }),
      profile ? supabase.from('lesson_progress').select('lesson_id').eq('user_id', profile.id) : Promise.resolve({ data: [] as { lesson_id: string }[] }),
    ]).then(async ([c, l, m, e, p, pr]) => {
      const courseLessons = (l.data as Lesson[]) ?? []
      setCourse(c.data as Course | null)
      setLessons(courseLessons)
      setModuleRows((m.data as CourseModule[]) ?? [])
      setHasAccess(isStaff(profile?.role) || (e.data?.length ?? 0) > 0)
      setPending((p.data?.length ?? 0) > 0)
      setDoneIds(new Set(((pr.data ?? []) as { lesson_id: string }[]).map((x) => x.lesson_id)))
      const { data: contentRows } = courseLessons.length
        ? await supabase.from('lesson_content').select('lesson_id, assignment_text, duration_minutes').in('lesson_id', courseLessons.map((x) => x.id))
        : { data: [] as LessonMeta[] }
      setContentByLesson(new Map(((contentRows as LessonMeta[]) ?? []).map((x) => [x.lesson_id, x])))
      setLoaded(true)
    })
  }, [profile, courseId, reloadKey])

  // Модуль жолдары (course_modules) + әлі модулі жоқ бұрынғы сабақтар (module_title бойынша)
  const groups = useMemo<Group[]>(() => {
    const result: Group[] = moduleRows.map((m) => ({ key: m.id, module: m, title: m.title, lessons: lessons.filter((l) => l.module_id === m.id) }))
    const known = new Set(moduleRows.map((m) => m.id))
    for (const lesson of lessons) {
      if (lesson.module_id && known.has(lesson.module_id)) continue
      const title = lesson.module_title || ''
      let g = result.find((x) => !x.module && x.title === title)
      if (!g) { g = { key: `legacy-${title}`, module: null, title, lessons: [] }; result.push(g) }
      g.lessons.push(lesson)
    }
    return result
  }, [moduleRows, lessons])

  useEffect(() => {
    const b = document.body
    b.style.background = coursePageBackground({ page_bg: course?.page_bg ?? null, bg_image_url: course?.bg_image_url ?? null })
    return () => { b.style.background = '' }
  }, [course?.page_bg, course?.bg_image_url])

  function toggleModule(key: string) {
    setOpenModules((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const moduleOpen = (g: Group) => staff || !g.module || isOpenNow(g.module)
  const lessonOpen = (l: Lesson, g: Group) => (hasAccess || l.is_free_preview) && moduleOpen(g) && (staff || isOpenNow(l))

  // Жабық па, әлде күні бойынша ашыла ма — оқушыға түсінікті жазу
  function lockNote(item: { is_locked?: boolean; opens_at?: string | null } | null): string {
    if (item && !item.is_locked && item.opens_at && !isOpenNow(item)) return `🗓 ${formatOpenDate(item.opens_at)} ашылады`
    return '🔒 Құлыпталған'
  }
  // Әкімшіге ғана: ашылу күні / жабық екенін көрсететін белгі
  function adminNote(item: { is_locked?: boolean; opens_at?: string | null } | null): string {
    if (!isAdmin || !item) return ''
    if (item.is_locked) return ' · жабық'
    if (item.opens_at && !isOpenNow(item)) return ` · 🗓 ${formatOpenDate(item.opens_at)} ашылады`
    return ''
  }

  function renderLessonRow(lesson: Lesson, index: number, g: Group) {
    const open = lessonOpen(lesson, g)
    const meta = contentByLesson.get(lesson.id)
    const number = lesson.module_id ? lesson.position % 100 || index + 1 : index + 1
    const parts: string[] = [open ? 'Ашық сабақ' : (hasAccess || lesson.is_free_preview) ? lockNote(!moduleOpen(g) ? g.module : lesson) : 'Құлыпталған']
    if (meta?.duration_minutes) parts.push(`${meta.duration_minutes} мин`)
    if (meta?.assignment_text) parts.push('Тапсырма бар')
    const content = (
      <>
        <span className="lesson-row-text">
          <span className="lesson-row-title">{number}-сабақ: {lesson.title}</span>
          <span className="lesson-row-meta">{parts.join(' · ')}{adminNote(lesson)}</span>
        </span>
        <span className="lesson-row-arrow">{open ? '→' : '🔒'}</span>
      </>
    )
    return open ? (
      <Link key={lesson.id} to={`/lesson/${lesson.id}`} className="lesson-row">{content}</Link>
    ) : (
      <div key={lesson.id} className="lesson-row locked">{content}</div>
    )
  }

  async function deleteModule(g: Group) {
    if (!course) return
    if (!window.confirm(`«${g.title || 'Модуль'}» модулін және ішіндегі ${g.lessons.length} сабақты өшіресіз бе?`)) return
    const now = new Date().toISOString()
    if (g.lessons.length) await supabase.from('lessons').update({ deleted_at: now }).in('id', g.lessons.map((l) => l.id))
    if (g.module) await supabase.from('course_modules').delete().eq('id', g.module.id)
    reload()
  }

  async function changeCover(file: File | undefined) {
    if (!file || !course) return
    setUploadError('')
    const res = await uploadCourseImage(file, course.id)
    if (res.error || !res.url) return setUploadError(res.error ?? 'Жүктеу қатесі')
    const { error } = await supabase.from('courses').update({ cover_image_url: res.url }).eq('id', course.id)
    if (error) return setUploadError(error.message)
    reload()
  }

  async function removeCover() {
    if (!course || !window.confirm('Тақырып суретін өшіресіз бе?')) return
    await supabase.from('courses').update({ cover_image_url: null }).eq('id', course.id)
    reload()
  }

  // Два режима оплаты (docs/PAYMENTS.md):
  // • VITE_PAYMENT_PROVIDER=freedom — онлайн через Freedom Pay: сервер создаёт платёж, ученик платит
  //   на странице Freedom Pay (карта, Kaspi QR и др.), курс открывается сам после оплаты (/api/pay-result).
  // • иначе — вручную: фиксируем заявку и открываем ссылку Kaspi Pay; админ подтверждает в «Продажах».
  async function buy() {
    if (!profile || !course) return
    setBusy(true)
    if (ONLINE_PAY) {
      const { data } = await supabase.auth.getSession()
      const r = await fetch('/api/pay-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ courseId: course.id }),
      })
      const j = await r.json().catch(() => ({}))
      setBusy(false)
      if (j.url) window.location.href = j.url
      else window.alert(j.error ?? 'Не удалось перейти к оплате')
      return
    }
    if (!pending) {
      await supabase.from('payments').insert({ user_id: profile.id, course_id: course.id, amount_kzt: course.price_kzt })
      setPending(true)
    }
    setBusy(false)
    if (course.payment_url) window.open(course.payment_url, '_blank', 'noopener')
  }

  if (!loaded) return <p className="muted">Жүктелуде…</p>
  if (!course) return <p>Курс табылмады. <Link to="/courses">← Барлық курстар</Link></p>

  const editing = isAdmin && editMode
  const accent = courseCardAccent(course)
  const titleAccent = courseTitleAccent(course)
  const doneCount = lessons.filter((l) => doneIds.has(l.id)).length
  const percent = lessons.length === 0 ? 0 : Math.round((doneCount / lessons.length) * 100)
  const nextNumber = Math.max(0, ...moduleRows.map((m) => m.position)) + 1

  const progressCard = (
    <div className="aside-card progress-card">
      <span className="progress-big">{percent}%</span>
      <div className="progress-track on-light"><span style={{ width: `${percent}%` }} /></div>
      <span className="muted small">Оқу прогресі · {doneCount} / {lessons.length} сабақ</span>
    </div>
  )

  return (
    <div
      className="course-stage"
      style={{
        ['--course-accent' as string]: accent.gradient, ['--course-solid' as string]: accent.solid, ['--course-ink' as string]: accent.ink,
        ['--course-rating-ink' as string]: ratingInk(course),
        ['--course-title-accent' as string]: titleAccent.gradient, ['--course-title-ink' as string]: titleAccent.ink,
      }}
    >
      <div className="course-topbar">
        <p className="course-back"><Link to="/my-courses">← Курстарға оралу</Link></p>
        <div className="course-topbar-actions">
          {isAdmin && editMode && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setThemeOpen((v) => !v)}>🎨 Фон мен түстер</button>
          )}
          {isAdmin && (
            <button type="button" className={editMode ? 'btn btn-white btn-sm' : 'btn btn-primary btn-sm'} onClick={() => { setEditMode((v) => !v); setEditingKey(null); setThemeOpen(false) }}>
              {editMode ? 'Аяқтау' : 'Редакциялау'}
            </button>
          )}
        </div>
      </div>
      {editing && themeOpen && <CourseThemePanel course={course} onSaved={reload} />}

      <div className="course-cover-wrap">
        {course.cover_image_url ? (
          <img className="course-cover" src={course.cover_image_url} alt={course.title} />
        ) : (
          <div className="course-cover course-cover-text"><h1>{course.title}</h1></div>
        )}
        {editing && (
          <div className="cover-actions">
            <label className="btn btn-white btn-sm">
              {course.cover_image_url ? 'Суретті ауыстыру' : 'Сурет қосу'}
              <input type="file" accept="image/*" hidden onChange={(e) => { changeCover(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {course.cover_image_url && <button type="button" className="btn btn-white btn-sm" onClick={removeCover}>Суретті өшіру</button>}
          </div>
        )}
      </div>
      {uploadError && <p className="error" style={{ marginTop: 8 }}>{uploadError}</p>}

      <div className="modules-head">
        <div className="course-tabs"><span>Модульдер</span></div>
        {editing && editingKey !== 'new' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditingKey('new')}>+ Жаңа модуль</button>
        )}
      </div>

      <div className={hasAccess ? 'course-layout with-aside' : 'course-layout'}>
        <div className="course-main">
          {hasAccess && <div className="progress-mobile">{progressCard}</div>}

          {!hasAccess && (
            <div className="aside-card course-info" style={{ marginBottom: 16 }}>
              <p className="lead-text">{course.description}</p>
              {course.features.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <Collapsible label={course.features_intro || 'Курс нәтижесінде сіз:'}>
                    <ul className="feature-list">
                      {course.features.map((f, i) => <li key={i}><span className="tick">✓</span>{f}</li>)}
                    </ul>
                  </Collapsible>
                </div>
              )}
              <div className="notice notice-price" style={{ marginTop: 18 }}>
                <div className="price-block" style={{ marginBottom: 14 }}>
                  {course.old_price_kzt && <span className="old-price">{formatKzt(course.old_price_kzt)} орнына</span>}
                  <span className="new-price">Қазір: {formatKzt(course.price_kzt)}</span>
                </div>
                {course.order_url ? (
                  <a href={course.order_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">Курсты алу</a>
                ) : !session ? (
                  <Link to="/login" className="btn btn-primary btn-lg">Курсты алу</Link>
                ) : (
                  <>
                    {pending && <p className="muted small" style={{ marginBottom: 10 }}>Төлем өтінімі жіберілді — төлем расталған соң курс ашылады.</p>}
                    {(course.payment_url || (ONLINE_PAY && course.price_kzt)) && (
                      <button className="btn btn-primary btn-lg" onClick={buy} disabled={busy}>
                        {pending ? 'Төлемді жалғастыру' : 'Курсты алу'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {editing && editingKey === 'new' && (
            <div style={{ marginBottom: 16 }}>
              <ModuleForm
                courseId={course.id}
                lessons={[]}
                contentByLesson={contentByLesson}
                nextNumber={nextNumber}
                onCancel={() => setEditingKey(null)}
                onSaved={() => { setEditingKey(null); reload() }}
              />
            </div>
          )}

          <div className="module-grid">
            {groups.map((g, gi) => {
              if (editing && editingKey === g.key) {
                return (
                  <ModuleForm
                    key={g.key}
                    courseId={course.id}
                    module={g.module ?? undefined}
                    lessons={g.lessons}
                    contentByLesson={contentByLesson}
                    nextNumber={nextNumber}
                    onCancel={() => setEditingKey(null)}
                    onSaved={() => { setEditingKey(null); reload() }}
                  />
                )
              }
              const accessible = moduleOpen(g) && (hasAccess || g.lessons.some((l) => l.is_free_preview))
              const expanded = openModules.has(g.key)
              const numberLabel = g.module?.number_label ?? String(gi + 1).padStart(2, '0')
              return (
                <div key={g.key} className="module-card">
                  <div className={accessible ? 'module-card-banner' : 'module-card-banner locked'}>
                    <span className="module-card-num">{numberLabel}</span>
                    <div className="module-card-title-wrap">
                      <h3 className="module-card-title">{g.title || `${gi + 1}-модуль`}</h3>
                      {g.module?.subtitle && <p className="module-card-subtitle">{g.module.subtitle}</p>}
                      <p className="module-card-status">
                        {accessible ? '✓ Қолжетімді' : lockNote(g.module)} · {g.lessons.length} сабақ{adminNote(g.module)}
                      </p>
                    </div>
                    {editing && (
                      <div className="module-card-actions">
                        <button type="button" className="btn btn-white btn-sm" onClick={() => setEditingKey(g.key)}>Өзгерту</button>
                        <button type="button" className="btn btn-white btn-sm" onClick={() => deleteModule(g)}>Өшіру</button>
                      </div>
                    )}
                  </div>

                  <div className="module-card-body">
                    {expanded && (
                      <div className="lesson-list" style={{ marginBottom: 14 }}>
                        {g.lessons.map((lesson, li) => renderLessonRow(lesson, li, g))}
                        {g.lessons.length === 0 && <p className="muted small">Бұл модульде сабақ әлі жоқ.</p>}
                      </div>
                    )}

                    <button
                      type="button"
                      className={expanded || !accessible ? 'btn btn-outline btn-block' : 'btn btn-primary btn-block'}
                      onClick={() => toggleModule(g.key)}
                    >
                      {expanded ? 'Свернуть ⌃' : accessible ? 'Ашу' : 'Алдын ала қарау'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {groups.length === 0 && (
            <div className="aside-card">
              <p className="muted small">Сабақтар жақында қосылады.</p>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 12 }}
                  disabled={creatingModules}
                  onClick={async () => {
                    setCreatingModules(true)
                    const err = await createDefaultModules(course.id)
                    setCreatingModules(false)
                    if (err) window.alert(err)
                    else reload()
                  }}
                >
                  Стандартты модульдер мен сабақтарды құру
                </button>
              )}
            </div>
          )}
        </div>

        {hasAccess && (
          <aside className="course-aside">
            <div className="progress-desktop">{progressCard}</div>
            <Top30Card course={course} editing={editing} onSaved={reload} />
            <ChatsCard course={course} editing={editing} onSaved={reload} />
            <CourseCalendar courseId={course.id} isAdmin={editing} />
          </aside>
        )}
      </div>
    </div>
  )
}
