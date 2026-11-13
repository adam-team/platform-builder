import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import AssignmentPanel from '../components/AssignmentPanel'
import CuratorChat from '../components/CuratorChat'
import LessonEditor from '../components/LessonEditor'
import VideoPlayer from '../components/VideoPlayer'
import LessonQuestions from '../components/LessonQuestions'
import { courseCardAccent } from '../lib/content'
import type { Course, CourseModule, Lesson, LessonContent } from '../lib/types'
import { isPaidOrStaff } from '../lib/roles'

function timeToSeconds(time: string): number {
  return time.split(':').map((p) => parseInt(p, 10) || 0).reduce((acc, p) => acc * 60 + p, 0)
}

function SectionCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="lesson-card">
      <header className="lesson-card-head">
        <h3>{title}</h3>
        {actions && <div className="lesson-card-actions">{actions}</div>}
      </header>
      <div className="lesson-card-body">{children}</div>
    </section>
  )
}

export default function LessonPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const { profile, session } = useAuth()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  // null = база не отдала материал (нет доступа)
  const [content, setContent] = useState<LessonContent | null>(null)
  const [siblings, setSiblings] = useState<Lesson[]>([])
  const [moduleRows, setModuleRows] = useState<CourseModule[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [answerAccepted, setAnswerAccepted] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const lastLessonId = useRef('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [seek, setSeek] = useState<{ t: number; n: number } | null>(null)
  const [timecodesOpen, setTimecodesOpen] = useState(true)

  useEffect(() => {
    if (!lessonId) return
    if (lastLessonId.current !== lessonId) {
      setLoaded(false)
      setSeek(null)
      window.scrollTo(0, 0)
      lastLessonId.current = lessonId
    }
    supabase.from('lessons').select('*').eq('id', lessonId).single().then(async ({ data: l }) => {
      const lessonRow = l as Lesson | null
      setLesson(lessonRow)
      const [{ data: c }, { data: contentRow }, { data: sibs }, { data: mods }, progress, answers] = await Promise.all([
        lessonRow ? supabase.from('courses').select('*').eq('id', lessonRow.course_id).single() : Promise.resolve({ data: null }),
        supabase.from('lesson_content').select('*').eq('lesson_id', lessonId).maybeSingle(),
        lessonRow ? supabase.from('lessons').select('*').eq('course_id', lessonRow.course_id).is('deleted_at', null).order('position') : Promise.resolve({ data: [] }),
        lessonRow ? supabase.from('course_modules').select('*').eq('course_id', lessonRow.course_id).order('position') : Promise.resolve({ data: [] }),
        profile ? supabase.from('lesson_progress').select('lesson_id').eq('user_id', profile.id) : Promise.resolve({ data: [] as { lesson_id: string }[] }),
        profile ? supabase.from('lesson_answers').select('reviewed').eq('lesson_id', lessonId).eq('user_id', profile.id) : Promise.resolve({ data: [] as { reviewed: boolean }[] }),
      ])
      setCourse(c as Course | null)
      setContent(contentRow ? { ...(contentRow as LessonContent), materials: contentRow.materials ?? [], timecodes: contentRow.timecodes ?? [], outcomes: contentRow.outcomes ?? [] } : null)
      setSiblings((sibs as Lesson[]) ?? [])
      setModuleRows((mods as CourseModule[]) ?? [])
      setDone(new Set((('data' in progress ? progress.data : []) ?? []).map((p: { lesson_id: string }) => p.lesson_id)))
      setAnswerAccepted((('data' in answers ? answers.data : []) ?? []).some((a: { reviewed: boolean }) => a.reviewed))
      setLoaded(true)
    })
  }, [lessonId, profile, reloadKey])

  const bgUrl = course?.bg_image_url || '/images/course-bg-money.jpg'
  useEffect(() => {
    const b = document.body
    b.style.background = `url(${bgUrl}) center top / cover fixed no-repeat`
    return () => { b.style.background = '' }
  }, [bgUrl])

  const index = siblings.findIndex((l) => l.id === lessonId)
  const prevLesson = index > 0 ? siblings[index - 1] : null
  const nextLesson = index >= 0 ? siblings[index + 1] ?? null : null

  // «5.1» — 5-модуль, 1-сабақ
  const code = useMemo(() => {
    if (!lesson) return ''
    const mod = moduleRows.find((m) => m.id === lesson.module_id)
    if (mod) return `${mod.position}.${lesson.position % 100 || 1}`
    const titles = [...new Set(siblings.map((l) => l.module_title || ''))]
    const sameModule = siblings.filter((l) => (l.module_title || '') === (lesson.module_title || ''))
    return `${titles.indexOf(lesson.module_title || '') + 1}.${sameModule.findIndex((l) => l.id === lesson.id) + 1}`
  }, [lesson, moduleRows, siblings])

  const doneCount = siblings.filter((l) => done.has(l.id)).length
  const percent = siblings.length === 0 ? 0 : Math.round((doneCount / siblings.length) * 100)

  // Стоп-сабақ: тапсырма қабылданбайынша келесі сабақ ашылмайды
  const nextLocked = lesson?.is_stop_lesson === true && !answerAccepted
  const isAdmin = profile?.role === 'admin'

  async function markDone() {
    if (!profile || !lesson || done.has(lesson.id)) return
    await supabase.from('lesson_progress').insert({ user_id: profile.id, lesson_id: lesson.id })
    setDone((prev) => new Set([...prev, lesson.id]))
  }

  async function goNext() {
    setBusy(true)
    await markDone()
    setBusy(false)
    if (nextLesson) navigate(`/lesson/${nextLesson.id}`)
    else if (course) navigate(`/course/${course.id}`)
  }

  if (!loaded) return <p className="muted">Жүктелуде…</p>
  if (!lesson || !course) return <p>Сабақ табылмады. <Link to="/my-courses">← Курстарға оралу</Link></p>

  const hasAssignment = !!content?.assignment_text
  const materials = content?.materials ?? []
  const accent = courseCardAccent(course)

  return (
    <div className="course-stage lesson-stage" style={{ ['--course-accent' as string]: accent.gradient, ['--course-solid' as string]: accent.solid, ['--course-ink' as string]: accent.ink }}>
      <div className="course-topbar">
        <p className="course-back"><Link to={`/course/${course.id}`}>← Модульдерге оралу</Link></p>
        {isAdmin && (
          <button type="button" className={editMode ? 'btn btn-white btn-sm' : 'btn btn-primary btn-sm'} onClick={() => setEditMode((v) => !v)}>
            {editMode ? 'Аяқтау' : 'Редакциялау'}
          </button>
        )}
      </div>

      <div className="lesson-nav-bar">
        <div className="lesson-nav-row">
          {prevLesson ? (
            <Link to={`/lesson/${prevLesson.id}`} className="lesson-nav-btn">← Алдыңғы сабақ</Link>
          ) : <span />}
          <span className="lesson-count-pill">{siblings.length} сабақтың {index + 1}-і</span>
          {session && nextLesson && !nextLocked ? (
            <button type="button" className="lesson-nav-btn" onClick={goNext} disabled={busy}>Келесі сабақ →</button>
          ) : session && !nextLesson ? (
            <button type="button" className="lesson-nav-btn" onClick={goNext} disabled={busy}>Аяқтау ✓</button>
          ) : <span />}
        </div>
        <h1 className="lesson-nav-title"><span className="lesson-code">{code}</span> {lesson.title}</h1>
        {hasAssignment && <p className="lesson-nav-sub">Тапсырма бар</p>}
        {nextLocked && <p className="lesson-nav-sub">🔒 Келесі сабақ — тапсырма қабылданғаннан кейін ашылады</p>}
      </div>

      {isAdmin && editMode && (
        <div style={{ marginTop: 16 }}>
          <LessonEditor
            key={lesson.id}
            lesson={lesson}
            content={content}
            onSaved={() => setReloadKey((k) => k + 1)}
          />
        </div>
      )}

      {!content ? (
        <div className="aside-card" style={{ marginTop: 16 }}>
          🔒 Бұл сабақ әзірге жабық: курсты төлегеннен кейін немесе ашылу күні келгенде қолжетімді болады.{' '}
          <Link to={`/course/${course.id}`}>Модульдерге оралу</Link>
        </div>
      ) : (
        <>
          <div className="lesson-two-col">
            {content.outcomes.length > 0 && (
              <div className="aside-card">
                <h4 className="aside-title">Бұл сабақта:</h4>
                <ul className="lesson-body-list">
                  {content.outcomes.map((o, i) => <li key={i}><span className="tick">✓</span>{o}</li>)}
                </ul>
              </div>
            )}
            <div className="aside-card progress-card">
              <h4 className="aside-title">Оқу прогресіңіз</h4>
              <span className="progress-big">{percent}%</span>
              <div className="progress-track on-light"><span style={{ width: `${percent}%` }} /></div>
              <span className="muted small">{doneCount} / {siblings.length} сабақ аяқталды</span>
            </div>
          </div>

          <SectionCard
            title={lesson.title}
            actions={
              <>
                {content.presentation_url && <a className="btn btn-white btn-sm" href={content.presentation_url} target="_blank" rel="noopener noreferrer">Презентация ⬇</a>}
                {content.notes_url && <a className="btn btn-white btn-sm" href={content.notes_url} target="_blank" rel="noopener noreferrer">Конспект ⬇</a>}
              </>
            }
          >
            {content.youtube_id ? (
              <VideoPlayer videoId={content.youtube_id} title={lesson.title} seek={seek} />
            ) : (
              <p className="muted small">Видео жақында қосылады.</p>
            )}

            {content.youtube_id && content.timecodes.length > 0 && (
              <div className="timecode-block">
                <button type="button" className="timecode-toggle" onClick={() => setTimecodesOpen((v) => !v)} aria-expanded={timecodesOpen}>
                  Тайм-код <span className={timecodesOpen ? 'chevron up' : 'chevron'}>⌄</span>
                </button>
                {timecodesOpen && (
                  <div className="timecode-list">
                    {content.timecodes.map((tc, i) => (
                      <button key={i} type="button" className="timecode-row" onClick={() => setSeek({ t: timeToSeconds(tc.time), n: Date.now() })}>
                        <span className="timecode-time">{tc.time}</span>
                        <span>{tc.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {content.body && (
            <SectionCard title="Сабақ мәтіні">
              {content.body.includes('\n') ? (
                <ul className="lesson-body-list">
                  {content.body.split('\n').filter((line) => line.trim()).map((line, i) => (
                    <li key={i}><span className="tick">✓</span>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              ) : (
                <p className="lesson-body-text">{content.body}</p>
              )}
            </SectionCard>
          )}

          {hasAssignment && (
            <SectionCard title="Тапсырма">
              <AssignmentPanel lessonId={lesson.id} assignmentText={content.assignment_text} />
            </SectionCard>
          )}

          {materials.length > 0 && (
            <SectionCard title="Материалдар">
              <div className="materials-list">
                {materials.map((m, i) => (
                  <a key={i} className="material-row" href={m.url} target="_blank" rel="noopener noreferrer">
                    <span className="material-icon">📄</span>
                    <span className="material-info">
                      <span className="material-title">{m.title}</span>
                      <span className="kind">{m.kind}</span>
                    </span>
                    <span className="btn btn-primary btn-sm">Жүктеу ⬇</span>
                  </a>
                ))}
              </div>
            </SectionCard>
          )}

          {session && isPaidOrStaff(profile?.role) && (
            <SectionCard title="Сұрақ-жауап">
              <LessonQuestions lessonId={lesson.id} />
            </SectionCard>
          )}

          {session && isPaidOrStaff(profile?.role) && (
            <SectionCard title="AI-куратор">
              <CuratorChat lessonId={lesson.id} />
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
