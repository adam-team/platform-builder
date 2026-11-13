import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Course, Profile, UserGroup } from '../../../lib/types'

export type Enr = { id: string; user_id: string; course_id: string; created_at: string; expires_at: string | null }
export type Hist = { id: string; user_id: string; course_id: string; granted_at: string | null; expires_at: string | null; ended_at: string; reason: string }
export type Stat = { last_sign_in_at: string | null; email_confirmed_at: string | null }
export type LessonLite = { id: string; course_id: string; position: number; title: string }
export type GroupMember = { group_id: string; user_id: string }

export type UserInfo = {
  enrollments: Enr[]
  percent: number | null
  stoppedAt: string | null
}

export function daysLeft(expires: string | null): string {
  if (!expires) return 'мерзімсіз'
  const d = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000)
  return d > 0 ? `${d} күн қалды` : 'аяқталды'
}

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—')
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ешқашан'

// Әкімші «Пайдаланушылар» бөлімінің барлық деректері: мерзімі өткен қолжетімділік алдымен жабылады
export function useUsersData() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enr[]>([])
  const [history, setHistory] = useState<Hist[]>([])
  const [lessons, setLessons] = useState<LessonLite[]>([])
  const [progress, setProgress] = useState<{ user_id: string; lesson_id: string }[]>([])
  const [stats, setStats] = useState<Map<string, Stat>>(new Map())
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try { await supabase.rpc('expire_enrollments') } catch { /* функция әлі құрылмаған болуы мүмкін */ }
    const [p, c, e, h, l, pr, g, m] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('*').is('deleted_at', null).order('position'),
      supabase.from('enrollments').select('id, user_id, course_id, created_at, expires_at'),
      supabase.from('enrollment_history').select('*').order('ended_at', { ascending: false }),
      supabase.from('lessons').select('id, course_id, position, title').is('deleted_at', null).order('position'),
      supabase.from('lesson_progress').select('user_id, lesson_id'),
      supabase.from('user_groups').select('*').is('deleted_at', null).order('created_at'),
      supabase.from('user_group_members').select('group_id, user_id'),
    ])
    setProfiles((p.data as Profile[]) ?? [])
    setCourses((c.data as Course[]) ?? [])
    setEnrollments((e.data as Enr[]) ?? [])
    setHistory((h.data as Hist[]) ?? [])
    setLessons((l.data as LessonLite[]) ?? [])
    setProgress((pr.data as { user_id: string; lesson_id: string }[]) ?? [])
    setGroups((g.data as UserGroup[]) ?? [])
    setMembers((m.data as GroupMember[]) ?? [])
    try {
      const { data } = await supabase.rpc('admin_user_stats')
      setStats(new Map(((data as (Stat & { user_id: string })[]) ?? []).map((s) => [s.user_id, s])))
    } catch { /* әлі құрылмаған */ }
    setLoaded(true)
  }, [])
  useEffect(() => { load() }, [load])

  const infoByUser = useMemo(() => {
    const doneByUser = new Map<string, Set<string>>()
    for (const r of progress) {
      if (!doneByUser.has(r.user_id)) doneByUser.set(r.user_id, new Set())
      doneByUser.get(r.user_id)!.add(r.lesson_id)
    }
    const courseOrder = new Map(courses.map((c, i) => [c.id, i]))
    const map = new Map<string, UserInfo>()
    for (const p of profiles) {
      const own = enrollments.filter((e) => e.user_id === p.id)
      const ids = new Set(own.map((e) => e.course_id))
      const ls = lessons.filter((l) => ids.has(l.course_id)).sort((a, b) => (courseOrder.get(a.course_id) ?? 0) - (courseOrder.get(b.course_id) ?? 0) || a.position - b.position)
      const done = doneByUser.get(p.id) ?? new Set<string>()
      const doneCount = ls.filter((l) => done.has(l.id)).length
      const next = ls.find((l) => !done.has(l.id))
      const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? ''
      map.set(p.id, {
        enrollments: own,
        percent: ls.length ? Math.round((doneCount / ls.length) * 100) : null,
        stoppedAt: ls.length === 0 ? null : next ? `${courseTitle(next.course_id)} · ${next.title}` : 'Барлық сабақ аяқталған',
      })
    }
    return map
  }, [profiles, courses, enrollments, lessons, progress])

  return { profiles, courses, enrollments, history, lessons, stats, groups, members, infoByUser, loaded, reload: load }
}

export type UsersData = ReturnType<typeof useUsersData>
