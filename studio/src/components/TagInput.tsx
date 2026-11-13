import { useState, type KeyboardEvent } from 'react'

// <TagInput> (ЭТАП_01, компонент G) — кез келген сущностіге тег қою, автотолтырусыз да жұмыс істейді.
export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'тег қосу…',
}: {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  function commit() {
    const tag = draft.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    if (e.key === 'Backspace' && !draft && value.length > 0) onChange(value.slice(0, -1))
  }
  function remove(tag: string) { onChange(value.filter((t) => t !== tag)) }

  const options = suggestions.filter((s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()))

  return (
    <div className="tag-input">
      <div className="tag-input-chips">
        {value.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`«${tag}» тегін алып тастау`}>✕</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
      {draft && options.length > 0 && (
        <div className="tag-input-suggest">
          {options.slice(0, 6).map((s) => (
            <button type="button" key={s} onClick={() => { onChange([...value, s]); setDraft('') }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}
