import { useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { uploadCourseImage } from '../lib/media'
import type { Course, CourseChat } from '../lib/types'
import ChatIcon, { CHAT_ICON_LABEL, PresetIcon, type ChatIconKind } from './ChatIcon'

const DEFAULT_TOP30 = 'ТОП-30 ҚАРЫЗДАН ҚҰТЫЛУШЫ'

export function effectiveChats(course: Course): CourseChat[] {
  if (course.chats?.length) return course.chats
  const legacy: CourseChat[] = []
  if (course.whatsapp_url) legacy.push({ title: 'WhatsApp чаты', url: course.whatsapp_url })
  if (course.telegram_url) legacy.push({ title: 'Telegram чаты', url: course.telegram_url })
  return legacy
}

export function Top30Card({ course, editing, onSaved }: { course: Course; editing: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(course.top30_title ?? '')
  const [url, setUrl] = useState(course.top30_url ?? '')
  const [error, setError] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('courses').update({ top30_title: title || null, top30_url: url || null }).eq('id', course.id)
    if (error) return setError(error.message)
    setOpen(false)
    onSaved()
  }

  return (
    <div className="top30-card">
      <span className="top30-eyebrow">РЕЙТИНГ</span>
      <b className="top30-title">{course.top30_title || DEFAULT_TOP30}</b>
      {course.top30_url ? (
        <a href={course.top30_url} target="_blank" rel="noopener noreferrer" className="btn btn-white btn-sm">Өту ›</a>
      ) : (
        <span className="top30-soon">Жақында</span>
      )}
      {editing && !open && <button type="button" className="btn btn-white btn-sm" onClick={() => setOpen(true)}>Өзгерту</button>}
      {editing && open && (
        <form className="aside-form" onSubmit={save}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={DEFAULT_TOP30} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Рейтинг сілтемесі (https://...)" />
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn btn-white btn-sm">Сақтау</button>
            <button type="button" className="btn btn-outline on-dark btn-sm" onClick={() => setOpen(false)}>Болдырмау</button>
          </div>
        </form>
      )}
    </div>
  )
}

export function ChatsCard({ course, editing, onSaved }: { course: Course; editing: boolean; onSaved: () => void }) {
  const chats = effectiveChats(course)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<CourseChat[]>(chats)
  const [error, setError] = useState('')
  const [pickIdx, setPickIdx] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const patch = (i: number, p: Partial<CourseChat>) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...p } : x)))
  // Дайын иконка таңдалса — өз фотосы алынады, ал өз фото қойылса — дайын иконка орнына жүреді
  const choose = (i: number, kind: ChatIconKind) => { patch(i, { icon: kind, icon_url: undefined }); setPickIdx(null) }
  async function upload(file: File | undefined) {
    if (!file || pickIdx === null) return
    setError('')
    setUploading(true)
    const res = await uploadCourseImage(file, course.id)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (res.error || !res.url) return setError(`Фото жүктелмеді: ${res.error ?? 'қате'}`)
    patch(pickIdx, { icon_url: res.url, icon: undefined })
    setPickIdx(null)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const clean = draft.filter((c) => c.title.trim() && c.url.trim())
    const { error } = await supabase.from('courses').update({ chats: clean }).eq('id', course.id)
    if (error) return setError(error.message)
    setOpen(false)
    onSaved()
  }

  return (
    <div className="aside-card">
      <h4 className="aside-title">Маңызды</h4>
      {!open && (
        <div className="important-list">
          {chats.map((c, i) => (
            <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="important-link"><ChatIcon chat={c} size={28} /><span className="important-title">{c.title}</span> <span>›</span></a>
          ))}
          {chats.length === 0 && <p className="muted small">{editing ? 'Чат әлі жоқ — «Өзгерту» арқылы қосыңыз.' : 'Чат сілтемелері жақында қосылады.'}</p>}
          {editing && <button type="button" className="btn btn-outline btn-sm" onClick={() => { setDraft(chats); setOpen(true) }}>Өзгерту / чат қосу</button>}
        </div>
      )}
      {open && (
        <form className="aside-form" onSubmit={save}>
          {draft.map((c, i) => (
            <div key={i}>
              <div className="chat-draft">
                <button type="button" className="chat-icon-btn" onClick={() => setPickIdx(pickIdx === i ? null : i)} aria-label="Иконканы таңдау" title="Иконканы таңдау">
                  <ChatIcon chat={c} size={34} />
                </button>
                <input placeholder="Атауы (мысалы, WhatsApp чаты)" value={c.title} onChange={(e) => patch(i, { title: e.target.value })} />
                <input placeholder="Сілтеме" value={c.url} onChange={(e) => patch(i, { url: e.target.value })} />
                <button type="button" className="cal-del" onClick={() => { setPickIdx(null); setDraft(draft.filter((_, j) => j !== i)) }} aria-label="Өшіру">✕</button>
              </div>
              {pickIdx === i && (
                <div className="chat-icon-picker">
                  {(Object.keys(CHAT_ICON_LABEL) as ChatIconKind[]).map((k) => (
                    <button type="button" key={k} onClick={() => choose(i, k)}>
                      <PresetIcon kind={k} size={30} /><span>{CHAT_ICON_LABEL[k]}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <span className="chat-icon-photo">📷</span><span>{uploading ? 'Жүктелуде…' : 'Өз фото'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft([...draft, { title: '', url: '' }])}>+ Чат қосу</button>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn btn-primary btn-sm">Сақтау</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Болдырмау</button>
          </div>
        </form>
      )}
    </div>
  )
}
