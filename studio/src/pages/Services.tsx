import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { CATEGORY, formatKzt, withCasesList, withCompanyList, withDefaults } from '../lib/content'
import { CURRENT_SCHOOL_ID } from '../lib/school'
import Collapsible from '../components/Collapsible'
import PageEditor from '../components/PageEditor'
import SmartLink from '../components/SmartLink'
import { servicesTabs } from '../components/pageEditors'
import type { Service, SiteSettings } from '../lib/types'

export default function Services() {
  const { profile, session } = useAuth()
  const [services, setServices] = useState<Service[] | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [settings, setSettings] = useState(withDefaults(null))
  const [companyList, setCompanyList] = useState<string[]>(withCompanyList(null))
  const [casesList, setCasesList] = useState<string[]>(withCasesList(null))

  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const tabs = useMemo(() => servicesTabs(reload), [reload])

  useEffect(() => {
    supabase.from('services').select('*').eq('school_id', CURRENT_SCHOOL_ID).order('position').then(({ data }) => setServices((data as Service[]) ?? []))
    supabase.from('site_settings').select('*').eq('school_id', CURRENT_SCHOOL_ID).maybeSingle().then(({ data }) => {
      const row = data as SiteSettings | null
      setSettings(withDefaults(row))
      setCompanyList(withCompanyList(row?.company_list))
      setCasesList(withCasesList(row?.cases_list))
    })
  }, [reloadKey])

  async function request(service: Service) {
    if (!session || !profile) return
    setBusyId(service.id)
    if (service.payment_url) window.open(service.payment_url, '_blank', 'noopener')
    setPendingId(service.id)
    setBusyId(null)
  }

  if (!services) return <p className="muted">Жүктелуде…</p>

  return (
    <>
      <PageEditor title="Қызметтер бетін өзгерту" tabs={tabs} />
      <div className="section-head" style={{ marginTop: 20 }}>
        <span className="eyebrow" style={{ color: 'var(--brand)' }}>{settings.services_eyebrow}</span>
        <h1>{settings.services_title}</h1>
        <p className="muted small">{settings.services_text}</p>
      </div>

      <section className="section" style={{ margin: '0 0 24px' }}>
        <div className="info-block brand-block">
          <img src="/images/brand-logo.png" alt="Brand" className="brand-logo-img" />
          <span className="eyebrow">{settings.company_eyebrow}</span>
          <h2>{settings.company_title}</h2>
          <p className="lead-text">{settings.company_text}</p>
          <Collapsible label={settings.company_list_intro ?? 'Компания командасы:'}>
            <ul className="check-list cols-2 brand-list" style={{ margin: 0 }}>
              {companyList.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </Collapsible>
        </div>
      </section>

      <section className="section" style={{ margin: '0 0 24px' }}>
        <div className="info-block cases-block">
          <span className="eyebrow">{settings.cases_eyebrow}</span>
          <h2>{settings.cases_title}</h2>
          <p className="lead-text">{settings.cases_text}</p>
          <Collapsible label={settings.cases_list_intro ?? 'Бұл бөлімде:'} tone="dark">
            <ul className="feature-list cases-feature-list" style={{ marginBottom: 0 }}>
              {casesList.map((x, i) => <li key={i}><span className="tick">✓</span>{x}</li>)}
            </ul>
          </Collapsible>
          <SmartLink href={settings.cases_cta_url} className="btn btn-gold">{settings.cases_cta}</SmartLink>
        </div>
      </section>

      <div id="services-list" className="grid" style={{ gridTemplateColumns: '1fr', gap: 20 }}>
        {services.map((s) => {
          const cat = CATEGORY[s.category]
          const isFlagship = s.category === 'premium'
          return (
            <div key={s.id} className="service-card" style={{ background: cat.gradient }}>
              <div className="head-row">
                {isFlagship ? (
                  <img className="service-photo" src={settings.hero_photo_url} alt={settings.expert_name} />
                ) : (
                  <span className="medallion">{cat.icon}</span>
                )}
                <div>
                  {isFlagship && <span className="step-no">PREMIUM</span>}
                  <h3>{s.title}</h3>
                </div>
              </div>

              <p className="desc">{s.description}</p>

              {s.features.length > 0 && (
                <Collapsible label={s.features_intro || 'Не кіреді:'} tone="dark">
                  <ul className="feature-list">
                    {s.features.map((f, fi) => <li key={fi}><span className="tick">✓</span>{f}</li>)}
                  </ul>
                </Collapsible>
              )}

              <div className="foot-row">
                <span className="price">
                  Бағасы: {s.price_kzt != null ? formatKzt(s.price_kzt) : 'тегін'}
                </span>
                {s.payment_url ? (
                  <a href={s.payment_url} target="_blank" rel="noopener noreferrer" className="btn btn-white btn-sm">{s.cta_label}</a>
                ) : !session ? (
                  <Link to="/login" className="btn btn-white btn-sm">{s.cta_label}</Link>
                ) : pendingId === s.id ? (
                  <span className="badge ok">Өтінім жіберілді</span>
                ) : (
                  <button className="btn btn-white btn-sm" onClick={() => request(s)} disabled={busyId === s.id}>
                    {s.cta_label}
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {services.length === 0 && <p className="muted">Қызметтер жақында қосылады.</p>}
      </div>
    </>
  )
}
