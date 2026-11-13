import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { notifyPaidUsersAboutNews } from '../../lib/notifications'
import type { News } from '../../lib/types'
import { scheduleBackup } from '../../lib/backup'

const empty = { title: '', body: '', is_published: true, notify: true }

export default function AdminNews({ onChanged }: { onChanged?: () => void }) {
  const [news, setNews] = useState<News[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false })
    setNews((data as News[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    const row = { title: form.title, body: form.body || null, is_published: form.is_published }
    const wasPublished = editingId ? news.find((n) => n.id === editingId)?.is_published ?? false : false
    const { error } = editingId
      ? await supabase.from('news').update(row).eq('id', editingId)
      : await supabase.from('news').insert(row)
    if (error) return setError(error.message)
    // Хабарландыру: тек жаңалық жаңа жарияланғанда (жаңа, немесе жасырын болып тұрып жарияланғанда)
    if (form.notify && form.is_published && !wasPublished) {
      const res = await notifyPaidUsersAboutNews(form.title, row.body)
      setInfo(res.error ? `Жаңалық сақталды, бірақ хабарландыру жіберілмеді: ${res.error}` : `Жаңалық жарияланды. ${res.count} төлеген клиентке хабарландыру жіберілді 🔔`)
    } else {
      setInfo('Сақталды.')
    }
    setForm(empty)
    setEditingId(null)
    scheduleBackup()
    await load()
    onChanged?.()
  }

  function edit(n: News) {
    setEditingId(n.id)
    setInfo('')
    setForm({ title: n.title, body: n.body ?? '', is_published: n.is_published, notify: !n.is_published })
  }

  async function remove(n: News) {
    await supabase.from('news').delete().eq('id', n.id)
    setConfirmId(null)
    scheduleBackup()
    await load()
    onChanged?.()
  }

  return (
    <>
      <p className="muted small">Жаңалықтар басты бетте көрінеді. Жаңа жаңалық жариялағанда, барлық төлеген клиент жоғарғы жақтағы қоңырау белгісінде хабарландыру көреді (өшіруге болады).</p>
      <form className="panel" onSubmit={save}>
        <h3>{editingId ? 'Жаңалықты өзгерту' : 'Жаңа жаңалық'}</h3>
        <label>Тақырып<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Мәтін<textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Жарияланды</label>
        {form.is_published && (!editingId || !news.find((n) => n.id === editingId)?.is_published) && (
          <label className="check"><input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} /> Барлық төлеген клиентке хабарландыру жіберу 🔔</label>
        )}
        {error && <p className="error">{error}</p>}
        {info && <p className="success">{info}</p>}
        <div className="row">
          <button>{editingId ? 'Сақтау' : 'Жариялау'}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(empty) }}>Болдырмау</button>}
        </div>
      </form>

      <h3>Жаңалықтар</h3>
      <table>
        <tbody>
          {news.map((n) => (
            <tr key={n.id}>
              <td>
                {n.title} {!n.is_published && <span className="badge">жасырын</span>}
                <div className="muted small">{new Date(n.created_at).toLocaleString('ru-RU')}</div>
              </td>
              <td className="actions">
                {confirmId === n.id ? (
                  <>
                    <button className="danger" onClick={() => remove(n)}>Иә, өшіру</button>
                    <button className="secondary" onClick={() => setConfirmId(null)}>Жоқ</button>
                  </>
                ) : (
                  <>
                    <button className="secondary" onClick={() => edit(n)}>Өзгерту</button>
                    <button className="danger" onClick={() => setConfirmId(n.id)}>Өшіру</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {news.length === 0 && <tr><td className="muted">Жаңалықтар әлі жоқ</td></tr>}
        </tbody>
      </table>
    </>
  )
}
