import { supabase } from './supabase'

// Жаңа курсқа стандартты құрылым: 3 модуль, әрқайсысында 2 сабақ (атауларын кейін өзгертеді).
export async function createDefaultModules(courseId: string): Promise<string | null> {
  for (let m = 1; m <= 3; m++) {
    const title = `${m}-модуль. Жаңа модуль`
    const { data: mod, error } = await supabase
      .from('course_modules')
      .insert({ course_id: courseId, position: m, number_label: String(m).padStart(2, '0'), title })
      .select('id')
      .single()
    if (error || !mod) return error?.message ?? 'Қате'

    const rows = [1, 2].map((l) => ({ course_id: courseId, module_id: mod.id as string, module_title: title, title: 'Жаңа сабақ', position: m * 100 + l, is_free_preview: false }))
    const { data: lessons, error: lessonsError } = await supabase.from('lessons').insert(rows).select('id')
    if (lessonsError || !lessons) return lessonsError?.message ?? 'Қате'
    const { error: contentError } = await supabase.from('lesson_content').insert(
      lessons.map((l) => ({ lesson_id: l.id as string, body: null, materials: [], timecodes: [] })),
    )
    if (contentError) return contentError.message
  }
  return null
}
