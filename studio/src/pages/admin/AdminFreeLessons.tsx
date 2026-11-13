import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { CATEGORY, CATEGORY_ORDER } from '../../lib/content'
import { VIDEO_ERROR, parseVideoInput, videoInputFromStored } from '../../lib/video'
import { CURRENT_SCHOOL_ID } from '../../lib/school'
import type { Category, FreeLesson } from '../../lib/types'
import { scheduleBackup } from '../../lib/backup'

const empty = { title: '', category: 'debt' as Category, video: '', position: '', show_on_home: false, is_published: true }

// «Тегін сабақтар»: жаңа видео қосу, YouTube сілтемесін өзгерту, өшіру. Басты бет пен /free-lessons беті осыдан оқиды.
export default function AdminFreeLessons({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<FreeLesson[] | null>(null)
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('free_lessons').select('*').order('position')
    if (error) setError(`${error.message} (Supabase-те migration_34 іске қосылды ма?)`)
    setRows((data as FreeLesson[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    const video = form.video.trim()
    const youtubeId = video ? parseVideoInput(video) : null
    if (video && !youtubeId) return setError(VIDEO_ERROR)
    setBusy(true)
    const row = {
      title: form.title.trim(),
      category: form.category,
      youtube_id: youtubeId,
      position: form.position !== '' ? Number(form.position) : (rows?.length ?? 0) + 1,
      show_on_home: form.show_on_home,
      is_published: form.is_published,
    }
    const { error } = editingId
      ? await supabase.from('free_lessons').update(row).eq('id', editingId)
      : await supabase.from('free_lessons').insert({ ...row, school_id: CURRENT_SCHOOL_ID })
    setBusy(false)
    if (error) return setError(error.message)
    setForm(empty)
    setEditingId(null)
    scheduleBackup()
    await load()
    onChanged?.()
  }

  function edit(l: FreeLesson) {
    setEditingId(l.id)
    setError('')
    setForm({
      title: l.title,
      category: l.category,
      video: videoInputFromStored(l.youtube_id),
      position: String(l.position),
      show_on_home: l.show_on_home,
      is_published: l.is_published,
    })
  }

  async function remove(l: FreeLesson) {
    const { error } = await supabase.from('free_lessons').delete().eq('id', l.id)
    setConfirmId(null)
    if (error) return setError(error.message)
    scheduleBackup()
    await load()
    onChanged?.()
  }

  if (!rows) return <p className="muted">Жүктелуде…</p>

  return (
    <>
      <form className="panel" onSubmit={save} style={{ marginTop: 0 }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Тегін сабақты өзгерту' : 'Жаңа тегін сабақ қосу'}</h3>
        <label>Сабақ атауы<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Бейне сілтемесі — Kinescope немесе YouTube (бос болса — «Бейне жақында қосылады» деп көрінеді)
          <input value={form.video} onChange={(e) => setForm({ ...form, video: e.target.value })} placeholder="https://kinescope.io/… немесе https://youtu.be/…" />
        </label>
        <div className="row">
          <label>Бағыт (түсі мен белгісі)
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY[c].label}</option>)}
            </select>
          </label>
          <label className="narrow">Реті<input type="number" value={form.position} placeholder="авто" onChange={(e) => setForm({ ...form, position: e.target.value })} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={form.show_on_home} onChange={(e) => setForm({ ...form, show_on_home: e.target.checked })} /> Басты бетте де көрсету</label>
        <label className="check"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Жарияланды (өшірсеңіз — тек сізге көрінеді)</label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button disabled={busy}>{busy ? 'Сақталуда…' : editingId ? 'Сақтау' : 'Қосу'}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(empty); setError('') }}>Болдырмау</button>}
        </div>
      </form>

      <h3>Тегін сабақтар ({rows.length})</h3>
      <table>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id}>
              <td>
                <span className="badge" style={{ borderColor: CATEGORY[l.category].color, color: CATEGORY[l.category].color }}>{CATEGORY[l.category].label}</span>{' '}
                {l.title}
                {!l.is_published && <> <span className="badge">жасырын</span></>}
                {l.show_on_home && <> <span className="badge">басты бетте</span></>}
                <div className="muted small">{l.youtube_id ? `▶ ${videoInputFromStored(l.youtube_id).replace('https://', '')}` : 'бейне әлі қосылмаған'}</div>
              </td>
              <td className="actions">
                {confirmId === l.id ? (
                  <>
                    <button className="danger" onClick={() => remove(l)}>Иә, өшіру</button>
                    <button className="secondary" onClick={() => setConfirmId(null)}>Жоқ</button>
                  </>
                ) : (
                  <>
                    <button className="secondary" onClick={() => edit(l)}>Өзгерту</button>
                    <button className="danger" onClick={() => setConfirmId(l.id)}>Өшіру</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className="muted">Тегін сабақтар әлі жоқ</td></tr>}
        </tbody>
      </table>
    </>
  )
}
