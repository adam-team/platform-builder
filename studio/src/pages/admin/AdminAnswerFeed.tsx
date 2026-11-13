import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import AttachmentList from '../../components/AttachmentList'
import AttachmentPicker from '../../components/AttachmentPicker'
import { VIDEO_ERROR, parseVideoInput } from '../../lib/video'
import { isStaff } from '../../lib/roles'
import type { AnswerReply, AnswerStatus, Attachment, Course, Lesson, LessonAnswer, ReplyTemplate } from '../../lib/types'
import { scheduleBackup } from '../../lib/backup'

interface Row extends LessonAnswer {
  replies: AnswerReply[]
}

const STATUS_LABEL: Record<AnswerStatus, string> = {
  pending: '🔴 Тексеруді қажет етеді',
  needs_revision: '🟡 Пысықтауда',
  accepted: '✅ Қабылданды',
  no_review_needed: '⚪ Тексеру қажет емес',
}
const STATUS_FILTERS: (AnswerStatus | 'all')[] = ['all', 'pending', 'needs_revision', 'accepted', 'no_review_needed']

function authorName(p: { full_name: string | null; email: string } | null | undefined) {
  return p?.full_name || p?.email || 'Қолданушы'
}
function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'бүгін'
  if (days === 1) return 'кеше'
  return `${days} күн бұрын`
}

// ЭТАП_05 «Лента ответов» — GetCourse-тегі ең жиі қолданылатын экран. Тізім + егжей-тегжей екі
// колонка (толық 3 колонкалы email-клиент дизайнын — курс ағашы сол жақта — келесіге қалдырдым,
// ол бөлек үлкен жұмыс), пернетақта таңбашалары (J/K/A/R/N), шаблон-жауаптар, ескілерді жаппай реттеу.
export default function AdminAnswerFeed() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [templates, setTemplates] = useState<ReplyTemplate[]>([])
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<AnswerStatus | 'all'>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyPhotos, setReplyPhotos] = useState<Attachment[]>([])
  const [replyVideo, setReplyVideo] = useState('')
  const [replyError, setReplyError] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const [{ data: answerRows }, { data: lessonRows }, { data: courseRows }, { data: templateRows }] = await Promise.all([
      supabase.from('lesson_answers').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('lessons').select('*'),
      supabase.from('courses').select('*'),
      supabase.from('reply_templates').select('*').order('created_at'),
    ])
    const list = (answerRows as LessonAnswer[]) ?? []
    setLessons((lessonRows as Lesson[]) ?? [])
    setCourses((courseRows as Course[]) ?? [])
    setTemplates((templateRows as ReplyTemplate[]) ?? [])
    if (list.length === 0) return setRows([])
    const { data: replyRows } = await supabase
      .from('answer_replies')
      .select('*, profiles(full_name, email, role)')
      .in('answer_id', list.map((a) => a.id))
      .order('created_at')
    const replies = (replyRows as AnswerReply[]) ?? []
    setRows(list.map((a) => ({ ...a, replies: replies.filter((r) => r.answer_id === a.id) })))
  }
  useEffect(() => { load() }, [])

  const lessonById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons])
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (courseFilter === 'all') return true
      return lessonById.get(r.lesson_id)?.course_id === courseFilter
    })
  }, [rows, statusFilter, courseFilter, lessonById])

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null
  const selectedIdx = selected ? filtered.findIndex((r) => r.id === selected.id) : -1

  // Әр курстағы тексеруді күтіп тұрған жауаптар саны (курс қойындыларында көрінеді)
  const pendingByCourse = useMemo(() => {
    const c: Record<string, number> = { all: 0 }
    for (const r of rows ?? []) {
      if (r.status !== 'pending') continue
      c.all += 1
      const cid = lessonById.get(r.lesson_id)?.course_id
      if (cid) c[cid] = (c[cid] ?? 0) + 1
    }
    return c
  }, [rows, lessonById])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 }
    for (const s of ['pending', 'needs_revision', 'accepted', 'no_review_needed']) c[s] = (rows ?? []).filter((r) => r.status === s).length
    return c
  }, [rows])

  // Оқушының жауабын толық өшіреді (кураторлардың пікірлерімен бірге — cascade)
  async function deleteAnswer(row: Row) {
    if (!window.confirm('Оқушының жауабын (және оған жазылған барлық пікірді) өшіресіз бе? Бұл қайтарылмайды.')) return
    setBusy(true)
    const { error } = await supabase.from('lesson_answers').delete().eq('id', row.id)
    setBusy(false)
    if (error) return alert(error.message)
    scheduleBackup()
    const idx = filtered.findIndex((r) => r.id === row.id)
    const next = filtered[idx + 1] ?? filtered[idx - 1] ?? null
    setSelectedId(next?.id ?? null)
    load()
  }

  // Тек бір пікірді (куратордың жауабын) өшіреді, оқушының сұрағы қалады
  async function deleteReply(replyId: string) {
    if (!window.confirm('Бұл пікірді өшіресіз бе?')) return
    const { error } = await supabase.from('answer_replies').delete().eq('id', replyId)
    if (error) return alert(error.message)
    scheduleBackup()
    load()
  }

  async function setStatus(row: Row, status: AnswerStatus) {
    setBusy(true)
    await supabase.from('lesson_answers').update({ status, reviewed: status === 'accepted' }).eq('id', row.id)
    if (status === 'accepted' || status === 'needs_revision') {
      const lessonTitle = lessonById.get(row.lesson_id)?.title ?? 'сабақ'
      await supabase.from('notifications').insert({
        user_id: row.user_id,
        title: status === 'accepted' ? `«${lessonTitle}» тапсырмасы қабылданды ✅` : `«${lessonTitle}» тапсырмасын пысықтау керек ↩`,
        link: `/lesson/${row.lesson_id}`,
      })
    }
    setBusy(false)
    scheduleBackup()
    // «конвейер проверки» — келесі жауапты автоматты ашу
    const idx = filtered.findIndex((r) => r.id === row.id)
    const next = filtered[idx + 1] ?? filtered[idx - 1] ?? null
    setSelectedId(next?.id ?? null)
    load()
  }

  // Жауап: мәтін + фото/файл (PDF т.б.) + YouTube сілтемесі. Бір нәрсесі болса жеткілікті.
  async function submitReply(row: Row, extra?: string): Promise<boolean> {
    const text = (extra ?? replyDraft).trim()
    const video = replyVideo.trim()
    if (!profile) return false
    setReplyError('')
    if (!text && replyPhotos.length === 0 && !video) { setReplyError('Мәтін жазыңыз, фото/файл қосыңыз немесе YouTube сілтемесін қойыңыз'); return false }
    const youtubeId = video ? parseVideoInput(video) : null
    if (video && !youtubeId) { setReplyError(VIDEO_ERROR); return false }
    setBusy(true)
    const { error } = await supabase.from('answer_replies').insert({
      answer_id: row.id, author_id: profile.id, body: text,
      ...(replyPhotos.length ? { attachments: replyPhotos } : {}),
      ...(youtubeId ? { youtube_id: youtubeId } : {}),
    })
    if (error) { setBusy(false); setReplyError(error.message); return false }
    await supabase.from('notifications').insert({
      user_id: row.user_id,
      title: `«${lessonById.get(row.lesson_id)?.title ?? 'сабақ'}» тапсырмасына куратор жауап берді 💬`,
      link: `/lesson/${row.lesson_id}`,
    })
    setBusy(false)
    scheduleBackup()
    setReplyDraft('')
    setReplyPhotos([])
    setReplyVideo('')
    load()
    return true
  }

  async function cleanupOld() {
    if (!rows) return
    const cutoff = Date.now() - 30 * 86400000
    const ids = rows.filter((r) => r.status === 'pending' && new Date(r.created_at).getTime() < cutoff).map((r) => r.id)
    if (ids.length === 0) return alert('30 күннен ескі тексерілмеген жауап жоқ.')
    if (!confirm(`${ids.length} ескі жауапты «тексеру қажет емес» деп белгілеу керек пе?`)) return
    await supabase.from('lesson_answers').update({ status: 'no_review_needed' }).in('id', ids)
    load()
  }

  // Пернетақта таңбашалары: J/K — тізім бойынша, A/R/N — шешім, C — пікір өрісіне фокус
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (!selected) return
      if (e.key === 'j') setSelectedId(filtered[selectedIdx + 1]?.id ?? selected.id)
      if (e.key === 'k') setSelectedId(filtered[selectedIdx - 1]?.id ?? selected.id)
      if (e.key === 'a') setStatus(selected, 'accepted')
      if (e.key === 'r') setStatus(selected, 'needs_revision')
      if (e.key === 'n') setStatus(selected, 'no_review_needed')
      if (e.key === 'c') document.querySelector<HTMLTextAreaElement>('.answer-reply-textarea')?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, filtered, selectedIdx])

  if (!rows) return <p className="muted">Жүктелуде…</p>

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <p className="muted small" style={{ margin: 0 }}>Пернетақта: J/K — жылжу, A — қабылдау, R — пысықтауға, N — тексеру қажет емес, C — пікір өрісі</p>
        <button type="button" className="secondary btn-sm" onClick={cleanupOld}>Ескі жауаптарды реттеу</button>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <div className="tabs" style={{ margin: 0, width: '100%' }}>
          <button className={courseFilter === 'all' ? 'tab active' : 'tab'} onClick={() => setCourseFilter('all')}>Барлық курстар{pendingByCourse.all > 0 && ` 🔴 ${pendingByCourse.all}`}</button>
          {courses.map((c) => (
            <button key={c.id} className={courseFilter === c.id ? 'tab active' : 'tab'} onClick={() => setCourseFilter(c.id)}>
              {c.title}{(pendingByCourse[c.id] ?? 0) > 0 && ` 🔴 ${pendingByCourse[c.id]}`}
            </button>
          ))}
        </div>
        <div className="tabs" style={{ margin: 0 }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s} className={statusFilter === s ? 'tab active' : 'tab'} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'Барлығы' : STATUS_LABEL[s]} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="answer-feed-layout">
        <div className="answer-feed-list">
          {filtered.length === 0 && <p className="muted small">Бұл сүзгіге сай жауап жоқ.</p>}
          {filtered.map((a) => {
            const lesson = lessonById.get(a.lesson_id)
            return (
              <button key={a.id} className={selected?.id === a.id ? 'answer-feed-row active' : 'answer-feed-row'} onClick={() => setSelectedId(a.id)}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b>{authorName(a.profiles)}</b>
                  <span className="muted small">{timeAgo(a.created_at)}</span>
                </div>
                <span className="muted small">{lesson?.title}</span>
                <p className="answer-feed-snippet">{a.body || (a.attachments?.length ? '📷 Фото жіберілді' : '')}</p>
                <span className="badge">{STATUS_LABEL[a.status]}</span>
              </button>
            )
          })}
        </div>

        <div className="answer-feed-detail">
          {!selected ? (
            <p className="muted">Тізімнен жауапты таңдаңыз.</p>
          ) : (
            <div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <b>{authorName(selected.profiles)}</b>
                  <span className="muted small"> · {lessonById.get(selected.lesson_id)?.title} · {courseById.get(lessonById.get(selected.lesson_id)?.course_id ?? '')?.title}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge">{STATUS_LABEL[selected.status]}</span>
                  <button type="button" className="danger btn-sm" onClick={() => deleteAnswer(selected)}>Жауапты өшіру</button>
                </div>
              </div>
              {selected.body && <p className="answer-body" style={{ marginTop: 10 }}>{selected.body}</p>}
              <AttachmentList attachments={selected.attachments} />

              {selected.replies.length > 0 && (
                <div className="reply-list">
                  {selected.replies.map((r) => (
                    <div className="reply-row" key={r.id}>
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className={isStaff(r.profiles?.role) ? 'reply-author curator' : 'reply-author'}>
                          {authorName(r.profiles)}{isStaff(r.profiles?.role) ? ' · куратор' : ''}
                        </span>
                        <button type="button" className="cal-del" onClick={() => deleteReply(r.id)} aria-label="Пікірді өшіру" title="Пікірді өшіру">✕</button>
                      </div>
                      {r.body && <p>{r.body}</p>}
                      <AttachmentList attachments={r.attachments} youtubeId={r.youtube_id} />
                    </div>
                  ))}
                </div>
              )}

              <div className="answer-review-panel">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="small muted" style={{ margin: 0 }}>Жауап (мәтін, фото, файл, бейне)</label>
                  <button type="button" className="secondary btn-sm" onClick={() => setShowTemplates((v) => !v)}>⚡ Шаблондар</button>
                </div>
                {showTemplates && (
                  <div className="tag-input-suggest" style={{ marginBottom: 8 }}>
                    {templates.map((t) => (
                      <button type="button" key={t.id} onClick={() => { setReplyDraft(t.body); setShowTemplates(false) }}>{t.title}</button>
                    ))}
                    {templates.length === 0 && <span className="muted small">Шаблон әлі жоқ</span>}
                  </div>
                )}
                <textarea
                  className="answer-reply-textarea"
                  rows={3}
                  placeholder="Жауап жазу… (C — фокус, Ctrl+Enter — жіберу және қабылдау)"
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { if (await submitReply(selected)) setStatus(selected, 'accepted') }
                  }}
                />
                <AttachmentPicker ownerId={selected.user_id} value={replyPhotos} onChange={setReplyPhotos} withFiles />
                <input
                  placeholder="▶ Бейне сілтемесі: Kinescope немесе YouTube (міндетті емес)"
                  value={replyVideo}
                  onChange={(e) => setReplyVideo(e.target.value)}
                />
                {replyError && <p className="error">{replyError}</p>}
                <div className="row" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => submitReply(selected)}>Жауап жіберу</button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => setStatus(selected, 'accepted')}>✅ Қабылдау</button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setStatus(selected, 'needs_revision')}>↩ Пысықтауға</button>
                  <button type="button" className="secondary btn-sm" disabled={busy} onClick={() => setStatus(selected, 'no_review_needed')}>Тексеру қажет емес</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
