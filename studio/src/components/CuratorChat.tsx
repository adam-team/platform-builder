import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONSULTATION_URL } from '../lib/content'
import {
  DISCLAIMER, FEEDBACK_IDS, POPULAR_IDS, answerOf, detectLang, findAnswer, needsDisclaimer, questionOf, sanitizeAnswer,
  entriesFromPlainText, type KbEntry, type Lang,
} from '../lib/curatorKb'

type Msg = {
  role: 'user' | 'assistant'
  text?: string
  html?: string
  actions?: boolean // WhatsApp + нақты кураторға жазу батырмалары
  askFeedback?: boolean
  suggestions?: KbEntry[]
  lang: Lang
}

// Білім базасы: кірістірілген базалық файл + әкімші қосқан жалпы файлдар + осы сабаққа арналған файлдар (бәрінен бірден іздейді)
export function useKnowledge(lessonId?: string) {
  const [entries, setEntries] = useState<KbEntry[] | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const base = ((await import('../data/curatorBase.json')).default as Omit<KbEntry, 'source'>[]).map((e) => ({ ...e, source: 'Базалық білім базасы' }))
      let extra: KbEntry[] = []
      try {
        const q = supabase.from('curator_files').select('name, entries')
        const { data } = await (lessonId ? q.or(`lesson_id.is.null,lesson_id.eq.${lessonId}`) : q.is('lesson_id', null))
        extra = ((data as { name: string; entries: KbEntry[] }[]) ?? []).flatMap((f) => (f.entries ?? []).map((e) => ({ ...e, source: f.name })))
        if (lessonId) {
          const { data: legacy } = await supabase.from('lesson_curator_files').select('context').eq('lesson_id', lessonId).maybeSingle()
          const text = (legacy as { context?: string } | null)?.context
          if (text) extra = [...extra, ...entriesFromPlainText(text, 'Сабақ файлы')]
        }
      } catch { /* кесте әлі құрылмаған — базалық файл ғана */ }
      // қосымша файлдар алдымен (сабаққа арналған нақтырақ), содан соң база
      if (!cancelled) setEntries([...extra, ...base])
    })()
    return () => { cancelled = true }
  }, [lessonId])
  return entries
}

export function openHumanChat() {
  window.dispatchEvent(new CustomEvent('open-support-chat', { detail: 'human' }))
}

export default function CuratorChat({ lessonId, onHuman }: { lessonId?: string; onHuman?: () => void }) {
  const entries = useKnowledge(lessonId)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const human = onHuman ?? openHumanChat

  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight) }, [messages])

  const byId = (id: string) => entries?.find((e) => e.id === id)
  const popular = useMemo(() => POPULAR_IDS.map((id) => entries?.find((e) => e.id === id)).filter((e): e is KbEntry => !!e), [entries])

  function reply(e: KbEntry | null, lang: Lang, suggestions: KbEntry[] = []): Msg {
    const fallback = byId(FEEDBACK_IDS.human)
    const entry = e ?? fallback
    if (!entry) {
      return { role: 'assistant', lang, actions: true, text: lang === 'kz' ? 'Бұл сұрақтың жауабы базада жоқ. Нақты кураторға жазыңыз.' : 'Ответа на этот вопрос в базе нет. Напишите живому куратору.' }
    }
    const isSpecial = [FEEDBACK_IDS.human, FEEDBACK_IDS.no, FEEDBACK_IDS.yes, 'X09'].includes(entry.id)
    let html = sanitizeAnswer(answerOf(entry, lang))
    if (needsDisclaimer(entry) && !/(қыркүйек|сентябр)/i.test(html)) html += `<p class="curator-important">⚠ ${DISCLAIMER[lang]}</p>`
    return { role: 'assistant', lang, html, actions: e === null || entry.id === FEEDBACK_IDS.no || entry.id === FEEDBACK_IDS.human || entry.id === 'X09', askFeedback: !isSpecial && e !== null, suggestions }
  }

  function ask(text: string, forced?: KbEntry) {
    const q = text.trim()
    if (!q || !entries) return
    const lang = detectLang(q)
    const found = forced ? { best: forced, suggestions: [] } : findAnswer(entries, q)
    setMessages((prev) => [...prev, { role: 'user', text: q, lang }, reply(found.best, lang, found.suggestions)])
    setDraft('')
  }

  function feedback(index: number, positive: boolean) {
    const lang = messages[index].lang
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, askFeedback: false } : m)))
    const yes = byId(FEEDBACK_IDS.yes)
    const no = byId(FEEDBACK_IDS.no)
    const label = positive ? (lang === 'kz' ? '👍 Иә, көмектесті' : '👍 Да, помогло') : (lang === 'kz' ? '👎 Жоқ, көмектеспеді' : '👎 Нет, не помогло')
    const next = positive ? yes : no
    setMessages((prev) => [...prev, { role: 'user', text: label, lang }, next
      ? { ...reply(next, lang), askFeedback: false, actions: !positive }
      : { role: 'assistant', lang, actions: !positive, text: positive ? 'Өте қуаныштымын!' : 'Кешіріңіз. Нақты кураторға жазыңыз.' }])
  }

  return (
    <div className="curator-box">
      <div className="support-list" ref={listRef}>
        {entries === null && <p className="muted small">Жүктелуде…</p>}
        {entries && messages.length === 0 && (
          <>
            <p className="muted small">Сәлеметсіз бе! Мен — AI-куратор. Сұрағыңызды қазақша немесе орысша жазыңыз, не төмендегі танымал сұрақтардың бірін таңдаңыз:</p>
            <div className="curator-chips">
              {popular.map((p) => <button key={p.id} type="button" className="curator-chip" onClick={() => ask(questionOf(p, 'kz'), p)}>{questionOf(p, 'kz')}</button>)}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'support-msg me' : 'support-msg them curator-answer'}>
            {m.role === 'assistant' && <span className="support-msg-author">AI-куратор</span>}
            {m.html ? <div dangerouslySetInnerHTML={{ __html: m.html }} /> : <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="curator-chips">
                <span className="small muted">{m.lang === 'kz' ? 'Мүмкін, мыналар керек шығар:' : 'Возможно, вам подойдёт:'}</span>
                {m.suggestions.map((s) => <button key={s.id} type="button" className="curator-chip" onClick={() => ask(questionOf(s, m.lang), s)}>{questionOf(s, m.lang)}</button>)}
              </div>
            )}
            {m.askFeedback && (
              <div className="curator-feedback">
                <span className="small">{m.lang === 'kz' ? 'Бұл жауап сізге көмектесті ме?' : 'Помог ли вам этот ответ?'}</span>
                <button type="button" className="curator-chip" onClick={() => feedback(i, true)}>👍 {m.lang === 'kz' ? 'Иә' : 'Да'}</button>
                <button type="button" className="curator-chip" onClick={() => feedback(i, false)}>👎 {m.lang === 'kz' ? 'Жоқ' : 'Нет'}</button>
              </div>
            )}
            {m.actions && (
              <div className="curator-actions">
                <a className="btn btn-primary btn-sm" href={CONSULTATION_URL} target="_blank" rel="noopener noreferrer">WhatsApp — тегін консультация</a>
                <button type="button" className="btn btn-outline btn-sm" onClick={human}>Нақты кураторға жазу</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="support-input">
        <input placeholder="Сұрағыңызды жазыңыз…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(draft) }} />
        <button className="btn btn-primary btn-sm" onClick={() => ask(draft)}>➤</button>
      </div>
    </div>
  )
}
