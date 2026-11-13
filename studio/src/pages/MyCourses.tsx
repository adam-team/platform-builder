import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { loadMyCourses, type CourseProgress } from '../lib/progress'
import { CATEGORY, CONSULTATION_URL, courseBannerStyle, courseBuyLink, courseTheme, formatKzt, hasRealModules } from '../lib/content'
import SmartLink from '../components/SmartLink'
import type { Course, Payment } from '../lib/types'
import AdminCourseManager from './AdminCourseManager'

const PAYMENT_STATUS_LABEL: Record<string, string> = { pending: 'растауды күтуде', paid: 'төленді', failed: 'сәтсіз' }

const TABS = ['Барлығы', 'Оқуда', 'Аяқталған'] as const

export default function MyCourses() {
  const { profile } = useAuth()
  return profile?.role === 'admin' ? <AdminCourseManager /> : <MemberCourses />
}

function MemberCourses() {
  const { profile } = useAuth()
  const [mine, setMine] = useState<CourseProgress[] | null>(null)
  const [locked, setLocked] = useState<Course[]>([])
  const [tab, setTab] = useState<(typeof TABS)[number]>('Барлығы')
  const [payments, setPayments] = useState<(Payment & { courses: { title: string } | null })[]>([])
  const [openFeatures, setOpenFeatures] = useState<Set<string>>(new Set())

  function toggleFeatures(id: string) {
    setOpenFeatures((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (!profile) return
    loadMyCourses(profile.id).then((rows) => {
      setMine(rows)
      const owned = new Set(rows.map((r) => r.course.id))
      supabase.from('courses').select('*').eq('is_published', true).order('position').then(({ data }) => {
        setLocked(((data as Course[]) ?? []).filter((c) => !owned.has(c.id)))
      })
    })
    supabase.from('payments').select('*, courses(title)').eq('user_id', profile.id).order('created_at', { ascending: false })
      .then(({ data }) => setPayments((data as unknown as (Payment & { courses: { title: string } | null })[]) ?? []))
  }, [profile])

  if (!mine) return <p className="muted">Жүктелуде…</p>

  const filtered = mine.filter((m) => (tab === 'Оқуда' ? m.percent < 100 : tab === 'Аяқталған' ? m.percent === 100 : true))

  // «Продолжить с места, где остановились» (ЭТАП_07) — соңғы рет қаралған, әлі аяқталмаған курс
  const continueCourse = [...mine]
    .filter((m) => m.percent < 100 && m.nextLesson)
    .sort((a, b) => (b.lastTouchedAt ?? '').localeCompare(a.lastTouchedAt ?? ''))[0]

  return (
    <>
      <div className="section-head" style={{ marginTop: 20 }}>
        <h1>Менің курстарым</h1>
        <p className="muted small">Барлық бағдарламаңыз бен оқу прогресіңіз осы жерде.</p>
      </div>

      {continueCourse && (
        <Link
          to={hasRealModules(continueCourse.lessons) ? `/course/${continueCourse.course.id}` : `/lesson/${continueCourse.nextLesson!.id}`}
          className="continue-card"
          style={{ background: courseTheme(continueCourse.course).gradient }}
        >
          <div>
            <span className="small" style={{ opacity: 0.85 }}>Жалғастыру</span>
            <h3 style={{ color: '#fff', margin: '4px 0' }}>{continueCourse.course.title}</h3>
            <span className="small" style={{ opacity: 0.85 }}>{continueCourse.nextLesson!.title}</span>
          </div>
          <span className="btn btn-white btn-sm">Жалғастыру →</span>
        </Link>
      )}

      <div className="cat-pills">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'cat-pill active' : 'cat-pill'} style={tab === t ? { background: 'var(--text)' } : undefined} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-3">
        {filtered.map((m) => {
          const course = m.course
          const cat = courseTheme(course)
          const featuresOpen = openFeatures.has(course.id)
          const continueTo = !hasRealModules(m.lessons) && m.nextLesson ? `/lesson/${m.nextLesson.id}` : `/course/${course.id}`
          return (
            <div key={course.id} className="course-card">
              <div className="banner" style={courseBannerStyle(course)}>
                <div className="top-row">
                  <span className="cat-label">{cat.label}</span>
                  <span className="badge-discount">{m.percent === 100 ? '✓ Аяқталды' : 'Сізге ашық'}</span>
                </div>
                <span className="icon-chip">{cat.icon}</span>
                <h3>{course.title}</h3>
              </div>
              <div className="body">
                <p className="desc">{course.description}</p>

                {course.features.length > 0 && (
                  <div style={{ margin: '10px 0' }}>
                    <button type="button" className="about-toggle" onClick={() => toggleFeatures(course.id)} aria-expanded={featuresOpen}>
                      {course.features_intro || 'Курс нәтижесінде сіз:'}
                      <span className={featuresOpen ? 'chevron up' : 'chevron'}>⌄</span>
                    </button>
                    {featuresOpen && (
                      <ul className="feature-list" style={{ marginTop: 12 }}>
                        {course.features.map((f, fi) => <li key={fi}><span className="tick">✓</span>{f}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {m.percent < 100 && (
                  <div style={{ margin: '4px 0 14px' }}>
                    <div className="progress-track" style={{ margin: '0 0 6px' }}><span style={{ width: `${m.percent}%` }} /></div>
                    <span className="muted small">{m.lessons.filter((l) => m.completedIds.has(l.id)).length} / {m.lessons.length} сабақ аяқталды</span>
                  </div>
                )}
                <Link to={continueTo} className="btn btn-primary btn-block">
                  {m.percent === 100 ? 'Қайта көру' : 'Жалғастыру'}
                </Link>
              </div>
            </div>
          )
        })}

        {tab === 'Барлығы' && locked.map((course) => {
          const cat = courseTheme(course)
          const featuresOpen = openFeatures.has(course.id)
          const discount = course.old_price_kzt && course.price_kzt
            ? Math.round(100 - (course.price_kzt / course.old_price_kzt) * 100)
            : null
          return (
            <div key={course.id} className="course-card">
              <div className="banner" style={courseBannerStyle(course)}>
                <div className="top-row">
                  <span className="cat-label">{cat.label}</span>
                  {discount ? <span className="badge-discount">−{discount}%</span> : <span />}
                </div>
                <span className="icon-chip">{cat.icon}</span>
                <h3>{course.title}</h3>
              </div>
              <div className="body">
                <p className="desc">{course.description}</p>

                {course.features.length > 0 && (
                  <div style={{ margin: '10px 0' }}>
                    <button type="button" className="about-toggle" onClick={() => toggleFeatures(course.id)} aria-expanded={featuresOpen}>
                      {course.features_intro || 'Курс нәтижесінде сіз:'}
                      <span className={featuresOpen ? 'chevron up' : 'chevron'}>⌄</span>
                    </button>
                    {featuresOpen && (
                      <ul className="feature-list" style={{ marginTop: 12 }}>
                        {course.features.map((f, fi) => <li key={fi}><span className="tick">✓</span>{f}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {course.offline_price_kzt ? (
                  <div style={{ margin: '4px 0 14px' }}>
                    <p className="format-price">Онлайн формат: <b>{formatKzt(course.price_kzt)}</b></p>
                    <p className="format-price">Офлайн формат: <b>{formatKzt(course.offline_price_kzt)}</b></p>
                  </div>
                ) : (
                  <div className="price-row" style={{ margin: '6px 0 14px' }}>
                    {course.old_price_kzt && <span className="old-price">{formatKzt(course.old_price_kzt)}</span>}
                    <span className="new-price">{formatKzt(course.price_kzt)}</span>
                  </div>
                )}
                {/* Қолжетімсіз курсқа ешқашан ішкі бетке сілтеме бермейміз — тек сатып алу арнасы (КП беті немесе WhatsApp) */}
                <SmartLink href={courseBuyLink(course) ?? CONSULTATION_URL} className="btn btn-primary btn-block">
                  {course.category === 'mortgage_pro' ? 'Бағдарламаны көру' : 'Курсты алу'}
                </SmartLink>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && locked.length === 0 && <p className="muted">Бұл тізім бос.</p>}
      </div>

      {payments.length > 0 && (
        <section className="section">
          <h3 style={{ marginBottom: 10 }}>Төлемдерім</h3>
          <div className="panel">
            <table>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.courses?.title ?? '—'}
                      <div className="muted small">{new Date(p.created_at).toLocaleDateString('ru-RU')} · {formatKzt(p.amount_kzt) || '—'}</div>
                    </td>
                    <td className="actions">
                      <span className={p.status === 'paid' ? 'badge ok' : 'badge'}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
