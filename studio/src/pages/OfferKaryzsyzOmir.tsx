import { createContext, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Award, BanknoteArrowDown, Calculator, CalendarCheck, CalendarClock, CalendarRange, ChevronDown,
  ClipboardList, Compass, CreditCard, Flag, GitMerge, HandCoins, Home as HomeIcon, Layers,
  MessageCircle, Mountain, PercentCircle, PiggyBank, PlayCircle, Repeat, Rocket, RotateCcw, Route, Scale,
  ShieldCheck, ShieldQuestion, Snowflake, Sparkles, Table2, Target, Unlock,
} from 'lucide-react'
import { OFFER, TARIFF } from '../data/offerKaryzsyzOmir'
import { useAuth } from '../lib/auth'
import { isPaidOrStaff } from '../lib/roles'
import { checkoutUrlDebt } from '../lib/checkoutDebt'
import { formatKzt } from '../lib/content'
import { useReveal, CountUp, rv } from '../components/offer/useOfferAnimations'
import OfferEditor from '../components/OfferEditor'
import { rich, useOfferPage } from '../lib/offerContent'
import { deriveShadeRamp } from '../lib/colorRamp'
import './offer-debt.css'
import '../lib/kpFonts'

const AMBER = { stroke: 'url(#kd-amber)' } as const

const FOR_ICONS = [CreditCard, HandCoins, Repeat, Scale, ShieldQuestion, PercentCircle, Route, RotateCcw, BanknoteArrowDown, HomeIcon]
const RESULT_ICONS = [Table2, Calculator, Target, Route, RotateCcw, PercentCircle, PiggyBank, CalendarCheck, Flag]
const HOW_ICONS = [PlayCircle, Calculator, ClipboardList, GitMerge, CalendarRange, Rocket]
const INSIDE_ICONS = [Layers, ClipboardList, Table2, Table2, GitMerge, Calculator, ShieldCheck, CalendarClock, CalendarCheck]
const TECH_ICONS: Record<string, typeof Snowflake> = { '«Аққала»': Snowflake, '«Лавина»': Mountain, '«Гибрид»': GitMerge }

// Барлық «Курсты алу» батырмаларының сілтемесі (әкімші бетті өзгертіп, ауыстыра алады)
const BuyUrl = createContext(checkoutUrlDebt())
const DEFAULTS = { offer: OFFER, tariff: TARIFF }

function Cta({ children, className = 'kd-btn', arrow = true }: { children: React.ReactNode; className?: string; arrow?: boolean }) {
  const href = useContext(BuyUrl)
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}{arrow && <ArrowRight aria-hidden />}
    </a>
  )
}

function AmberDefs() {
  return (
    <svg className="kp-icon-defs" aria-hidden focusable="false">
      <defs>
        <linearGradient id="kd-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe3b0" />
          <stop offset="0.5" stopColor="#f0a94e" />
          <stop offset="1" stopColor="#b5651d" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Жарқыл (жұлдызша) — фон декоры
function Spark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`kd-spark ${className ?? ''}`} style={style} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path fill="url(#kd-amber)" d="M12 0c.6 6.2 3.2 9.9 12 12-8.8 2.1-11.4 5.8-12 12-.6-6.2-3.2-9.9-12-12C8.8 9.9 11.4 6.2 12 0z" />
    </svg>
  )
}

// Теңге белгісі бар монета — «ақша» декоры
function Coin({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`kd-coin ${className ?? ''}`} style={style} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <circle cx="17" cy="17" r="15" stroke="url(#kd-amber)" strokeWidth="2" fill="rgba(240,169,78,0.08)" />
      <circle cx="17" cy="17" r="10.5" stroke="url(#kd-amber)" strokeWidth="1.3" strokeDasharray="2 3" />
      <text x="17" y="21.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="url(#kd-amber)" fontFamily="Cormorant, serif">₸</text>
    </svg>
  )
}

// Кему сызығы (hero астында, декор)
function DownChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 110" fill="none" preserveAspectRatio="none" aria-hidden>
      <path d="M4 16C60 24 70 38 110 44S180 74 220 84 300 104 316 108" stroke="url(#kd-amber)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" />
      <circle cx="4" cy="16" r="5" fill="#f0a94e" />
      <circle cx="316" cy="108" r="6" fill="#ffe3b0" />
    </svg>
  )
}

// «Қарыздан бостандыққа» жолы — нәтиже блогының суреті
function RoadToFreedom({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 340 260" fill="none" aria-hidden>
      <path d="M28 232C90 232 70 176 118 160S170 108 158 74 196 30 250 28" stroke="url(#kd-amber)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 10" />
      <circle cx="76" cy="204" r="6" fill="#f0a94e" opacity="0.85" />
      <circle cx="140" cy="126" r="6" fill="#f0a94e" opacity="0.85" />
      <circle cx="196" cy="60" r="6" fill="#f0a94e" opacity="0.85" />
      <g transform="translate(6,208)">
        <circle cx="22" cy="22" r="22" fill="#0f2444" stroke="url(#kd-amber)" strokeWidth="1.5" />
        <rect x="10" y="15" width="24" height="16" rx="3" stroke="url(#kd-amber)" strokeWidth="2" />
        <line x1="10" y1="21" x2="34" y2="21" stroke="url(#kd-amber)" strokeWidth="2" />
      </g>
      <g transform="translate(234,4)">
        <circle cx="22" cy="22" r="22" fill="#0f2444" stroke="url(#kd-amber)" strokeWidth="1.5" />
        <path d="M14 32V12l16 4-16 4" stroke="url(#kd-amber)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  )
}

const rvd = (d = 0) => rv('kd-rv', d)

export default function OfferKaryzsyzOmir() {
  const root = useReveal()
  const { profile } = useAuth()
  const backTo = isPaidOrStaff(profile?.role) ? '/my-courses' : '/courses'
  const [openModule, setOpenModule] = useState<number | null>(0)
  const [solid, setSolid] = useState(false)
  const page = useOfferPage('karyzsyz-omir', DEFAULTS)
  const { t, img } = page
  const { offer, tariff } = page.content
  const buyUrl = t('link.buy', checkoutUrlDebt(), 'Барлық «Курсты алу» батырмаларының сілтемесі (WhatsApp және т.б.)', 'url')
  const buy = t('cta.buy', 'Курсты алу', 'Батырма: «Курсты алу»')
  const wa = t('cta.wa', 'WhatsApp-қа жазу', 'Батырма: «WhatsApp-қа жазу»')
  const discount = tariff.oldPrice ? Math.round(100 - (tariff.price / tariff.oldPrice) * 100) : 0
  const totalLessons = offer.modules.reduce((n, m) => n + m.lessons.length, 0)
  const payParts = t('pay.text', 'Курс бағасы — {price}. Реквизиттерді алу үшін WhatsApp-қа жазыңыз, төлемнен кейін чекті сол жерге жіберіңіз — менеджер платформаға кіру сілтемесін береді.', 'Төлем: мәтін ({price} — баға орнына қойылады)').split('{price}')
  // Негізгі көк-түн фонды кез келген түске ауыстыру (амбер акцент өзгермейді)
  const mainColor = t('theme.main', '#0a1a33', 'Негізгі түс (қазір көк-түн)', 'color')
  const [n950, n900, n850, n800, n700] = deriveShadeRamp(mainColor, [0.06, 0.11, 0.16, 0.22, 0.29])
  const themeVars = { ['--n950' as string]: n950, ['--n900' as string]: n900, ['--n850' as string]: n850, ['--n800' as string]: n800, ['--n700' as string]: n700 }

  useEffect(() => {
    document.title = 'Қарызсыз өмір — курс | Эксперт Аты-жөні'
    window.scrollTo(0, 0)
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <BuyUrl.Provider value={buyUrl}>
    <div className="kd" ref={root} style={themeVars}>
      <OfferEditor page={page} />
      <AmberDefs />

      <header className={solid ? 'kd-top solid' : 'kd-top'}>
        <div className="kd-wrap kd-top-in">
          <Link to={backTo} className="kd-back">{t('top.back', '← Курстар', 'Мәзір: артқа')}</Link>
          <img src="/images/kp/brand-light.png" alt="Brand" className="kd-logo" />
          <nav className="kd-nav">
            <a href="#for">{t('nav.for', 'Кімге', 'Мәзір: «Кімге»')}</a>
            <a href="#program">{t('nav.program', 'Бағдарлама', 'Мәзір: «Бағдарлама»')}</a>
            <a href="#author">{t('nav.author', 'Автор', 'Мәзір: «Автор»')}</a>
            <a href="#tariff">{t('nav.tariff', 'Баға', 'Мәзір: «Баға»')}</a>
          </nav>
          <Cta className="kd-btn kd-btn-sm">{buy}</Cta>
        </div>
      </header>

      {/* ============ 1-БЛОК: HERO — эксперт фотосы + ұсыныс бір жерде ============ */}
      <section className="kd-hero">
        <DownChart className="kd-hero-chart" />
        <Coin style={{ left: '2%', top: '8%' }} />
        <Coin style={{ right: '3%', top: '40%' }} className="d2" />
        <Spark style={{ right: '4%', top: '18%' }} />
        <Spark style={{ left: '3%', top: '55%' }} className="d1" />
        <Spark style={{ right: '5%', top: '92%' }} className="d2" />
        <div className="kd-wrap">
          <div className="kd-hero-in">
            <div className="kd-hero-text">
              <span className="kd-hero-brand"><img src="/images/kp/brand-light.png" alt="" /> {t('hero.brand', 'Қаржы эксперті · Эксперт Аты-жөні', 'Басты блок: жоғарғы жол')}</span>
              <h1 className="kd-h1">{rich(t('hero.title', 'Қарызсыз *өмір*', 'Басты тақырып (*сөз* — түсті)'))}</h1>
              <p className="kd-lead">{offer.offer}</p>
            </div>
            <div className="kd-hero-photo-wrap">
              <div className="kd-hero-photo-frame">
                <img src={img('img.hero', '/images/kp/expert-half.webp', 'Басты блок: фото')} alt={offer.author.name} />
                <div className="kd-hero-badge b-top"><Unlock {...AMBER} /><span>{t('hero.badge', 'Қарыздан құтылыңыз', 'Басты блок: фото белгісі')}</span></div>
                <p className="kd-hero-photo-caption">{offer.offerSub}</p>
              </div>
            </div>
          </div>

          <div className="kd-hero-action kd-rv">
            <div className="kd-hero-facts-strip">
              {offer.format.map((f, i) => {
                const icons = [PlayCircle, Layers, CalendarClock, Compass, ClipboardList]
                const I = icons[i] ?? ClipboardList
                return (
                  <div key={i} className="kd-fact">
                    <span className="ic"><I {...AMBER} /></span>
                    <span>{f.label}</span>
                    <b>{f.value}</b>
                  </div>
                )
              })}
            </div>
            <div className="kd-price-row">
              <span className="kd-old">{formatKzt(tariff.oldPrice)}</span>
              <span className="kd-new">{formatKzt(tariff.price)}</span>
              <span className="kd-badge-off">−{discount}%</span>
            </div>
            <div className="kd-cta-row">
              <Cta className="kd-btn kd-btn-lg">{buy}</Cta>
              <Cta className="kd-btn kd-btn-ghost kd-btn-lg" arrow={false}>{wa}</Cta>
            </div>
          </div>
        </div>
      </section>

      {/* ============ КІМГЕ АРНАЛҒАН ============ */}
      <section className="kd-sec kd-light" id="for">
        <div className="kd-wrap">
          <h2 className="kd-h2 kd-rv">{rich(t('h.for', 'Бұл курс сізге керек, *егер*', 'Тақырып: «Кімге арналған»'))}</h2>
          <div className="kd-bento">
            {offer.forWhom.map((text, i) => {
              const I = FOR_ICONS[i] ?? Sparkles
              return (
                <div key={i} {...rvd(i * 55)} className="kd-bento-card">
                  <span className="ic"><I {...AMBER} /></span>
                  <p>{text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ НӘТИЖЕ ============ */}
      <section className="kd-sec kd-dark">
        <div className="kd-wrap">
          <h2 className="kd-h2 kd-rv">{rich(t('h.results', 'Курстан кейін *сіз*', 'Тақырып: «Курстан кейін сіз»'))}</h2>
          <div className="kd-results-grid">
            <div className="kd-road kd-rv">
              <span className="kd-road-label start">{t('road.start', 'Қарыз', 'Жол суреті: бастауы')}</span>
              <span className="kd-road-label end">{t('road.end', 'Бостандық', 'Жол суреті: соңы')}</span>
              <RoadToFreedom />
            </div>
            <ul className="kd-arrow-list">
              {offer.results.map((text, i) => (
                <li key={i} {...rvd(i * 45)}><ArrowRight aria-hidden />{text}</li>
              ))}
            </ul>
          </div>

          <div className="kd-main-result kd-rv">
            <span className="tag">{t('main.tag', 'Негізгі нәтиже', '«Негізгі нәтиже» белгісі')}</span>
            <p>{offer.mainResult}</p>
            <span className="note">{offer.mainResultNote}</span>
          </div>
        </div>
      </section>

      {/* ============ ОҚУ ҚАЛАЙ ӨТЕДІ — УАҚЫТ ЖОЛАҒЫ ============ */}
      <section className="kd-sec kd-light">
        <div className="kd-wrap">
          <h2 className="kd-h2 kd-rv">{rich(t('h.how', 'Оқу қалай *өтеді?*', 'Тақырып: «Оқу қалай өтеді»'))}</h2>
          <div className="kd-timeline">
            {offer.how.map((text, i) => {
              const I = HOW_ICONS[i] ?? Sparkles
              return (
                <div key={i} {...rvd(i * 70)} className="kd-tstep">
                  <span className="n">{i + 1}</span>
                  <span className="dot"><I {...AMBER} /></span>
                  <p>{text}</p>
                </div>
              )
            })}
          </div>
          <p className="kd-note-center kd-rv">{offer.howNote}</p>
        </div>
      </section>

      {/* ============ БАҒДАРЛАМА ============ */}
      <section className="kd-sec kd-dark" id="program">
        <div className="kd-wrap kd-prog">
          <div className="kd-prog-side kd-rv">
            <h2 className="kd-h2">{rich(t('h.program', 'Курс *бағдарламасы*', 'Тақырып: «Курс бағдарламасы»'))}</h2>
            <p>{t('program.text', '4 модуль, 15 сабақ — әр кредитіңізге арналған нақты жоспар.', 'Бағдарлама: қысқаша мәтін')}</p>
            <div className="kd-prog-meta">
              <div><CountUp to={offer.modules.length} /><span>{t('meta.modules', 'модуль', 'Бағдарлама: «модуль» жазуы')}</span></div>
              <div><CountUp to={totalLessons} /><span>{t('meta.lessons', 'сабақ', 'Бағдарлама: «сабақ» жазуы')}</span></div>
              <div><CountUp to={Number(t('meta.weeksN', '4', 'Бағдарлама: апта саны')) || 0} /><span>{t('meta.weeks', 'апта', 'Бағдарлама: «апта» жазуы')}</span></div>
            </div>
            <Cta className="kd-btn kd-btn-lg">{t('cta.program', 'Бағдарламаға қатысу', 'Батырма: «Бағдарламаға қатысу»')}</Cta>
          </div>
          <div className="kd-modules">
            {offer.modules.map((m, i) => {
              const open = openModule === i
              return (
                <div key={i} className={open ? 'kd-mod open' : 'kd-mod'}>
                  <button type="button" className="kd-mod-head" onClick={() => setOpenModule(open ? null : i)} aria-expanded={open}>
                    <span className="kd-mod-num">{i + 1}</span>
                    <span className="kd-mod-title">{m.title}</span>
                    <span className="kd-mod-count">{m.lessons.length} {t('mod.lessonWord', 'сабақ', 'Модуль жолындағы «сабақ» сөзі')}</span>
                    <span className="kd-chev"><ChevronDown aria-hidden /></span>
                  </button>
                  {open && (
                    <div className="kd-lessons">
                      {m.lessons.map((l, li) => {
                        const TechIcon = TECH_ICONS[l.title]
                        return (
                          <div key={li} className="kd-lesson">
                            <div className="kd-lesson-head">
                              {TechIcon ? <TechIcon className="kd-tech-ic" {...AMBER} /> : <span className="kd-lesson-num">{i + 1}.{li + 1}</span>}
                              <b>{l.title}</b>
                            </div>
                            {l.body && <p>{l.body}</p>}
                            <span className="kd-lesson-result">{t('lesson.result', 'Нәтиже:', 'Сабақ ішіндегі «Нәтиже:» жазуы')} {l.result}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ КУРСТА НЕ БАР ============ */}
      <section className="kd-sec kd-light">
        <div className="kd-wrap">
          <h2 className="kd-h2 kd-rv">{rich(t('h.inside', 'Курста не *бар?*', 'Тақырып: «Курста не бар»'))}</h2>
          <div className="kd-inside">
            {offer.whatsInside.map((text, i) => {
              const I = INSIDE_ICONS[i] ?? Sparkles
              return (
                <div key={i} {...rvd(i * 50)} className="kd-inside-card">
                  <I {...AMBER} />
                  <span>{text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ АВТОР — ықшам портрет ============ */}
      <section className="kd-sec kd-author" id="author">
        <div className="kd-wrap kd-author-in">
          <div className="kd-author-photo kd-rv">
            <img src={img('img.author', '/images/kp/expert-half.webp', 'Автор: фото')} alt={offer.author.name} loading="lazy" />
            <div className="kd-author-cap">
              <b>{offer.author.name}</b>
              <span>{t('author.caption', 'ҚАРЖЫ ЭКСПЕРТІ · BRAND.KZ', 'Автор: фото астындағы жазу')}</span>
            </div>
          </div>
          <div className="kd-rv">
            <h2 className="kd-h2 kd-left">{offer.author.name}</h2>
            <ul className="kd-facts">
              {offer.author.facts.map((text, i) => <li key={i}><ShieldCheck {...AMBER} />{text}</li>)}
            </ul>
            <p className="kd-story">{offer.author.story}</p>
          </div>
        </div>
      </section>

      {/* ============ НЕЛІКТЕН ҚАЗІР ============ */}
      <section className="kd-sec kd-dark" style={{ position: 'relative', overflow: 'hidden' }}>
        <Coin style={{ right: '3%', top: '8%' }} />
        <Spark style={{ left: '2%', top: '30%' }} className="d1" />
        <div className="kd-wrap kd-narrow">
          <h2 className="kd-h2 kd-rv">{rich(t('h.whynow', 'Неліктен қазір *бастау керек?*', 'Тақырып: «Неліктен қазір»'))}</h2>
          <p className="kd-lead-center kd-rv">{offer.whyNow.intro}</p>
          <div className="kd-why-split kd-rv">
            <div>
              <p className="kd-why-lead">{offer.whyNow.lead}</p>
              <ul className="kd-why-list">
                {offer.whyNow.points.map((text, i) => <li key={i}>{text}</li>)}
              </ul>
            </div>
            <div className="kd-why-out">{offer.whyNow.outro}</div>
          </div>
          <div className="kd-cta-center kd-rv"><Cta className="kd-btn kd-btn-lg">{buy}</Cta></div>
        </div>
      </section>

      {/* ============ ТАРИФ ============ */}
      <section className="kd-sec kd-tariff" id="tariff">
        <div className="kd-wrap kd-narrow">
          <h2 className="kd-h2 kd-rv">{t('h.tariff', 'Тариф', 'Тақырып: «Тариф»')}</h2>
          <div className="kd-tariff-card kd-rv">
            <span className="kd-ribbon">−{discount}%</span>
            <h3>{tariff.name}</h3>
            <ul>
              {tariff.features.map((f, i) => <li key={i}><ShieldCheck {...AMBER} />{f}</li>)}
            </ul>
            <div className="kd-tariff-price">
              <span className="kd-old">{formatKzt(tariff.oldPrice)}</span>
              <span className="kd-new">{formatKzt(tariff.price)}</span>
            </div>
            <Cta className="kd-btn kd-btn-lg kd-btn-block">{buy}</Cta>
          </div>
        </div>
      </section>

      {/* ============ ТӨЛЕМ ============ */}
      <section className="kd-sec kd-light" id="pay">
        <div className="kd-wrap kd-narrow kd-center">
          <h2 className="kd-h2 kd-rv">{t('h.pay', 'Төлем жасау', 'Тақырып: «Төлем жасау»')}</h2>
          <p className="kd-lead-center kd-rv">{payParts[0]}{payParts.length > 1 && <><b>{formatKzt(tariff.price)}</b>{payParts.slice(1).join('{price}')}</>}</p>
          <div className="kd-pay-row kd-rv"><span className="ic"><MessageCircle /></span><span className="ic"><Award /></span></div>
          <div className="kd-cta-center kd-rv"><Cta className="kd-btn kd-btn-lg">{wa}</Cta></div>
        </div>
      </section>

      {/* ============ ФИНАЛ ============ */}
      <section className="kd-final">
        <Coin style={{ left: '2%', top: '4%' }} className="d2" />
        <Coin style={{ right: '2%', top: '55%' }} />
        <Spark style={{ right: '3%', top: '10%' }} className="d1" />
        <Spark style={{ left: '3%', top: '80%' }} />
        <div className="kd-wrap kd-rv">
          <p className="kd-lead-center">{offer.finalOffer.lead}</p>
          <ul className="kd-why-list" style={{ margin: '18px auto 0', maxWidth: 420 }}>
            {offer.finalOffer.points.map((text, i) => <li key={i}>{text}</li>)}
          </ul>
          <div className="kd-price-row" style={{ justifyContent: 'center', margin: '24px 0' }}>
            <span className="kd-old">{formatKzt(tariff.oldPrice)}</span>
            <span className="kd-new">{formatKzt(tariff.price)}</span>
          </div>
          <div className="kd-cta-center"><Cta className="kd-btn kd-btn-lg">{offer.finalOffer.cta}</Cta></div>
          <p className="kd-quote">«{offer.finalOffer.quote}»</p>
        </div>
      </section>

      <footer className="kd-foot"><img src="/images/kp/brand-light.png" alt="Brand" className="kd-logo-foot" />{t('foot.text', '© Эксперт Аты-жөні · Brand', 'Төменгі жол')}</footer>

      <div className="kd-sticky">
        <Cta className="kd-btn kd-btn-block">{buy}</Cta>
      </div>
    </div>
    </BuyUrl.Provider>
  )
}
