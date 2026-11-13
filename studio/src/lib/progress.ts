import { supabase } from './supabase'
import type { Course, Lesson } from './types'

export interface CourseProgress {
  course: Course
  lessons: Lesson[]
  completedIds: Set<string>
  nextLesson: Lesson | null
  percent: number
  lastTouchedAt: string | null
}

// Собирает купленные курсы пользователя вместе с прогрессом по урокам.
// Один запрос на каждую таблицу — дешевле, чем дёргать API на каждый курс отдельно.
export async function loadMyCourses(userId: string): Promise<CourseProgress[]> {
  const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('user_id', userId)
  const courseIds = (enrollments ?? []).map((e) => e.course_id as string)
  if (courseIds.length === 0) return []

  const [{ data: courses }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from('courses').select('*').in('id', courseIds),
    supabase.from('lessons').select('*').in('course_id', courseIds).order('position'),
    supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', userId),
  ])

  const completedIds = new Set((progress ?? []).map((p) => p.lesson_id as string))
  const completedAt = new Map((progress ?? []).map((p) => [p.lesson_id as string, p.completed_at as string]))

  return ((courses as Course[]) ?? []).map((course) => {
    const courseLessons = ((lessons as Lesson[]) ?? []).filter((l) => l.course_id === course.id)
    const nextLesson = courseLessons.find((l) => !completedIds.has(l.id)) ?? null
    const percent = courseLessons.length === 0 ? 0 : Math.round((courseLessons.filter((l) => completedIds.has(l.id)).length / courseLessons.length) * 100)
    const lastTouchedAt = courseLessons
      .map((l) => completedAt.get(l.id))
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
    return { course, lessons: courseLessons, completedIds, nextLesson, percent, lastTouchedAt }
  })
}
