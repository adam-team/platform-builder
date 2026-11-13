import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FreeLessonCard from '../components/FreeLessonCard'
import { fetchFreeLessons } from '../lib/freeLessons'
import PageEditor from '../components/PageEditor'
import SmartLink from '../components/SmartLink'
import { homeTabs } from '../components/pageEditors'
import { CATEGORY, buildGoals, withAboutMoreList, withDefaults } from '../lib/content'
import { CURRENT_SCHOOL_ID } from '../lib/school'
import type { FreeLesson, News, SiteSettings } from '../lib/types'

// Intl.toLocaleDateString('kk-KZ', ...) кейбір браузерлерде толық қолдау таппайды — сондықтан қолмен
const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${KK_MONTHS[d.getMonth()]}`
}

// «Эксперт туралы» блогында әдепкіде көрінетін алғашқы абзац саны; қалғаны «толығырақ» батырмасымен ашылады
const INTRO_VISIBLE = 2

export default function Home() {
  const [settings, setSettings] = useState(withDefaults(null))
  const [aboutMoreList, setAboutMoreList] = useState(withAboutMoreList(null))
  const [aboutOpen, setAboutOpen] = useState(false)
  const [news, setNews] = useState<News[]>([])
  const [freeLessons, setFreeLessons] = useState<FreeLesson[]>([])
  // Әкімші «Өзгерту» терезесінде сақтағанда бет өзін қайта жүктейді
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const tabs = useMemo(() => homeTabs(reload), [reload])

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('*')
      .eq('school_id', CURRENT_SCHOOL_ID)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as SiteSettings | null
        setSettings(withDefaults(row))
        setAboutMoreList(withAboutMoreList(row?.about_more_list))
      })
    supabase.from('news').select('*').eq('school_id', CURRENT_SCHOOL_ID).eq('is_published', true).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setNews((data as News[]) ?? []))
    // Басты бетте — әкімші «Басты бетте көрсету» деп белгілеген тегін сабақтар
    fetchFreeLessons(true).then(setFreeLessons)
  }, [reloadKey])

  const introParagraphs = useMemo(() => settings.about_text.split('\n\n').filter(Boolean), [settings.about_text])
  const goals = useMemo(() => buildGoals(settings), [settings])

  const stats = [
    { value: settings.stat1_value, label: settings.stat1_label },
    { value: settings.stat2_value, label: settings.stat2_label },
    { value: settings.stat3_value, label: settings.stat3_label },
    { value: settings.stat4_value, label: settings.stat4_label },
  ]

  return (
    <>
      <PageEditor title="Басты бетті өзгерту" tabs={tabs} />
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">{settings.expert_role}</span>
          <h1 dangerouslySetInnerHTML={{ __html: highlightLast(settings.hero_title) }} />
          <p className="lead">{settings.hero_subtitle}</p>
          <div className="cta-row">
            <SmartLink href={settings.hero_btn1_url} className="btn btn-white">{settings.hero_btn1_label}</SmartLink>
            <SmartLink href={settings.hero_btn2_url} className="btn btn-outline on-dark">{settings.hero_btn2_label}</SmartLink>
            <SmartLink href={settings.hero_btn3_url} className="btn btn-outline on-dark">{settings.hero_btn3_label}</SmartLink>
          </div>
        </div>
        <div className="hero-photo">
          <img src={settings.hero_photo_url} alt={settings.expert_name} />
          <span className="hero-photo-badge">★ {settings.stat1_value} {settings.stat1_label}</span>
        </div>
        <div className="hero-stats stats-row">
          {stats.map((s, i) => (
            <div className="stat" key={i}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">{settings.goals_eyebrow}</span>
          <h2>{settings.goals_title}</h2>
          <p className="muted small">{settings.goals_text}</p>
        </div>
        <div className="goal-grid">
          {goals.map((g) => {
            const c = CATEGORY[g.category]
            return (
              <Link key={g.category} to={`/courses?category=${g.category}`} className="goal-card">
                <span className="icon-chip" style={{ background: c.gradient }}>{c.icon}</span>
                <h3>{g.title}</h3>
                <p>{g.text}</p>
                <span className="goal-link" style={{ color: c.color }}>{settings.goal_link_label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="about-card">
          <div>
            <div className="about-header">
              <img src={settings.hero_photo_url} alt={settings.expert_name} />
              <div>
                <span className="eyebrow" style={{ color: 'var(--gold)' }}>{settings.about_eyebrow}</span>
                <h2 style={{ margin: '4px 0 0' }}>{settings.about_title}</h2>
              </div>
            </div>
            <div className="about-text">
              {introParagraphs.slice(0, INTRO_VISIBLE).map((p, i) => <p key={i}>{p}</p>)}
            </div>

            <button className="about-toggle" onClick={() => setAboutOpen((v) => !v)} aria-expanded={aboutOpen}>
              {aboutOpen ? 'Жасыру' : settings.about_toggle_label}
              <span className={aboutOpen ? 'chevron up' : 'chevron'}>⌄</span>
            </button>

            {aboutOpen && (
              <div className="about-more">
                {introParagraphs.length > INTRO_VISIBLE && (
                  <div className="about-text about-text-rest" style={{ marginBottom: 16 }}>
                    {introParagraphs.slice(INTRO_VISIBLE).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                )}
                <span className="about-more-name">{settings.about_title}</span>
                <ul className="check-list" style={{ margin: '12px 0 16px' }}>
                  {aboutMoreList.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <p className="about-more-story">{settings.about_more_text}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {freeLessons.length > 0 && (
        <section className="section" id="free-preview">
          <div className="free-preview-band">
            <div className="section-head">
              <span className="eyebrow" style={{ color: 'var(--gold)' }}>{settings.free_eyebrow}</span>
              <h2>{settings.free_title}</h2>
              <p className="muted small" style={{ maxWidth: '52ch' }}>{settings.free_text}</p>
            </div>
            <div className="lesson-grid">
              {freeLessons.map((lesson) => <FreeLessonCard key={lesson.id} lesson={lesson} />)}
            </div>
            <Link to="/free-lessons" className="btn btn-outline" style={{ marginTop: 22 }}>{settings.free_home_button_label}</Link>
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section className="section" id="news">
          <div className="section-head">
            <span className="eyebrow" style={{ color: 'var(--brand)' }}>{settings.news_eyebrow}</span>
            <h2>{settings.news_title}</h2>
          </div>
          <div className="news-list">
            {news.map((n) => (
              <article className="news-card" key={n.id}>
                <span className="news-date">{formatDate(n.created_at)}</span>
                <h3>{n.title}</h3>
                {n.body && <p className="muted">{n.body}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

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

// «баспанаңызды алуға» сияқты соңғы тіркесті брендтік алтын түспен бөлектейді
function highlightLast(title: string) {
  const words = title.trim().split(' ')
  const tailCount = Math.min(3, words.length)
  const head = words.slice(0, words.length - tailCount).join(' ')
  const tail = words.slice(words.length - tailCount).join(' ')
  return `${head} <span class="accent">${tail}</span>`
}
