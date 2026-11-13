import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { CURRENT_SCHOOL_ID } from '../../lib/school'
import type { School } from '../../lib/types'

// ЭТАП_13 «Настройки школы» — честный срез: тариф/домен/налоги/интеграции/API/АТС жоқ (олар
// нақты сыртқы провайдерлер немесе мультишкольная billing керек). Жасалғаны: schools кестесінің
// «Паспорт платформы» өрістерін өңдейтін нақты форма — ЭТАП_01-де кесте жасалған, бірақ оны
// өңдейтін интерфейс болмаған, сол олқылықты толтырды.
export default function AdminSchoolSettings() {
  const [form, setForm] = useState<Partial<School>>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('schools').select('*').eq('id', CURRENT_SCHOOL_ID).single().then(({ data }) => {
      if (data) setForm(data as School)
    })
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)
    const { error } = await supabase.from('schools').update({
      name: form.name,
      niche: form.niche || null,
      country: form.country || null,
      timezone: form.timezone,
      default_currency: form.default_currency,
      brand_color: form.brand_color,
      logo_url: form.logo_url || null,
    }).eq('id', CURRENT_SCHOOL_ID)
    setBusy(false)
    if (error) return setError(error.message)
    setSaved(true)
  }

  if (!form.id) return <p className="muted">Жүктелуде…</p>

  return (
    <form className="panel" onSubmit={save} style={{ maxWidth: 520 }}>
      <h3 style={{ marginTop: 0 }}>Мектеп паспорты</h3>
      <p className="muted small">
        Бұл — платформаның негізгі баптаулары (ЭТАП_01-де жасалған `schools` кестесі). Бренд-түс пен
        валюта әзірге тек осы жерде сақталады, сайттың дизайнына автоматты қолданылмайды.
      </p>
      <label>Мектеп/платформа атауы<input required value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label>Ниша<input value={form.niche ?? ''} onChange={(e) => setForm({ ...form, niche: e.target.value })} /></label>
      <div className="row">
        <label>Ел<input value={form.country ?? ''} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
        <label className="narrow">Уақыт белдеуі<input value={form.timezone ?? ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></label>
      </div>
      <div className="row">
        <label className="narrow">Валюта<input value={form.default_currency ?? ''} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} /></label>
        <label className="narrow">Бренд-түс
          <input type="color" value={form.brand_color ?? '#1E7A4C'} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} style={{ height: 40, padding: 4 }} />
        </label>
      </div>
      <label>Логотип сілтемесі (URL)<input value={form.logo_url ?? ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></label>
      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Сақталды.</p>}
      <button disabled={busy}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
    </form>
  )
}
