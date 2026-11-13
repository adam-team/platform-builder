import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { VIDEO_ERROR, parseVideoInput, videoInputFromStored } from '../lib/video'
import CuratorFilesManager from './CuratorFilesManager'
import type { Lesson, LessonContent, Material, Timecode } from '../lib/types'
import { scheduleBackup } from '../lib/backup'

const linesToList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

// Сабақтың стандартты редакторы: тек атауы мен видео міндетті, қалғаны толтырылмаса бетте көрінбейді
export default function LessonEditor({
  lesson, content, onSaved,
}: {
  lesson: Lesson
  content: LessonContent | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: lesson.title,
    video: videoInputFromStored(content?.youtube_id),
    duration: content?.duration_minutes ? String(content.duration_minutes) : '',
    outcomes: (content?.outcomes ?? []).join('\n'),
    presentation: content?.presentation_url ?? '',
    notes: content?.notes_url ?? '',
    body: content?.body ?? '',
    assignment: content?.assignment_text ?? '',
  })
  const [timecodes, setTimecodes] = useState<Timecode[]>(content?.timecodes ?? [])
  const [materials, setMaterials] = useState<Material[]>(content?.materials ?? [])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!form.title.trim()) return setError('Сабақ атауы міндетті')
    const youtubeId = parseVideoInput(form.video)
    if (!form.video.trim()) return setError('Видео сілтемесі міндетті')
    if (!youtubeId) return setError(VIDEO_ERROR)
    setBusy(true)
    const { error: lessonError } = await supabase.from('lessons').update({ title: form.title.trim() }).eq('id', lesson.id)
    if (lessonError) { setBusy(false); return setError(lessonError.message) }
    const { error: contentError } = await supabase.from('lesson_content').upsert({
      lesson_id: lesson.id,
      youtube_id: youtubeId,
      duration_minutes: form.duration ? Number(form.duration) : null,
      outcomes: linesToList(form.outcomes),
      presentation_url: form.presentation.trim() || null,
      notes_url: form.notes.trim() || null,
      body: form.body.trim() || null,
      assignment_text: form.assignment.trim() || null,
      materials: materials.filter((m) => m.title.trim() && m.url.trim()),
      timecodes: timecodes.filter((t) => t.time.trim() && t.label.trim()),
    })
    setBusy(false)
    if (contentError) return setError(contentError.message)
    scheduleBackup()
    setNotice('Сақталды.')
    onSaved()
  }

  return (
    <form className="panel lesson-editor" onSubmit={save}>
      <h3 style={{ marginBottom: 6 }}>Сабақты өзгерту</h3>
      <p className="small muted" style={{ marginBottom: 14 }}>Тек атауы мен видео міндетті. Қалғаны толтырылмаса, сабақ бетінде көрсетілмейді.</p>

      <label>Сабақ атауы *<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label>«Бұл сабақта» тізімі (әр жол — жеке пункт)<textarea rows={3} value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} placeholder="Қандай нәтиже аласыз" /></label>
      <div className="row">
        <label>Презентация сілтемесі<input value={form.presentation} onChange={(e) => setForm({ ...form, presentation: e.target.value })} placeholder="https://..." /></label>
        <label>Конспект сілтемесі<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="https://..." /></label>
      </div>
      <div className="row">
        <label>Видео сілтемесі (Kinescope немесе YouTube) *<input value={form.video} onChange={(e) => setForm({ ...form, video: e.target.value })} placeholder="https://kinescope.io/... немесе https://youtu.be/..." /></label>
        <label className="narrow">Минут<input type="number" min="0" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label>
      </div>

      <p className="small muted" style={{ margin: '10px 0 6px' }}>Тайм-кодтар:</p>
      {timecodes.map((t, i) => (
        <div className="row" key={i}>
          <label className="narrow"><input value={t.time} onChange={(e) => setTimecodes(timecodes.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} placeholder="1:20" /></label>
          <label><input value={t.label} onChange={(e) => setTimecodes(timecodes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Не туралы айтылады" /></label>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setTimecodes(timecodes.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setTimecodes([...timecodes, { time: '', label: '' }])}>+ Тайм-код қосу</button>

      <label style={{ marginTop: 14 }}>Сабақ мәтіні (әр жол — жеке пункт)<textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
      <label>Тапсырма<textarea rows={3} value={form.assignment} onChange={(e) => setForm({ ...form, assignment: e.target.value })} /></label>

      <p className="small muted" style={{ margin: '10px 0 6px' }}>Материалдар (сілтеме):</p>
      {materials.map((m, i) => (
        <div className="row" key={i}>
          <label className="narrow"><input value={m.kind} onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))} placeholder="PDF" /></label>
          <label><input value={m.title} onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Атауы" /></label>
          <label><input value={m.url} onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://..." /></label>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setMaterials(materials.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setMaterials([...materials, { title: '', url: '', kind: 'PDF' }])}>+ Материал қосу</button>

      <div style={{ marginTop: 16 }}><CuratorFilesManager lessonId={lesson.id} /></div>

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      {notice && <p className="success" style={{ marginTop: 12 }}>{notice}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Сақталып жатыр…' : 'Сақтау'}</button>
      </div>
    </form>
  )
}
