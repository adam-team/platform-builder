import { useEffect, useRef, useState } from 'react'

export interface CommandItem {
  sectionId: string
  sectionLabel: string
  id: string
  label: string
}

// <CommandPalette> (ЭТАП_01, компонент K) — Cmd/Ctrl+K бойынша ашылатын жылдам іздеу/өту.
// Ашық-жабықты сырттан басқарады (Admin.tsx), өзі тек тізім мен пернетақтаны басқарады.
export default function CommandPalette({
  items,
  open,
  onClose,
  onSelect,
}: {
  items: CommandItem[]
  open: boolean
  onClose: () => void
  onSelect: (item: CommandItem) => void
}) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? items.filter((i) => `${i.sectionLabel} ${i.label}`.toLowerCase().includes(query.trim().toLowerCase()))
    : items

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => { setActiveIdx(0) }, [query])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && filtered[activeIdx]) { onSelect(filtered[activeIdx]); onClose() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, filtered, activeIdx, onClose, onSelect])

  if (!open) return null

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Бөлім немесе бетті іздеу…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">Ештеңе табылмады</div>}
          {filtered.map((item, i) => (
            <button
              key={`${item.sectionId}.${item.id}`}
              className={i === activeIdx ? 'cmdk-item active' : 'cmdk-item'}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => { onSelect(item); onClose() }}
            >
              <span className="cmdk-section">{item.sectionLabel}</span>
              <span className="cmdk-sep">/</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
