import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AccountMenu from '../../components/AccountMenu'
import CommandPalette, { type CommandItem } from '../../components/CommandPalette'
import { useAuth } from '../../lib/auth'
import { DEFAULT_SETTINGS } from '../../lib/content'
import { sectionsFor } from './adminSections'
import { scheduleBackup } from '../../lib/backup'

const PIN_KEY = 'admin-rail-pinned'

// Әкімшінің толық экранды консолі (ЭТАП_01): сол жақ рельс + flyout-мәзір (клик бойынша ашылады,
// 📌 арқылы бекітуге болады — сонда GetCourse-тегідей әрдайым ашық тұрады).
export default function Admin() {
  const { profile } = useAuth()
  // Әдмин консолі ашық тұрған уақытта фондық сақтық көшірме: бірден бір рет, содан кейін әр 10 минут сайын
  // (шамалы contentке жаңа өзгеріс болса — жеке сақтау орындарындағы scheduleBackup жылдамырақ жібереді).
  useEffect(() => {
    if (profile?.role !== 'admin') return
    scheduleBackup()
    const id = window.setInterval(scheduleBackup, 10 * 60_000)
    return () => window.clearInterval(id)
  }, [profile?.role])
  // Әкімші — барлық бөлім; куратор — тек «Пайдаланушылар» мен «Тапсырмалар»
  const SECTIONS = useMemo(() => sectionsFor(profile?.role), [profile?.role])
  const FLAT = useMemo(() => SECTIONS.flatMap((s) => s.items.map((i) => ({ sectionId: s.id, sectionLabel: s.label, ...i }))), [SECTIONS])
  const [params, setParams] = useSearchParams()
  const requestedSection = params.get('section')
  const requestedItem = params.get('item')
  const initial = useMemo(() => {
    const bySection = FLAT.find((i) => i.sectionId === requestedSection && (!requestedItem || i.id === requestedItem))
      ?? FLAT.find((i) => i.sectionId === requestedSection)
    return bySection ?? FLAT[0]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [sectionId, setSectionId] = useState(initial.sectionId)
  const [itemId, setItemId] = useState<string>(initial.id)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [pinned, setPinned] = useState(() => localStorage.getItem(PIN_KEY) === '1')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const avatarInitial = (profile?.full_name || profile?.email || 'A').trim().charAt(0).toUpperCase()
  const flyoutRef = useRef<HTMLDivElement>(null)

  const section = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0]
  const item = section.items.find((i) => i.id === itemId) ?? section.items[0]
  const Content = item.Component

  // Ағымдағы бөлім/бет URL-де көрінеді — сілтемені көшіріп, бөлісуге/жаңартуға болады (ЭТАП_14, QA #1)
  useEffect(() => {
    setParams({ section: sectionId, item: itemId }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, itemId])

  function openSection(id: string) {
    if (id === sectionId && flyoutOpen) { setFlyoutOpen(false); return }
    const s = SECTIONS.find((x) => x.id === id)!
    setSectionId(id)
    setItemId(s.items[0].id)
    setFlyoutOpen(true)
  }

  function selectItem(secId: string, iId: string) {
    setSectionId(secId)
    setItemId(iId)
    setDrawerOpen(false)
    if (!pinned) setFlyoutOpen(false)
  }

  function togglePin() {
    const next = !pinned
    setPinned(next)
    localStorage.setItem(PIN_KEY, next ? '1' : '0')
    if (next) setFlyoutOpen(true)
  }

  // Esc / сырттан клик — flyout-ты жабады (бекітілмеген болса)
  useEffect(() => {
    if (pinned || !flyoutOpen) return
    function onDown(e: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) setFlyoutOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setFlyoutOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [pinned, flyoutOpen])

  // Cmd/Ctrl+K — команда палитрасы
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((v) => !v) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function onPaletteSelect(cmd: CommandItem) { selectItem(cmd.sectionId, cmd.id) }

  const railButton = (s: (typeof SECTIONS)[number]) => (
    <button
      key={s.id}
      className={s.id === sectionId && flyoutOpen ? 'admin-rail-btn active' : 'admin-rail-btn'}
      onClick={() => openSection(s.id)}
      title={s.label}
    >
      <span className="admin-rail-icon">{s.icon}</span>
      <span className="admin-rail-label">{s.label}</span>
    </button>
  )

  return (
    <div className="admin-full-shell">
      <div className="admin-mobile-topbar">
        <button type="button" className="admin-drawer-toggle" onClick={() => { setDrawerOpen(true); setFlyoutOpen(true) }} aria-label="Бүйірлік мәзірді ашу">
          <span className="avatar-circle">{avatarInitial}</span>
          <span className="admin-drawer-hint">Мәзір ›</span>
        </button>
        <Link to="/" className="brand-mark">
          <img src={DEFAULT_SETTINGS.hero_photo_url} alt="" />
          <div className="brand-text"><div className="name">{DEFAULT_SETTINGS.expert_name}</div></div>
        </Link>
      </div>

      <div className="admin-body">
        <div className={drawerOpen ? 'admin-nav-wrap drawer-open' : 'admin-nav-wrap'}>
        <div className="admin-drawer-backdrop" onClick={() => { setDrawerOpen(false); setFlyoutOpen(false) }} />
        <aside className="admin-rail">
          <div className="admin-rail-account"><AccountMenu /></div>
          {SECTIONS.slice(0, 1).map((s) => railButton(s))}
          <button className="admin-rail-btn admin-rail-search" onClick={() => setPaletteOpen(true)} title="Іздеу (Cmd/Ctrl+K)">
            <span className="admin-rail-icon">🔍</span>
            <span className="admin-rail-label">Іздеу</span>
          </button>
          <div className="admin-rail-divider" />
          {SECTIONS.slice(1).map((s) => railButton(s))}
        </aside>

        {flyoutOpen && (
          <nav className={pinned ? 'admin-flyout pinned' : 'admin-flyout'} ref={flyoutRef}>
            <div className="admin-flyout-head">
              <h4>{section.label}</h4>
              <button
                className={pinned ? 'admin-pin-btn active' : 'admin-pin-btn'}
                onClick={togglePin}
                title={pinned ? 'Босату' : 'Бекіту — әрдайым ашық тұрады'}
              >
                📌
              </button>
            </div>
            {section.items.map((i) => (
              <button key={i.id} className={i.id === itemId ? 'admin-subnav-btn active' : 'admin-subnav-btn'} onClick={() => selectItem(section.id, i.id)}>
                {i.label}
              </button>
            ))}
          </nav>
        )}
        </div>

        <div className={flyoutOpen && pinned ? 'admin-plain admin-content with-pinned-flyout' : 'admin-plain admin-content'}>
          <h1 className="admin-content-title">{section.label} · {item.label}</h1>
          <Content />
        </div>
      </div>

      <CommandPalette items={FLAT} open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={onPaletteSelect} />
    </div>
  )
}
