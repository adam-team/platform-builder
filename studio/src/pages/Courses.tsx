import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CATEGORY, CATEGORY_ORDER } from '../lib/content'
import CourseSaleCard from '../components/CourseSaleCard'
import type { Category, Course } from '../lib/types'
import { isStaff } from '../lib/roles'

export default function Courses() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const active = (params.get('category') as Category | null) || 'all'
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [owned, setOwned] = useState<Set<string>>(new Set())
  useEffect(() => {
    supabase.from('courses').select('*').is('deleted_at', null).order('position').then(({ data }) => setCourses((data as Course[]) ?? []))
  }, [])

  useEffect(() => {
    if (!profile) return setOwned(new Set())
    supabase.from('enrollments').select('course_id').eq('user_id', profile.id).then(({ data }) => {
      setOwned(new Set((data ?? []).map((r) => r.course_id as string)))
    })
  }, [profile])

  if (!courses) return <p className="muted">Жүктелуде…</p>
  const shown = active === 'all' ? courses : courses.filter((c) => c.category === active)

  return (
    <>
      <div className="section-head" style={{ marginTop: 20 }}>
        <span className="eyebrow" style={{ color: 'var(--brand)' }}>ОҚУ</span>
        <h1>Менің курстарым</h1>
        <p className="muted small">Барлық бағдарламаңыз бен оқу прогресіңіз осы жерде.</p>
      </div>

      <div className="cat-pills">
        <button
          className={active === 'all' ? 'cat-pill active' : 'cat-pill'}
          style={active === 'all' ? { background: 'var(--text)' } : undefined}
          onClick={() => setParams({})}
        >
          Барлығы
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            className={active === cat ? 'cat-pill active' : 'cat-pill'}
            style={active === cat ? { background: CATEGORY[cat].gradient } : undefined}
            onClick={() => setParams({ category: cat })}
          >
            {CATEGORY[cat].label}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="muted">Бұл бағытта курс әзірге жоқ.</p>}
      <div className="grid grid-3">
        {shown.map((course) => (
          <CourseSaleCard key={course.id} course={course} open={isStaff(profile?.role) || owned.has(course.id)} />
        ))}
      </div>
    </>
  )
}
