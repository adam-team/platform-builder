import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { OfferPage } from '../lib/offerContent'
import DataEditor from './DataEditor'
import EditDrawer, { type EditTab } from './EditDrawer'
import ImageUploadField from './ImageUploadField'

const DATA_TITLES: Record<string, string> = {
  offer: 'Курс мазмұны', tariff: 'Тариф', tariffs: 'Тарифтер', tariffFeatures: 'Тариф ішіндегі тізім', marquee: 'Жүгіретін жол',
}

type Draft = { texts: Record<string, string>; images: Record<string, string>; data: Record<string, unknown> }
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

// КП бетінің жоғарғы оң жағындағы «✎ Өзгерту» — тек әкімшіге. Ашылатын терезеде: мәтіндер мен батырма сілтемелері,
// суреттер және бетті құрайтын тізімдер (модульдер, сабақтар, тарифтер…) — қосу, өшіру, орнын ауыстыру, өзгерту.
export default function OfferEditor({ page }: { page: OfferPage }) {
  const { profile } = useAuth()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  if (profile?.role !== 'admin') return null

  function open() {
    setMsg(null)
    setConfirmReset(false)
    setDraft({
      texts: { ...(page.ov.texts ?? {}) },
      images: { ...(page.ov.images ?? {}) },
      data: Object.fromEntries(Object.keys(page.defaults).map((k) => [k, clone(page.content[k])])),
    })
  }

  async function persist(payload: { data: Record<string, unknown>; texts: Record<string, string>; images: Record<string, string> }) {
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.from('offer_pages').upsert({ slug: page.slug, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
    setBusy(false)
    if (error) {
      setMsg({ kind: 'error', text: /offer_pages/.test(error.message) ? 'Supabase-те жаңа SQL-миграция (migration_35) іске қосылмаған.' : error.message })
      return false
    }
    await page.reload()
    return true
  }

  async function save() {
    if (!draft) return
    // Тек бастапқыдан өзгергенін сақтаймыз — сонда кейін кодтағы бастапқы мәтін жаңарса, өзгертпегендерің жаңарып тұрады
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(page.defaults)) if (JSON.stringify(draft.data[k]) !== JSON.stringify(page.defaults[k])) data[k] = draft.data[k]
    const texts: Record<string, string> = {}
    for (const [k, v] of Object.entries(draft.texts)) if (v.trim() && v !== page.registry.get(k)?.def) texts[k] = v
    const images: Record<string, string> = {}
    for (const [k, v] of Object.entries(draft.images)) if (v && v !== page.registry.get(k)?.def) images[k] = v
    if (await persist({ data, texts, images })) setMsg({ kind: 'ok', text: 'Сақталды — бет жаңартылды.' })
  }

  async function resetAll() {
    if (await persist({ data: {}, texts: {}, images: {} })) {
      setDraft(null)
      setConfirmReset(false)
    }
  }

  const entries = [...page.registry.entries()]
  const textEntries = entries.filter(([, e]) => e.kind !== 'image' && e.kind !== 'color')
  const imageEntries = entries.filter(([, e]) => e.kind === 'image')
  const colorEntries = entries.filter(([, e]) => e.kind === 'color')

  const tabs: EditTab[] = draft ? [
    {
      id: 'texts', label: 'Мәтіндер',
      node: (
        <div className="panel" style={{ marginTop: 0 }}>
          <p className="muted small" style={{ marginTop: 0 }}>Тақырыптағы <b>*жұлдызшаның*</b> ішіндегі сөз түсті болып көрінеді. Бос қалдырсаңыз — бастапқы мәтін қолданылады.</p>
          {textEntries.map(([key, e]) => {
            const value = draft.texts[key] ?? ''
            const shown = value || e.def
            const long = shown.length > 60 || e.kind === 'url'
            return (
              <label key={key}>{e.label}
                {long
                  ? <textarea rows={e.kind === 'url' ? 2 : Math.min(6, Math.ceil(shown.length / 60))} placeholder={e.def} value={value} onChange={(ev) => setDraft({ ...draft, texts: { ...draft.texts, [key]: ev.target.value } })} />
                  : <input placeholder={e.def} value={value} onChange={(ev) => setDraft({ ...draft, texts: { ...draft.texts, [key]: ev.target.value } })} />}
              </label>
            )
          })}
        </div>
      ),
    },
    {
      id: 'images', label: 'Фото',
      node: (
        <div className="panel" style={{ marginTop: 0 }}>
          {imageEntries.length === 0 && <p className="muted">Бұл бетте өзгертілетін фото жоқ.</p>}
          {imageEntries.map(([key, e]) => (
            <ImageUploadField key={key} folder="offers" label={e.label} value={draft.images[key] ?? e.def} onChange={(url) => setDraft({ ...draft, images: { ...draft.images, [key]: url } })} />
          ))}
        </div>
      ),
    },
    ...(colorEntries.length > 0 ? [{
      id: 'colors', label: 'Түстер',
      node: (
        <div className="panel" style={{ marginTop: 0 }}>
          <p className="muted small" style={{ marginTop: 0 }}>Түсті таңдасаңыз, беттің негізгі реңктері (ашықтан қараңғыға дейін) содан автоматты шығады.</p>
          {colorEntries.map(([key, e]) => (
            <div key={key} className="offer-color-row">
              <label className="ct-swatch custom selected" style={{ background: draft.texts[key] || e.def }}>
                <input type="color" value={draft.texts[key] || e.def} onChange={(ev) => setDraft({ ...draft, texts: { ...draft.texts, [key]: ev.target.value } })} />
              </label>
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      ),
    }] : []),
    ...Object.keys(page.defaults).map((k) => ({
      id: `data-${k}`, label: DATA_TITLES[k] ?? k,
      node: (
        <div className="panel" style={{ marginTop: 0 }}>
          <DataEditor value={draft.data[k]} template={page.defaults[k]} onChange={(v) => setDraft({ ...draft, data: { ...draft.data, [k]: v } })} />
        </div>
      ),
    })),
  ] : []

  return (
    <>
      <button type="button" className="offer-edit-fab" onClick={open}>✎ Өзгерту</button>
      {draft && (
        <EditDrawer
          title="КП бетін өзгерту"
          tabs={tabs}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button type="button" disabled={busy} onClick={save}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
              {confirmReset ? (
                <>
                  <span className="small">Барлық өзгерісті өшіріп, бастапқыға қайтарамыз?</span>
                  <button type="button" className="danger" disabled={busy} onClick={resetAll}>Иә, қайтару</button>
                  <button type="button" className="secondary" onClick={() => setConfirmReset(false)}>Жоқ</button>
                </>
              ) : <button type="button" className="secondary" onClick={() => setConfirmReset(true)}>Бастапқыға қайтару</button>}
              {msg && <span className={msg.kind === 'ok' ? 'success small' : 'error small'}>{msg.text}</span>}
            </>
          }
        />
      )}
    </>
  )
}
