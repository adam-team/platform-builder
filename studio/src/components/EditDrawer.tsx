import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface EditTab { id: string; label: string; node: ReactNode }

// Беттің оң жағынан ашылатын өңдеу терезесі: қойындылар (Басты блок / Мәтіндер / …). Тек бір қойынды
// ашық — қалғаны жойылады, сондықтан әр қойынды ашылғанда базадағы ең жаңа мәнді жүктейді.
export default function EditDrawer({ title, tabs, onClose, footer }: { title: string; tabs: EditTab[]; onClose: () => void; footer?: ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  return createPortal(
    <div className="edit-drawer-root" role="dialog" aria-modal="true" aria-label={title}>
      <div className="edit-drawer-backdrop" onClick={onClose} />
      <aside className="edit-drawer admin-plain">
        <header className="edit-drawer-head">
          <h2>{title}</h2>
          <button type="button" className="secondary" onClick={onClose}>Жабу ✕</button>
        </header>
        <div className="tabs edit-drawer-tabs">
          {tabs.map((t) => (
            <button key={t.id} type="button" className={t.id === current.id ? 'tab active' : 'tab'} onClick={() => setActive(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="edit-drawer-body" key={current.id}>{current.node}</div>
        {footer && <div className="edit-drawer-footer">{footer}</div>}
      </aside>
    </div>,
    document.body,
  )
}
