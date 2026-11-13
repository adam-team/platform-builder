import { supabase } from './supabase'
import { CURRENT_SCHOOL_ID } from './school'
import type { Category, Course, FreeLesson, Lesson, LessonContent } from './types'

// Тегін сабақтарды жүктейді (Басты бет — homeOnly, /free-lessons беті — барлығы).
// ЕСКЕРТУ: егер Supabase-те migration_34 (кесте free_lessons) әлі іске қосылмаса, сайт бұрынғы тәсілге оралады
// (курстардағы «тегін көру» сабақтары) — тегін сабақтар жоғалып кетпеуі үшін. Миграция іске қосылған соң
// legacyFreeLessons функциясын өшіруге болады.
export async function fetchFreeLessons(homeOnly: boolean): Promise<FreeLesson[]> {
  let q = supabase.from('free_lessons').select('*').eq('is_published', true)
  if (homeOnly) q = q.eq('show_on_home', true)
  const { data, error } = await q.order('position')
  if (!error) return (data as FreeLesson[]) ?? []
  return legacyFreeLessons(homeOnly)
}

async function legacyFreeLessons(homeOnly: boolean): Promise<FreeLesson[]> {
  const [{ data: lessonRows }, { data: courseRows }] = await Promise.all([
    supabase.from('lessons').select('*').eq('is_free_preview', true).order('position'),
    supabase.from('courses').select('*').eq('school_id', CURRENT_SCHOOL_ID),
  ])
  const courses = new Map(((courseRows as Course[]) ?? []).map((c) => [c.id, c]))
  let lessons = ((lessonRows as Lesson[]) ?? []).filter((l) => courses.has(l.course_id))
  const withCategory = lessons.map((l) => ({ lesson: l, category: courses.get(l.course_id)!.category as Category }))
  const picked = homeOnly
    ? (['debt', 'house'] as Category[]).map((cat) => withCategory.find((x) => x.category === cat)).filter((x): x is NonNullable<typeof x> => Boolean(x))
    : withCategory
  lessons = picked.map((x) => x.lesson)
  if (lessons.length === 0) return []
  const { data: contentRows } = await supabase.from('lesson_content').select('lesson_id, youtube_id').in('lesson_id', lessons.map((l) => l.id))
  const video = new Map(((contentRows as Pick<LessonContent, 'lesson_id' | 'youtube_id'>[]) ?? []).map((r) => [r.lesson_id, r.youtube_id]))
  return picked.map((x, i) => ({
    id: x.lesson.id,
    school_id: CURRENT_SCHOOL_ID,
    title: x.lesson.title,
    category: x.category,
    youtube_id: video.get(x.lesson.id) ?? null,
    position: i + 1,
    show_on_home: homeOnly,
    is_published: true,
    created_at: new Date(0).toISOString(),
  }))
}
