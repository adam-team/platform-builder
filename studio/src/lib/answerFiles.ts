import { useEffect, useState } from 'react'
import { isDemo, supabase } from './supabase'
import type { Attachment } from './types'

const BUCKET = 'answer-files'

// Телефонның үлкен фотосын (5–10 МБ) жүктемес бұрын кішірейтеміз: ұзын жағы 1600px, JPEG 82%
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 400_000) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

// Файлды жеке қоймаға жүктейді. Жол: <оқушының user_id>/<кездейсоқ ат> — оқушы өз файлын, ал әкімші/куратор кез келгенін көре алады.
export async function uploadAnswerFile(file: File, ownerId: string): Promise<{ attachment?: Attachment; error?: string }> {
  const isImage = file.type.startsWith('image/')
  if (file.size > 15 * 1024 * 1024) return { error: `«${file.name}» тым үлкен (15 МБ-тан аспауы керек)` }
  if (isDemo) return { attachment: { path: URL.createObjectURL(file), name: file.name, kind: isImage ? 'image' : 'file' } }
  const body = isImage ? await compressImage(file) : file
  const ext = (isImage && body !== file ? 'jpg' : file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: body.type || file.type || 'application/octet-stream', upsert: false })
  if (error) return { error: error.message }
  return { attachment: { path, name: file.name, kind: isImage ? 'image' : 'file' } }
}

// Жеке қоймадағы файлға 1 сағаттық уақытша сілтеме (демо/сыртқы сілтемелер өзгеріссіз қалады)
async function signedUrl(path: string): Promise<string | null> {
  if (isDemo || /^(blob:|https?:)/.test(path)) return path
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return error ? null : data.signedUrl
}

export function useSignedUrls(attachments: Attachment[] | undefined): Record<string, string | null> {
  const [urls, setUrls] = useState<Record<string, string | null>>({})
  const key = (attachments ?? []).map((a) => a.path).join('|')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all((attachments ?? []).map(async (a) => [a.path, await signedUrl(a.path)] as const))
      if (!cancelled) setUrls(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return urls
}
