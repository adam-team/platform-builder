import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { AnswerReply, Attachment, LessonAnswer } from '../lib/types'
import AttachmentList from './AttachmentList'
import AttachmentPicker from './AttachmentPicker'
import { isPaidOrStaff, isStaff } from '../lib/roles'

interface AnswerWithReplies extends LessonAnswer {
  replies: AnswerReply[]
}

function authorName(p: { full_name: string | null; email: string } | null | undefined) {
  return p?.full_name || p?.email || 'Қолданушы'
}

export default function AssignmentPanel({ lessonId, assignmentText }: { lessonId: string; assignmentText: string | null }) {
  const { profile, session } = useAuth()
  const [answers, setAnswers] = useState<AnswerWithReplies[] | null>(null)
  const [draft, setDraft] = useState('')
  const [photos, setPhotos] = useState<Attachment[]>([])
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canAnswer = isPaidOrStaff(profile?.role)

  async function load() {
    const { data: answerRows } = await supabase
      .from('lesson_answers')
      .select('*, profiles(full_name, email)')
      .eq('lesson_id', lessonId)
      .order('created_at')
    const list = (answerRows as LessonAnswer[]) ?? []
    if (list.length === 0) return setAnswers([])
    const { data: replyRows } = await supabase
      .from('answer_replies')
      .select('*, profiles(full_name, email, role)')
      .in('answer_id', list.map((a) => a.id))
      .order('created_at')
    const replies = (replyRows as AnswerReply[]) ?? []
    setAnswers(list.map((a) => ({ ...a, replies: replies.filter((r) => r.answer_id === a.id) })))
  }

  useEffect(() => { load() }, [lessonId])

  async function submitAnswer(e: FormEvent) {
    e.preventDefault()
    if (!profile || (!draft.trim() && photos.length === 0)) return setError('Жауап жазыңыз немесе фото қосыңыз')
    setBusy(true)
    setError('')
    const { error } = await supabase.from('lesson_answers').insert({
      lesson_id: lessonId, user_id: profile.id, body: draft.trim(),
      ...(photos.length ? { attachments: photos } : {}),
    })
    setBusy(false)
    if (error) return setError(error.message)
    setDraft('')
    setPhotos([])
    load()
  }

  async function submitReply(answerId: string) {
    const text = (replyDraft[answerId] ?? '').trim()
    if (!profile || !text) return
    setBusy(true)
    setError('')
    const { error } = await supabase.from('answer_replies').insert({ answer_id: answerId, author_id: profile.id, body: text })
    setBusy(false)
    if (error) return setError(error.message)
    setReplyDraft((d) => ({ ...d, [answerId]: '' }))
    load()
  }

  return (
    <div className="assignment-panel">
      <p className="lesson-body-text" style={{ marginBottom: 18 }}>{assignmentText || 'Бұл сабаққа тапсырма қосылмаған.'}</p>

      {canAnswer ? (
        <form className="answer-form" onSubmit={submitAnswer}>
          <label>Жауабыңызды жазыңыз (немесе тапсырманың фотосын қосыңыз)
            <textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          {profile && <AttachmentPicker ownerId={profile.id} value={photos} onChange={setPhotos} />}
          <button className="btn btn-primary btn-sm" disabled={busy}>Жауапты жіберу</button>
        </form>
      ) : !session ? (
        <div className="notice small">Жауап жазу үшін <Link to="/login">кіріңіз</Link>.</div>
      ) : (
        <div className="notice small">Тапсырмаға жауап жазу — тек төлеген клиенттер үшін.</div>
      )}
      {error && <p className="error">{error}</p>}

      <div className="answers-list">
        {answers === null && <p className="muted small">Жүктелуде…</p>}
        {answers?.length === 0 && <p className="muted small">Әлі жауап жоқ. Бірінші болып жазыңыз!</p>}
        {answers?.map((a) => (
          <div className="answer-card" key={a.id}>
            <div className="answer-head">
              <span className="answer-author">{authorName(a.profiles)}</span>
              <span className="muted small">
                {new Date(a.created_at).toLocaleDateString('ru-RU')}
                {a.status === 'accepted' && <span className="badge ok" style={{ marginLeft: 8 }}>✓ қабылданды</span>}
                {a.status === 'needs_revision' && <span className="badge" style={{ marginLeft: 8 }}>↩ пысықтау керек</span>}
              </span>
            </div>
            {a.body && <p className="answer-body">{a.body}</p>}
            <AttachmentList attachments={a.attachments} />

            {a.replies.length > 0 && (
              <div className="reply-list">
                {a.replies.map((r) => {
                  const isCurator = isStaff(r.profiles?.role)
                  return (
                    <div className="reply-row" key={r.id}>
                      <span className={isCurator ? 'reply-author curator' : 'reply-author'}>
                        {authorName(r.profiles)}{isCurator ? ' · куратор' : ''}
                      </span>
                      {r.body && <p>{r.body}</p>}
                      <AttachmentList attachments={r.attachments} youtubeId={r.youtube_id} />
                    </div>
                  )
                })}
              </div>
            )}

            {canAnswer && (
              <div className="reply-input">
                <input
                  placeholder="Пікір жазу…"
                  value={replyDraft[a.id] ?? ''}
                  onChange={(e) => setReplyDraft((d) => ({ ...d, [a.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitReply(a.id) }}
                />
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => submitReply(a.id)}>Жіберу</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
