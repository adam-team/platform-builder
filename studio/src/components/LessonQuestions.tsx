import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/types'
import { isStaff } from '../lib/roles'

type Author = { full_name: string | null; email: string; role?: Role } | null
type Reply = { id: string; author_id: string; body: string; created_at: string; profiles: Author }
type Question = { id: string; user_id: string; body: string; created_at: string; profiles: Author; replies: Reply[] }

const nameOf = (p: Author) => p?.full_name || p?.email || 'Қолданушы'

// Сабақ астындағы сұрақ-жауап: төлеген клиенттер мен әкімші көреді және жауап береді, өшіру — тек әкімшіге
export default function LessonQuestions({ lessonId }: { lessonId: string }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [draft, setDraft] = useState('')
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data: rows } = await supabase.from('lesson_questions').select('*, profiles(full_name, email)').eq('lesson_id', lessonId).order('created_at')
    const list = (rows as Omit<Question, 'replies'>[]) ?? []
    if (list.length === 0) return setQuestions([])
    const { data: replyRows } = await supabase
      .from('lesson_question_replies')
      .select('*, profiles(full_name, email, role)')
      .in('question_id', list.map((q) => q.id))
      .order('created_at')
    const replies = (replyRows as (Reply & { question_id: string })[]) ?? []
    setQuestions(list.map((q) => ({ ...q, replies: replies.filter((r) => r.question_id === q.id) })))
  }
  useEffect(() => { load() }, [lessonId])

  async function ask(e: FormEvent) {
    e.preventDefault()
    if (!profile || !draft.trim()) return
    setBusy(true)
    setError('')
    const { error } = await supabase.from('lesson_questions').insert({ lesson_id: lessonId, user_id: profile.id, body: draft.trim() })
    setBusy(false)
    if (error) return setError(error.message)
    setDraft('')
    load()
  }

  async function reply(questionId: string) {
    const text = (replyDraft[questionId] ?? '').trim()
    if (!profile || !text) return
    setBusy(true)
    setError('')
    const { error } = await supabase.from('lesson_question_replies').insert({ question_id: questionId, author_id: profile.id, body: text })
    setBusy(false)
    if (error) return setError(error.message)
    setReplyDraft((d) => ({ ...d, [questionId]: '' }))
    load()
  }

  async function removeQuestion(id: string) {
    if (!window.confirm('Бұл сұрақты және оның жауаптарын өшіресіз бе?')) return
    await supabase.from('lesson_questions').delete().eq('id', id)
    load()
  }
  async function removeReply(id: string) {
    if (!window.confirm('Бұл жауапты өшіресіз бе?')) return
    await supabase.from('lesson_question_replies').delete().eq('id', id)
    load()
  }

  return (
    <div className="assignment-panel">
      <form className="answer-form" onSubmit={ask}>
        <label>Сұрағыңызды жазыңыз
          <textarea rows={3} required value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Сабақ бойынша сұрағыңыз" />
        </label>
        <button className="btn btn-primary btn-sm" disabled={busy}>Сұрақ қою</button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="answers-list">
        {questions === null && <p className="muted small">Жүктелуде…</p>}
        {questions?.length === 0 && <p className="muted small">Әлі сұрақ жоқ. Бірінші болып жазыңыз!</p>}
        {questions?.map((q) => (
          <div className="answer-card" key={q.id}>
            <div className="answer-head">
              <span className="answer-author">{nameOf(q.profiles)}</span>
              <span className="muted small">
                {new Date(q.created_at).toLocaleDateString('ru-RU')}
                {isAdmin && <button type="button" className="cal-del" style={{ marginLeft: 8 }} onClick={() => removeQuestion(q.id)}>Сұрақты өшіру</button>}
              </span>
            </div>
            <p className="answer-body">{q.body}</p>

            {q.replies.length > 0 && (
              <div className="reply-list">
                {q.replies.map((r) => (
                  <div className="reply-row" key={r.id}>
                    <span className={isStaff(r.profiles?.role) ? 'reply-author curator' : 'reply-author'}>
                      {nameOf(r.profiles)}{isStaff(r.profiles?.role) ? ' · куратор' : ''}
                      {isAdmin && <button type="button" className="cal-del" style={{ marginLeft: 8 }} onClick={() => removeReply(r.id)}>өшіру</button>}
                    </span>
                    <p>{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="reply-input">
              <input
                placeholder="Жауап жазу…"
                value={replyDraft[q.id] ?? ''}
                onChange={(e) => setReplyDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') reply(q.id) }}
              />
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => reply(q.id)}>Жауап беру</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
