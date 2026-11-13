import { useState, type ReactNode } from 'react'

// Тізімдер (мыс. «Консультация кезінде:») әдепкіде жабық: тақырып-батырманы басқанда тізім астына ашылады.
export default function Collapsible({ label, tone = 'light', children }: { label: string; tone?: 'light' | 'dark'; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`collapsible ${tone === 'dark' ? 'on-dark' : ''} ${open ? 'is-open' : ''}`}>
      <button type="button" className={tone === 'dark' ? 'about-toggle on-dark' : 'about-toggle'} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {label}
        <span className={open ? 'chevron up' : 'chevron'}>⌄</span>
      </button>
      <div className="collapsible-body"><div>{children}</div></div>
    </div>
  )
}
