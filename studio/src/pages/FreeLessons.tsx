import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildFreeSteps, withDefaults, withFreeOutroList } from '../lib/content'
import { CURRENT_SCHOOL_ID } from '../lib/school'
import Collapsible from '../components/Collapsible'
import FreeLessonCard from '../components/FreeLessonCard'
import { fetchFreeLessons } from '../lib/freeLessons'
import PageEditor from '../components/PageEditor'
import SmartLink from '../components/SmartLink'
import { freeLessonsTabs } from '../components/pageEditors'
import type { FreeLesson, SiteSettings } from '../lib/types'

export default function FreeLessons() {
  const [rows, setRows] = useState<FreeLesson[] | null>(null)
  const [settings, setSettings] = useState(withDefaults(null))
  const [outroList, setOutroList] = useState<string[]>(withFreeOutroList(null))
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const tabs = useMemo(() => freeLessonsTabs(reload), [reload])

  useEffect(() => {
    Promise.all([
      fetchFreeLessons(false),
      supabase.from('site_settings').select('*').eq('school_id', CURRENT_SCHOOL_ID).maybeSingle(),
    ]).then(([l, st]) => {
      setRows(l)
      const row = st.data as SiteSettings | null
      setSettings(withDefaults(row))
      setOutroList(withFreeOutroList(row?.free_outro_list))
    })
  }, [reloadKey])

  const steps = useMemo(() => buildFreeSteps(settings), [settings])

  if (!rows) return <p className="muted">Жүктелуде…</p>

  return (
    <>
      <PageEditor title="Тегін сабақтар бетін өзгерту" tabs={tabs} />
      <div className="section-head" style={{ marginTop: 20 }}>
        <span className="eyebrow" style={{ color: 'var(--brand)' }}>{settings.free_eyebrow}</span>
        <h1>{settings.free_title}</h1>
        <p className="muted small" style={{ maxWidth: '56ch' }}>{settings.free_text}</p>
      </div>

      <div className="step-rows" style={{ marginBottom: 40 }}>
        {steps.map((s, i) => (
          <div className={`step-row tint-${i % 3}`} key={s.n}>
            <span className="step-num">{s.n}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="section" style={{ margin: '0 0 32px' }}>
        <div className="info-block outro-block">
          <p className="lead-text" style={{ marginBottom: 16 }}>{settings.free_outro}</p>
          <Collapsible label="Сіз:">
            <ul className="feature-list cols-2" style={{ marginBottom: 6 }}>
              {outroList.map((x, i) => <li key={i}><span className="tick">✓</span>{x}</li>)}
            </ul>
          </Collapsible>
          <a href="#lessons-list" className="btn btn-primary">Тегін сабақтарды көру</a>
        </div>
      </section>

      <div id="lessons-list" className="lesson-grid">
        {rows.map((lesson) => <FreeLessonCard key={lesson.id} lesson={lesson} />)}
        {rows.length === 0 && <p className="muted">Тегін сабақтар жақында қосылады.</p>}
      </div>

      <section className="section">
        <div className="notice">
          <h3 style={{ marginBottom: 6 }}>{settings.free_materials_title}</h3>
          <p className="muted small" style={{ marginBottom: 14 }}>{settings.free_materials_text}</p>
          <SmartLink href={settings.free_materials_url} className="btn btn-outline btn-sm">{settings.free_materials_cta}</SmartLink>
        </div>
      </section>

      <section className="section">
        <div className="final-cta">
          <div>
            <h2>{settings.final_cta_title}</h2>
            <p>{settings.final_cta_text}</p>
          </div>
          <SmartLink href={settings.final_cta_url} className="btn btn-primary">{settings.final_cta_label}</SmartLink>
        </div>
      </section>
    </>
  )
}
