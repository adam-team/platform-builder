import { isDemo, supabase } from './supabase'

// Курс суретін Supabase Storage-ке жүктейді (demo-режимде — тек браузер сілтемесі)
export async function uploadCourseImage(file: File, courseId: string): Promise<{ url?: string; error?: string }> {
  if (isDemo) return { url: URL.createObjectURL(file) }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${courseId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('course-media').upload(path, file, { contentType: file.type, upsert: false })
  if (error) return { error: error.message }
  return { url: supabase.storage.from('course-media').getPublicUrl(path).data.publicUrl }
}
