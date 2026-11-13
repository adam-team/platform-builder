import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { loadMyCourses, type CourseProgress } from '../lib/progress'
import { CATEGORY, formatKzt, hasRealModules } from '../lib/content'
import type { Course, Lesson } from '../lib/types'

export default function Cabinet() {
  const { profile } = useAuth()
  const [mine, setMine] = useState<CourseProgress[] | null>(null)
  const [freeLesson, setFreeLesson] = useState<Lesson | null>(null)
  const [upsell, setUpsell] = useState<Course | null>(null)

  useEffect(() => {
    if (!profile) return
    loadMyCourses(profile.id).then(setMine)
    supabase.from('lessons').select('*').eq('is_free_preview', true).order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => setFreeLesson((data as Lesson[])?.[0] ?? null))
  }, [profile])

  useEffect(() => {
    if (!mine) return
    const owned = new Set(mine.map((m) => m.course.id))
    supabase.from('courses').select('*').eq('is_published', true).order('position').then(({ data }) => {
      const candidate = ((data as Course[]) ?? []).find((c) => !owned.has(c.id))
      setUpsell(candidate ?? null)
    })
  }, [mine])

  if (!profile || !mine) return <p className="muted">Жүктелуде…</p>

  const inProgress = [...mine].filter((m) => m.percent < 100)
  const continuing = inProgress.sort((a, b) => (b.lastTouchedAt ?? '').localeCompare(a.lastTouchedAt ?? ''))[0] ?? mine[0]

  return (
    <>
      <div style={{ margin: '20px 0 4px' }}>
        <p className="small muted">ҚАЙЫРЛЫ ТАҢ!</p>
        <h1>Сәлем, {profile.full_name?.split(' ')[0] || profile.email.split('@')[0]}</h1>
      </div>

      {continuing && (
        <section className="section">
          <Link to={!hasRealModules(continuing.lessons) && continuing.nextLesson ? `/lesson/${continuing.nextLesson.id}` : `/course/${continuing.course.id}`} className="continue-card" style={{ display: 'block' }}>
            <span className="eyebrow">Оқуды жалғастыру</span>
            <h3>«{continuing.course.title}» курсы</h3>
            <div className="progress-track"><span style={{ width: `${continuing.percent}%` }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span className="small">{continuing.lessons.filter((l) => continuing.completedIds.has(l.id)).length} / {continuing.lessons.length} сабақ аяқталды</span>
              <span className="btn btn-white btn-sm">Жалғастыру ▶</span>
            </div>
          </Link>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Менің курстарым</h2></div>
        <div className="grid">
          {mine.map((m) => (
            <div className="my-course-row" key={m.course.id}>
              <div className="cover" style={{ background: CATEGORY[m.course.category].gradient }}>{CATEGORY[m.course.category].icon}</div>
              <div className="meta">
                <h4>{m.course.title}</h4>
                <span className="small muted">{m.percent === 100 ? 'Аяқталды' : `${m.lessons.filter((l) => m.completedIds.has(l.id)).length} / ${m.lessons.length} сабақ`}</span>
              </div>
              <Link to={!hasRealModules(m.lessons) && m.nextLesson ? `/lesson/${m.nextLesson.id}` : `/course/${m.course.id}`} className="btn btn-outline btn-sm">
                {m.percent === 100 ? 'Қайта көру' : 'Жалғастыру'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {upsell && (
        <section className="section">
          <div className="section-head"><h2>Сізге ұсынамыз</h2></div>
          <Link to={`/course/${upsell.id}`} className="notice" style={{ display: 'block' }}>
            <b>{upsell.title}</b>
            <p className="muted small" style={{ margin: '4px 0 10px' }}>{upsell.description}</p>
            <span className="small" style={{ color: 'var(--brand-dark)', fontWeight: 700 }}>{formatKzt(upsell.price_kzt)} · Толығырақ →</span>
          </Link>
        </section>
      )}

      {freeLesson && (
        <section className="section">
          <div className="section-head"><h2>Жаңа тегін сабақ</h2></div>
          <Link to={`/lesson/${freeLesson.id}`} className="free-lesson-card" style={{ display: 'block', maxWidth: 340 }}>
            <div className="thumb"><span className="play">▶</span></div>
            <div className="info"><h4>{freeLesson.title}</h4><span className="muted small">Тегін</span></div>
          </Link>
        </section>
      )}
    </>
  )
}
