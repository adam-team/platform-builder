import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { CATEGORY } from '../../lib/content'
import type { Service, ServiceCategory } from '../../lib/types'
import { scheduleBackup } from '../../lib/backup'

const CATEGORIES: ServiceCategory[] = ['review', 'debt', 'savings', 'house', 'mortgage_pro', 'premium']
const empty = { title: '', description: '', featuresIntro: '', features: '', category: 'review' as ServiceCategory, price_kzt: '', cta_label: 'Жазылу', payment_url: '', position: '0', is_published: true }
const linesToList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

export default function AdminServices({ onChanged }: { onChanged?: () => void }) {
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('services').select('*').order('position')
    setServices((data as Service[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    const row = {
      title: form.title,
      description: form.description || null,
      features_intro: form.featuresIntro || null,
      features: linesToList(form.features),
      category: form.category,
      price_kzt: form.price_kzt ? Number(form.price_kzt) : null,
      cta_label: form.cta_label || 'Жазылу',
      payment_url: form.payment_url || null,
      position: Number(form.position) || 0,
      is_published: form.is_published,
    }
    const { error } = editingId
      ? await supabase.from('services').update(row).eq('id', editingId)
      : await supabase.from('services').insert(row)
    if (error) return setError(error.message)
    setForm(empty)
    setEditingId(null)
    scheduleBackup()
    await load()
    onChanged?.()
  }

  function edit(s: Service) {
    setEditingId(s.id)
    setForm({
      title: s.title,
      description: s.description ?? '',
      featuresIntro: s.features_intro ?? '',
      features: s.features.join('\n'),
      category: s.category,
      price_kzt: s.price_kzt?.toString() ?? '',
      cta_label: s.cta_label,
      payment_url: s.payment_url ?? '',
      position: String(s.position),
      is_published: s.is_published,
    })
  }

  async function remove(s: Service) {
    await supabase.from('services').delete().eq('id', s.id)
    setConfirmId(null)
    scheduleBackup()
    await load()
    onChanged?.()
  }

  return (
    <>
      <p className="muted small">Қызметтер — бір реттік ұсыныстар (консультация, разбор, сопровождение), сабақсыз. Клиент төлейді немесе тегін жазылады, ары қарай сізбен WhatsApp/Kaspi арқылы байланысады.</p>
      <form className="panel" onSubmit={save}>
        <h3>{editingId ? 'Қызметті өзгерту' : 'Жаңа қызмет'}</h3>
        <label>Атауы<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Сипаттама<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Тізім тақырыбы (мысалы «Разбор нәтижесінде:»)
          <input value={form.featuresIntro} onChange={(e) => setForm({ ...form, featuresIntro: e.target.value })} />
        </label>
        <label>Пункттер тізімі (әр жол — жеке пункт)
          <textarea rows={5} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
        </label>
        <div className="row">
          <label>Бағыт (түс)
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY[c].label}</option>)}
            </select>
          </label>
          <label className="narrow">Реті<input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label>
        </div>
        <div className="row">
          <label>Баға, ₸ (бос — тегін)<input type="number" min="0" value={form.price_kzt} onChange={(e) => setForm({ ...form, price_kzt: e.target.value })} /></label>
          <label>Батырма мәтіні<input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></label>
        </div>
        <label>Сілтеме (Kaspi Pay немесе WhatsApp/форма)<input value={form.payment_url} onChange={(e) => setForm({ ...form, payment_url: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Жарияланды</label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button>{editingId ? 'Сақтау' : 'Қызмет құру'}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(empty) }}>Болдырмау</button>}
        </div>
      </form>

      <h3>Қызметтер</h3>
      <table>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              <td>
                <span className="badge" style={{ borderColor: CATEGORY[s.category].color, color: CATEGORY[s.category].color }}>{CATEGORY[s.category].label}</span>{' '}
                {s.title} {!s.is_published && <span className="badge">жасырын</span>}
              </td>
              <td className="actions">
                {confirmId === s.id ? (
                  <>
                    <button className="danger" onClick={() => remove(s)}>Иә, өшіру</button>
                    <button className="secondary" onClick={() => setConfirmId(null)}>Жоқ</button>
                  </>
                ) : (
                  <>
                    <button className="secondary" onClick={() => edit(s)}>Өзгерту</button>
                    <button className="danger" onClick={() => setConfirmId(s.id)}>Өшіру</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {services.length === 0 && <tr><td className="muted">Қызметтер әлі жоқ</td></tr>}
        </tbody>
      </table>
    </>
  )
}
