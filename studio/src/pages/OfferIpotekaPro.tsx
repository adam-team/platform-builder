import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Award, BadgeCheck, Briefcase, Building2, CheckCircle2, ChevronDown, ClipboardCheck, FileText, Handshake,
  Home as HomeIcon, KeyRound, Landmark, MessagesSquare, PlayCircle, Star, Users, Trophy, GraduationCap, Sparkles,
} from 'lucide-react'
import { OFFER, TARIFFS, TARIFF_FEATURES } from '../data/offerIpotekaPro'
import { useAuth } from '../lib/auth'
import { isPaidOrStaff } from '../lib/roles'
import { checkoutUrl } from '../lib/checkout'
import OfferEditor from '../components/OfferEditor'
import { rich, useOfferPage } from '../lib/offerContent'
import { deriveShadeRamp } from '../lib/colorRamp'
import { formatKzt } from '../lib/content'
import { ArrowHint, GoldDefs, GoldKey, Seal, Skyline, Spark } from '../components/offer/Ornaments'
import './offer.css'
import '../lib/kpFonts'

type TariffId = (typeof TARIFFS)[number]['id']
const GOLD = { stroke: 'url(#kp-gold)' } as const

const FOR_ICONS = [HomeIcon, KeyRound, Briefcase, Landmark, Handshake]
const FORMAT_ICONS: Record<string, typeof PlayCircle> = { video: PlayCircle, task: ClipboardCheck, pdf: FileText, like: MessagesSquare, cert: Award }
const WHY_ICONS = [null, null, null, Star, BadgeCheck]
const MARQUEE = ['Ипотека PRO', 'Ипотека эксперті болыңыз', 'Өз үйіңізді алыңыз', 'Миллиондар табыңыз', 'ЗАПОЛНИТЬ: факт о результатах', 'Brand']

const DEFAULTS = { offer: OFFER, tariffs: TARIFFS, tariffFeatures: TARIFF_FEATURES, marquee: MARQUEE }

// «Курсқа қатысу» батырмаларының сілтемесі (әр тариф үшін бөлек; әкімші бетте өзгерте алады)
const BuyUrl = createContext<(tariff?: TariffId) => string>((tariff) => checkoutUrl(tariff))

function Cta({ tariff, children, className = 'kp-btn', arrow = true }: { tariff?: TariffId; children: React.ReactNode; className?: string; arrow?: boolean }) {
  const buyUrl = useContext(BuyUrl)
  return (
    <a href={buyUrl(tariff)} target="_blank" rel="noopener noreferrer" className={className}>
      {children}{arrow && <ArrowRight aria-hidden />}
    </a>
  )
}

// Экранға шыққанда пайда болу
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('.kp-rv'))
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
  return ref
}

// Санның өсуі
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400)
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <b ref={el => { ref.current = el }}>{v}{suffix}</b>
}

// «75+» → { n: 75, suffix: '+' }
function numParts(v: string) {
  const n = parseInt(v, 10)
  return { n: Number.isNaN(n) ? 0 : n, suffix: v.replace(/^\s*\d+/, '') }
}

const rv = (d = 0) => ({ className: 'kp-rv', style: { ['--d' as string]: `${d}ms` } })

export default function OfferIpotekaPro() {
  const root = useReveal()
  const { profile } = useAuth()
  const backTo = isPaidOrStaff(profile?.role) ? '/my-courses' : '/courses'
  const [openModule, setOpenModule] = useState<number | null>(0)
  const [solid, setSolid] = useState(false)
  const page = useOfferPage('ipoteka-pro', DEFAULTS)
  const { t, img } = page
  const { offer, tariffs, tariffFeatures, marquee } = page.content
  const urlAny = t('link.buy', checkoutUrl(), 'Жалпы «Курсқа қатысу» / «WhatsApp» батырмаларының сілтемесі', 'url')
  const urlPremium = t('link.premium', checkoutUrl('premium'), 'Premium тарифі батырмасының сілтемесі', 'url')
  const urlBusiness = t('link.business', checkoutUrl('business'), 'Business тарифі батырмасының сілтемесі', 'url')
  const buyUrl = (tariff?: TariffId) => (tariff === 'premium' ? urlPremium : tariff === 'business' ? urlBusiness : urlAny)
  const join = t('cta.join', 'Курсқа қатысу', 'Батырма: «Курсқа қатысу»')
  const pickTariff = t('cta.tariff', 'Тарифті таңдау', 'Батырма: «Тарифті таңдау»')
  const wa = t('cta.wa', 'WhatsApp-қа жазу', 'Батырма: «WhatsApp-қа жазу»')
  const totalLessons = offer.modules.reduce((n, m) => n + m.lessons.length, 0)
  const stat = (i: number, dn: string, dt: string) => ({ ...numParts(t(`stat${i}.n`, dn, `Сандар жолағы ${i}: сан`)), label: t(`stat${i}.t`, dt, `Сандар жолағы ${i}: жазу`) })
  const stats = [stat(1, '6', 'апта'), stat(2, '9', 'модуль'), stat(3, '75+', 'видео сабақ'), stat(4, '8', 'Zoom-сабақ Экспертмен')]
  // Негізгі жасыл фонды кез келген түске ауыстыру: бір hex-тен барлық реңк автоматты шығады, алтын (--gold) өзгермейді
  const mainColor = t('theme.main', '#146b3d', 'Негізгі түс (қазір жасыл)', 'color')
  const [e950, e900, e800, e700, e600, e500, e300] = deriveShadeRamp(mainColor, [0.05, 0.09, 0.14, 0.2, 0.28, 0.36, 0.62])
  const themeVars = { ['--e950' as string]: e950, ['--e900' as string]: e900, ['--e800' as string]: e800, ['--e700' as string]: e700, ['--e600' as string]: e600, ['--e500' as string]: e500, ['--e300' as string]: e300 }

  useEffect(() => {
    document.title = 'Ипотека PRO — курс | Эксперт Аты-жөні'
    window.scrollTo(0, 0)
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <BuyUrl.Provider value={buyUrl}>
    <div className="kp" ref={root} style={themeVars}>
      <OfferEditor page={page} />
      <GoldDefs />

      <header className={solid ? 'kp-top solid' : 'kp-top'}>
        <div className="kp-wrap kp-top-in">
          <Link to={backTo} className="kp-back">{t('top.back', '← Курстар', 'Мәзір: артқа')}</Link>
          <img src="/images/kp/brand-light.png" alt="Brand" className="kp-logo" />
          <nav className="kp-nav">
            <a href="#for">{t('nav.for', 'Кімге арналған', 'Мәзір: «Кімге арналған»')}</a>
            <a href="#program">{t('nav.program', 'Бағдарлама', 'Мәзір: «Бағдарлама»')}</a>
            <a href="#author">{t('nav.author', 'Автор', 'Мәзір: «Автор»')}</a>
            <a href="#tariffs">{t('nav.tariffs', 'Тарифтер', 'Мәзір: «Тарифтер»')}</a>
          </nav>
          <a href="#tariffs" className="kp-btn kp-btn-sm">{t('nav.join', 'Қатысу', 'Мәзір: жоғарғы батырма')}</a>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="kp-hero">
        <Skyline className="kp-skyline" />
        <Spark size={26} style={{ left: '9%', top: '20%' }} />
        <Spark size={16} style={{ left: '47%', top: '16%', animationDelay: '-1s' }} />
        <Spark size={30} style={{ right: '7%', top: '17%', animationDelay: '-2s' }} />
        <Spark size={14} style={{ right: '36%', top: '60%', animationDelay: '-1.4s' }} />
        <Spark size={20} style={{ left: '40%', bottom: '18%', animationDelay: '-2.4s' }} />

        <div className="kp-wrap kp-hero-in">
          <div className="kp-hero-text">
            <span className="kp-hero-brand rv-in"><Sparkles size={16} stroke="url(#kp-gold)" /> {t('hero.brand', 'Ипотека эксперті', 'Басты блок: жоғарғы жол')} <i /><span className="who">{t('hero.who', 'Эксперт Аты-жөні', 'Басты блок: эксперт аты')}</span></span>
            <h1 className="kp-h1">{rich(t('hero.title', 'Ипотека*PRO*', 'Басты тақырып (*сөз* — түсті)'))}</h1>
            <p className="kp-lead">{offer.goal}</p>
            <div className="kp-chips">
              {[['6', 'апта'], ['9', 'модуль'], ['20–30', 'минуттық сабақтар']].map(([n, w], i) => (
                <span className="kp-chip" key={i}><b>{t(`chip${i + 1}.n`, n, `Басты блок: белгі ${i + 1} (сан)`)}</b> {t(`chip${i + 1}.t`, w, `Басты блок: белгі ${i + 1} (жазу)`)}</span>
              ))}
            </div>
            <div className="kp-cta-row">
              <a href="#tariffs" className="kp-btn kp-btn-lg">{pickTariff} <ArrowRight aria-hidden /></a>
              <Cta className="kp-btn kp-btn-ghost kp-btn-lg" arrow={false}>{wa}</Cta>
              <ArrowHint className="kp-arrow-hint" />
            </div>
          </div>

          <div className="kp-hero-stage">
            <div className="kp-hero-arch" />
            <GoldKey className="kp-key" />
            <img src={img('img.hero', '/images/kp/expert.webp', 'Басты блок: фото')} alt={offer.author.name} className="kp-hero-photo" decoding="async" fetchPriority="high" />
            <div className="kp-float f1"><span className="ic"><HomeIcon /></span><div><b>{t('float1.n', 'ЗАПОЛНИТЬ', 'Фото жанындағы белгі 1: үлкен жазу')}</b><span>{t('float1.t', 'отбасы үйлі болды', 'Фото жанындағы белгі 1: жазу')}</span></div></div>
            <div className="kp-float f2"><span className="ic"><Trophy /></span><div><b>{t('float2.n', 'ЗАПОЛНИТЬ', 'Фото жанындағы белгі 2: үлкен жазу')}</b><span>{t('float2.t', 'қаржылық тәжірибе', 'Фото жанындағы белгі 2: жазу')}</span></div></div>
            <div className="kp-float f3"><span className="ic"><Building2 /></span><div><b>{t('float3.n', 'Bi Group', 'Фото жанындағы белгі 3: үлкен жазу')}</b><span>{t('float3.t', 'серіктесі', 'Фото жанындағы белгі 3: жазу')}</span></div></div>
          </div>
        </div>
        <div className="kp-scroll"><span>{t('hero.scroll', 'Төмен', 'Басты блок: «Төмен» жазуы')}</span><i /></div>
      </section>

      {/* ============ ЖҮГІРЕТІН ЖОЛ ============ */}
      <div className="kp-marquee" aria-hidden>
        <div className="kp-marquee-track">
          {[...marquee, ...marquee, ...marquee, ...marquee].map((text, i) => <span key={i}>{text}</span>)}
        </div>
      </div>

      {/* ============ САНДАР ============ */}
      <section className="kp-stats">
        <div className="kp-wrap kp-stats-in">
          {stats.map((st, i) => <div className="kp-stat" key={i}><CountUp to={st.n} suffix={st.suffix} /><span>{st.label}</span></div>)}
        </div>
      </section>

      {/* ============ КІМГЕ АРНАЛҒАН ============ */}
      <section className="kp-sec kp-light" id="for">
        <div className="kp-wrap">
          <div className="kp-head kp-rv">
            <h2 className="kp-h2">{rich(t('h.for', 'Бұл курс сізге *арналған*, егер сіз…', 'Тақырып: «Кімге арналған»'))}</h2>
          </div>
          <div className="kp-bento">
            {offer.forWhom.map((text, i) => {
              const I = FOR_ICONS[i] ?? Sparkles
              return (
                <div key={i} {...rv(i * 80)} className="kp-bento-card kp-rv">
                  <span className="ic"><I {...(i === 0 ? { stroke: '#3a2705' } : GOLD)} /></span>
                  <p>{text}</p>
                  <span className="n">0{i + 1}</span>
                </div>
              )
            })}
          </div>
          <div className="kp-cta-center kp-rv"><Cta className="kp-btn kp-btn-dark kp-btn-lg">{join}</Cta></div>
        </div>
      </section>

      {/* ============ НӘТИЖЕ ============ */}
      <section className="kp-sec kp-dark">
        <Spark size={22} style={{ left: '6%', top: '14%' }} />
        <Spark size={16} style={{ right: '9%', bottom: '16%', animationDelay: '-1.6s' }} />
        <div className="kp-wrap">
          <div className="kp-head kp-rv">
            <h2 className="kp-h2">{rich(t('h.results', 'Курста *нәтиже*', 'Тақырып: «Курста нәтиже»'))}</h2>
          </div>
          <div className="kp-results">
            {offer.results.map((text, i) => (
              <div key={i} {...rv(i * 70)} className="kp-res kp-rv"><b>{i + 1}</b><p>{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ БАҒДАРЛАМА ============ */}
      <section className="kp-sec kp-light" id="program">
        <div className="kp-wrap kp-prog">
          <div className="kp-prog-side kp-rv">
            <h2 className="kp-h2">{rich(t('h.program', 'Курс *модульдері*', 'Тақырып: «Курс модульдері»'))}</h2>
            <p>{t('program.text', 'Әр модуль — қысқа, нақты сабақтар: теориядан бірден практикаға, банк пен застройщикпен жұмыс істеуге дейін.', 'Бағдарлама: қысқаша мәтін')}</p>
            <div className="kp-prog-meta">
              <div><b>{offer.modules.length}</b><span>{t('meta.modules', 'модуль', 'Бағдарлама: «модуль» жазуы')}</span></div>
              <div><b>{totalLessons}</b><span>{t('meta.topics', 'тақырып', 'Бағдарлама: «тақырып» жазуы')}</span></div>
              <div><b>{t('meta.weeksN', '6', 'Бағдарлама: апта саны')}</b><span>{t('meta.weeks', 'апта', 'Бағдарлама: «апта» жазуы')}</span></div>
            </div>
            <Cta className="kp-btn kp-btn-dark kp-btn-lg">{t('cta.program', 'Бағдарламаға қатысу', 'Батырма: «Бағдарламаға қатысу»')}</Cta>
          </div>
          <div className="kp-modules">
            {offer.modules.map((m, i) => {
              const open = openModule === i
              return (
                <div key={i} className={open ? 'kp-mod open' : 'kp-mod'}>
                  <button type="button" className="kp-mod-head" onClick={() => setOpenModule(open ? null : i)} aria-expanded={open}>
                    <span className="kp-mod-num">{i + 1}</span>
                    <span className="kp-mod-title">{m.title}</span>
                    <span className="kp-mod-count">{m.lessons.length} {t('mod.lessonWord', 'сабақ', 'Модуль жолындағы «сабақ» сөзі')}</span>
                    <span className="kp-chev"><ChevronDown aria-hidden /></span>
                  </button>
                  {open && (
                    <ol className="kp-lessons">
                      {m.lessons.map((l, li) => <li key={li}><b>{i + 1}.{li + 1}</b>{l}</li>)}
                    </ol>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ ФОРМАТ ============ */}
      <section className="kp-sec kp-dark">
        <div className="kp-wrap">
          <div className="kp-head kp-rv">
            <h2 className="kp-h2">{rich(t('h.format', 'Курс қалай *көрінеді?*', 'Тақырып: «Курс қалай көрінеді»'))}</h2>
          </div>
          <div className="kp-format">
            {offer.format.map((f, i) => {
              const I = FORMAT_ICONS[f.icon] ?? PlayCircle
              return (
                <div key={i} {...rv(i * 90)} className="kp-fcard kp-rv">
                  <span className="ic"><I {...GOLD} /></span>
                  <p>{f.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ АВТОР ============ */}
      <section className="kp-sec kp-author" id="author">
        <Spark size={24} style={{ right: '8%', top: '12%' }} />
        <Spark size={14} style={{ left: '46%', bottom: '10%', animationDelay: '-1.2s' }} />
        <div className="kp-wrap kp-author-in">
          <div className="kp-author-stage kp-rv">
            <div className="arch" />
            <img src={img('img.author', '/images/kp/expert-half.webp', 'Автор: фото')} alt={offer.author.name} loading="lazy" decoding="async" />
            <Seal className="ring" />
          </div>
          <div className="kp-author-body kp-rv">
            <h2 className="kp-h2">{rich(t('h.author', '*Эксперт Аты-жөні*', 'Тақырып: автор аты'))}</h2>
            <ul className="kp-facts">
              {offer.author.facts.map((text, i) => <li key={i}><CheckCircle2 {...GOLD} />{text}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ КУРСТАН КЕЙІН ============ */}
      <section className="kp-sec kp-light">
        <div className="kp-wrap">
          <div className="kp-head kp-rv">
            <h2 className="kp-h2">{rich(t('h.after', 'Курстан кейін мен *не аламын?*', 'Тақырып: «Курстан кейін мен не аламын»'))}</h2>
          </div>
          <div className="kp-after">
            {offer.after.map((text, i) => (
              <div key={i} {...rv((i % 3) * 80)} className={i === 0 ? 'kp-after-item hero kp-rv' : 'kp-after-item kp-rv'}>
                {i === 0 ? <GraduationCap {...GOLD} /> : <CheckCircle2 stroke="#b98a2e" />}
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="kp-cta-center kp-rv"><Cta className="kp-btn kp-btn-dark kp-btn-lg">{t('cta.signup', 'Курсқа жазылу', 'Батырма: «Курсқа жазылу»')}</Cta></div>
        </div>
      </section>

      {/* ============ МЕНІ НЕ ҮШІН ТАҢДАЙДЫ ============ */}
      <section className="kp-sec kp-dark">
        <div className="kp-wrap">
          <div className="kp-head kp-rv">
            <h2 className="kp-h2">{rich(t('h.why', 'Мені не үшін *таңдайды?*', 'Тақырып: «Мені не үшін таңдайды»'))}</h2>
          </div>
          <div className="kp-why">
            {offer.why.map((w, i) => {
              const I = WHY_ICONS[i] ?? null
              return (
                <div key={i} {...rv(i * 80)} className="kp-why-card kp-rv">
                  <b>{I ? <I {...GOLD} /> : w.big}</b>
                  <span>{w.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ ТАРИФТЕР ============ */}
      <section className="kp-sec kp-tariffs" id="tariffs">
        <Spark size={26} style={{ left: '8%', top: '10%' }} />
        <Spark size={18} style={{ right: '10%', top: '20%', animationDelay: '-1.5s' }} />
        <div className="kp-wrap">
          <div className="kp-head kp-rv">
            <h2 className="kp-h2">{rich(t('h.tariffs', 'Өзіңізге *лайықты* форматты таңдаңыз', 'Тақырып: тарифтер'))}</h2>
          </div>
          <div className="kp-tariff-grid">
            {tariffs.map((tf, ti) => (
              <div key={ti} {...rv(ti * 120)} className={tf.id === 'business' ? 'kp-tariff kp-tariff-b kp-rv' : 'kp-tariff kp-rv'}>
                {tf.id === 'business' && <span className="kp-ribbon"><Sparkles size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />{t('tariff.ribbon', 'Толық пакет', 'Тариф белгісі: «Толық пакет»')}</span>}
                <h3>{tf.name}</h3>
                <div className="kp-price">{formatKzt(tf.price)}</div>
                <ul>
                  {tariffFeatures.map((f, i) => {
                    const included = tf.id === 'business' || f.premium
                    return (
                      <li key={i} className={included ? 'yes' : 'no'}>
                        <CheckCircle2 {...(tf.id === 'business' ? { stroke: '#5a3d0a' } : GOLD)} />
                        {f.text}
                      </li>
                    )
                  })}
                </ul>
                <Cta tariff={tf.id} className="kp-btn kp-btn-lg kp-btn-block">{tf.name} {t('cta.choose', 'таңдау', 'Тариф батырмасы: аты + осы сөз')}</Cta>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ТӨЛЕМ ============ */}
      <section className="kp-sec kp-pay" id="pay">
        <div className="kp-wrap">
          <div className="kp-head kp-rv">
            <h2 className="kp-h2">{rich(t('h.pay', 'Төлем жасау үшін *реквизит*', 'Тақырып: «Төлем жасау»'))}</h2>
          </div>
          <div className="kp-pay-card kp-rv">
            <img src={img('img.kaspi', '/images/kp/kaspi.jpg', 'Төлем: Kaspi QR суреті')} alt="Kaspi QR" loading="lazy" />
            <div>
              <h3>{t('pay.title', 'Kaspi QR арқылы төлеңіз', 'Төлем: тақырып')}</h3>
              <ul className="kp-pay-steps">
                <li><i>1</i>{t('pay.s1', 'Тарифті таңдаңыз', 'Төлем: 1-қадам')}</li>
                <li><i>2</i>{t('pay.s2', 'QR-кодты Kaspi қосымшасымен сканерлеңіз', 'Төлем: 2-қадам')}</li>
                <li><i>3</i>{t('pay.s3', 'Чекті WhatsApp арқылы жіберіңіз — қолжетімділікті ашамыз', 'Төлем: 3-қадам')}</li>
              </ul>
              <Cta className="kp-btn kp-btn-lg kp-btn-block">{t('cta.receipt', 'Чекті WhatsApp-қа жіберу', 'Батырма: «Чекті WhatsApp-қа жіберу»')}</Cta>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ФИНАЛ ============ */}
      <section className="kp-final">
        <Skyline className="kp-skyline" />
        <Spark size={24} style={{ left: '14%', top: '24%' }} />
        <Spark size={16} style={{ right: '16%', top: '30%', animationDelay: '-1.3s' }} />
        <div className="kp-wrap">
          <h2 className="kp-h2 kp-rv">{rich(t('h.final', 'Өз үйіңізге *алғашқы қадам*', 'Соңғы блок: тақырып'))}</h2>
          <p className="sub kp-rv">{t('final.sub', 'Ипотека PRO — үйлі болғысы келетіндерге және ипотека саласында табыс тапқысы келетіндерге арналған курс.', 'Соңғы блок: мәтін')}</p>
          <div className="kp-rv"><a href="#tariffs" className="kp-btn kp-btn-lg">{pickTariff} <ArrowRight aria-hidden /></a></div>
          <img src={img('img.final', '/images/kp/expert-half.webp', 'Соңғы блок: фото')} alt="" className="kp-final-photo" loading="lazy" decoding="async" />
        </div>
      </section>

      <footer className="kp-foot"><img src="/images/kp/brand-light.png" alt="Brand" className="kp-logo-foot" />{t('foot.text', '© Эксперт Аты-жөні · Brand · Ипотека эксперті', 'Төменгі жол')}</footer>

      <div className="kp-sticky">
        <a href="#tariffs" className="kp-btn kp-btn-block">{join} <ArrowRight aria-hidden /></a>
      </div>
    </div>
    </BuyUrl.Provider>
  )
}
