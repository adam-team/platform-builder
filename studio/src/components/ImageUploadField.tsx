import { useRef, useState } from 'react'
import { uploadCourseImage } from '../lib/media'

// Сурет өрісі: файлды жүктеу (Supabase Storage → course-media, тек әкімші) немесе сілтемені қолмен қою.
export default function ImageUploadField({ label, value, onChange, folder = 'site', hint }: {
  label: string
  value: string
  onChange: (url: string) => void
  folder?: string
  hint?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(file: File | undefined) {
    if (!file) return
    setError('')
    setBusy(true)
    const res = await uploadCourseImage(file, folder)
    setBusy(false)
    if (res.error || !res.url) return setError(res.error ?? 'Жүктелмеді')
    onChange(res.url)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: '0.83rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
        {value ? (
          <img src={value} alt="" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
        ) : (
          <div style={{ width: 96, height: 72, borderRadius: 10, border: '1px dashed var(--border)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: '0.75rem' }}>фото жоқ</div>
        )}
        <button type="button" className="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Жүктелуде…' : value ? 'Фотоны ауыстыру' : 'Фото жүктеу'}
        </button>
        {value && <button type="button" className="secondary" onClick={() => onChange('')}>Өшіру</button>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      <input
        style={{ marginTop: 8 }}
        placeholder="немесе сурет сілтемесін осында қойыңыз (https://… немесе /images/…)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="muted small" style={{ marginTop: 6 }}>{hint}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
