import { useRef, useState } from 'react'
import { uploadAnswerFile, useSignedUrls } from '../lib/answerFiles'
import type { Attachment } from '../lib/types'

// Фото/файл қосу батырмалары + қосылғандардың тізімі (өшіру мүмкіндігімен).
// `withFiles` — суреттен басқа PDF/құжат та қосуға болады (куратор жауабы үшін); оқушы тек фото жібереді.
export default function AttachmentPicker({ ownerId, value, onChange, withFiles = false, max = 6 }: {
  ownerId: string
  value: Attachment[]
  onChange: (next: Attachment[]) => void
  withFiles?: boolean
  max?: number
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const urls = useSignedUrls(value)

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')
    setBusy(true)
    const next = [...value]
    for (const f of Array.from(files)) {
      if (next.length >= max) { setError(`Ең көп дегенде ${max} файл қосуға болады`); break }
      const res = await uploadAnswerFile(f, ownerId)
      if (res.error || !res.attachment) { setError(res.error ?? 'Жүктелмеді'); continue }
      next.push(res.attachment)
    }
    setBusy(false)
    onChange(next)
    if (photoRef.current) photoRef.current.value = ''
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="attach-picker">
      <div className="attach-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => photoRef.current?.click()} disabled={busy}>📷 Фото қосу</button>
        {withFiles && <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>📎 Файл (PDF, құжат)</button>}
        {busy && <span className="muted small">Жүктелуде…</span>}
        <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => add(e.target.files)} />
        {withFiles && <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => add(e.target.files)} />}
      </div>
      {value.length > 0 && (
        <div className="attach-list">
          {value.map((a, i) => (
            <div key={a.path} className="attach-item">
              {a.kind === 'image' && urls[a.path] ? <img src={urls[a.path]!} alt={a.name} /> : <span className="attach-file">📄 {a.name}</span>}
              <button type="button" aria-label="Өшіру" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
