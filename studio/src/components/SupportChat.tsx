import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import CuratorChat from './CuratorChat'
import type { SupportMessage } from '../lib/types'

// Плавающая кнопка «Сұрағыңыз бар ма? Кураторға жазыңыз» — қарапайым чат әр вошедшего.
// Әкімші жауап беру үшін Админка → Хабарлар → Кіріс бетін пайдаланады.
export default function SupportChat() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'ai' | 'human'>('ai')
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('support_messages')
      .select('*, profiles(full_name, email, role)')
      .eq('user_id', profile.id)
      .order('created_at')
    setMessages((data as SupportMessage[]) ?? [])
  }

  useEffect(() => { if (open && mode === 'human') load() }, [open, mode])
  // AI-куратордан «Нақты кураторға жазу» басылғанда осы панель адаммен чат режимінде ашылады
  useEffect(() => {
    function onOpen(e: Event) {
      setMode((e as CustomEvent<string>).detail === 'human' ? 'human' : 'ai')
      setOpen(true)
    }
    window.addEventListener('open-support-chat', onOpen)
    return () => window.removeEventListener('open-support-chat', onOpen)
  }, [])
  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight) }, [messages])

  async function send() {
    if (!profile || !draft.trim()) return
    setBusy(true)
    await supabase.from('support_messages').insert({ user_id: profile.id, author_id: profile.id, body: draft.trim() })
    setDraft('')
    setBusy(false)
    load()
  }

  if (!profile) return null

  return (
    <div className="support-chat">
      {open && (
        <div className="support-panel">
          <div className="support-head">
            <b>{mode === 'ai' ? 'AI-куратор' : 'Нақты куратор'}</b>
            <span>
              <button className="link-btn" onClick={() => setMode(mode === 'ai' ? 'human' : 'ai')}>
                {mode === 'ai' ? 'Нақты кураторға жазу →' : '← AI-куратор'}
              </button>{' '}
              <button className="link-btn" onClick={() => setOpen(false)}>✕</button>
            </span>
          </div>
          {mode === 'ai' ? (
            <div style={{ padding: '0 12px 12px' }}><CuratorChat onHuman={() => setMode('human')} /></div>
          ) : (
            <>
              <div className="support-list" ref={listRef}>
                {messages === null && <p className="muted small">Жүктелуде…</p>}
                {messages?.length === 0 && <p className="muted small">Кураторға бірінші хабарлама жазыңыз.</p>}
                {messages?.map((m) => (
                  <div key={m.id} className={m.author_id === profile.id ? 'support-msg me' : 'support-msg them'}>
                    {m.author_id !== profile.id && <span className="support-msg-author">Куратор</span>}
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>
              <div className="support-input">
                <input
                  placeholder="Хабарлама жазу…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                />
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={send}>➤</button>
              </div>
            </>
          )}
        </div>
      )}
      <button className="support-fab" onClick={() => setOpen((v) => !v)}>
        {open ? '✕' : '💬 AI-куратор'}
      </button>
    </div>
  )
}
