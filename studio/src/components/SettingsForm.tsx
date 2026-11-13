import ImageUploadField from './ImageUploadField'
import { useSiteSettingsForm } from '../pages/admin/useSiteSettingsForm'

type InputDef = { key: string; label: string; kind?: 'text' | 'textarea' | 'url' | 'image'; rows?: number; hint?: string }
// pair — бір қатарда екі өріс (narrow: біріншісі тар, мысалы цифр + жазба); note — түсіндірме жол
export type FieldDef = InputDef | { heading: string } | { note: string } | { pair: [InputDef, InputDef]; narrow?: boolean }
export type ListDef = { key: string; label: string; rows?: number; defaults: string[] }

export const URL_HINT = 'Сілтеме: «/courses» — сайттың ішкі беті, «#services-list» — беттегі орынға өту, «https://…» — сыртқы сілтеме (WhatsApp, Kaspi…).'

// Әкімші беттегі «Өзгерту» терезесінің бір қойындысы: site_settings өрістерін өңдейді.
// Барлық өріс бос болса — сайт дайын (әдепкі) мәтінді көрсетеді.
export default function SettingsForm({ fields, lists = [], onSaved }: { fields: FieldDef[]; lists?: ListDef[]; onSaved?: () => void }) {
  const { form, set, lists: listValues, setList, saved, error, warning, busy, save, loaded } = useSiteSettingsForm(
    Object.fromEntries(lists.map((l) => [l.key, l.defaults])),
    onSaved,
  )
  if (!loaded) return <p className="muted">Жүктелуде…</p>

  function renderField(f: FieldDef, i: number) {
    if ('heading' in f) return <p key={i} className="small muted" style={{ margin: '16px 0 6px', fontWeight: 700 }}>{f.heading}</p>
    if ('note' in f) return <p key={i} className="muted small" style={{ margin: '0 0 12px' }}>{f.note}</p>
    if ('pair' in f) return <div className="row" key={i}>{f.pair.map((p, j) => <label key={j} className={j === 0 && f.narrow ? 'narrow' : undefined}>{p.label}<input value={form[p.key] ?? ''} onChange={(e) => set(p.key, e.target.value)} /></label>)}</div>
    if (f.kind === 'image') return <ImageUploadField key={f.key} label={f.label} value={form[f.key] ?? ''} onChange={(v) => set(f.key, v)} hint={f.hint} />
    if (f.kind === 'textarea') return <label key={f.key}>{f.label}<textarea rows={f.rows ?? 3} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />{f.hint && <span className="muted small">{f.hint}</span>}</label>
    return (
      <label key={f.key}>{f.label}
        <input value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
        {f.kind === 'url' ? <span className="muted small">{URL_HINT}</span> : f.hint && <span className="muted small">{f.hint}</span>}
      </label>
    )
  }

  return (
    <form className="panel" onSubmit={save} style={{ marginTop: 0 }}>
      {fields.map(renderField)}
      {lists.map((l) => (
        <label key={l.key}>{l.label}
          <textarea rows={l.rows ?? 5} value={listValues[l.key] ?? ''} onChange={(e) => setList(l.key, e.target.value)} />
        </label>
      ))}
      {error && <p className="error">{error}</p>}
      {warning && <p className="error">{warning}</p>}
      {saved && !warning && <p className="success">Сақталды — бет жаңартылды.</p>}
      <button disabled={busy}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
    </form>
  )
}
