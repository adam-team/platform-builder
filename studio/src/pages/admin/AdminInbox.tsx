import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import type { Profile, SupportMessage } from '../../lib/types'

interface Thread {
  user: Profile
  messages: SupportMessage[]
  last: SupportMessage
}

// «Сұрағыңыз бар ма?» плавающая кнопкасынан келген хабарламалар — GetCourse-тегі «Входящие» сияқты.
export default function AdminInbox() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [{ data: msgs }, { data: profs }] = await Promise.all([
      supabase.from('support_messages').select('*').order('created_at'),
      supabase.from('profiles').select('*'),
    ])
    setMessages((msgs as SupportMessage[]) ?? [])
    setProfiles((profs as Profile[]) ?? [])
  }
  useEffect(() => { load() }, [])

  const threads = useMemo<Thread[]>(() => {
    if (!messages) return []
    const byUser = new Map<string, SupportMessage[]>()
    for (const m of messages) {
      if (!byUser.has(m.user_id)) byUser.set(m.user_id, [])
      byUser.get(m.user_id)!.push(m)
    }
    const list: Thread[] = []
    for (const [userId, msgs] of byUser) {
      const user = profiles.find((p) => p.id === userId)
      if (!user) continue
      list.push({ user, messages: msgs, last: msgs[msgs.length - 1] })
    }
    return list.sort((a, b) => b.last.created_at.localeCompare(a.last.created_at))
  }, [messages, profiles])

  const openThread = threads.find((t) => t.user.id === openUserId) ?? null

  async function send() {
    if (!profile || !openUserId || !draft.trim()) return
    setBusy(true)
    await supabase.from('support_messages').insert({ user_id: openUserId, author_id: profile.id, body: draft.trim() })
    setDraft('')
    setBusy(false)
    load()
  }

  if (!messages) return <p className="muted">Жүктелуде…</p>

  return (
    <div className="inbox-layout">
      <div className="inbox-threads">
        {threads.length === 0 && <p className="muted small">Хабарламалар әлі жоқ.</p>}
        {threads.map((t) => (
          <button
            key={t.user.id}
            className={t.user.id === openUserId ? 'inbox-thread active' : 'inbox-thread'}
            onClick={() => setOpenUserId(t.user.id)}
          >
            <b>{t.user.full_name || t.user.email}</b>
            <span className="muted small">{t.last.body}</span>
          </button>
        ))}
      </div>
      <div className="inbox-chat">
        {!openThread ? (
          <p className="muted small">Сол жақтан чатты таңдаңыз.</p>
        ) : (
          <>
            <h4>{openThread.user.full_name || openThread.user.email}</h4>
            <div className="support-list" style={{ maxHeight: 420 }}>
              {openThread.messages.map((m) => (
                <div key={m.id} className={m.author_id === openThread.user.id ? 'support-msg them' : 'support-msg me'}>
                  {m.author_id !== openThread.user.id && <span className="support-msg-author">Куратор</span>}
                  <p>{m.body}</p>
                </div>
              ))}
            </div>
            <div className="support-input" style={{ borderTop: '1px solid var(--hairline)', marginTop: 10, paddingTop: 12 }}>
              <input placeholder="Жауап жазу…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={send}>Жіберу</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
