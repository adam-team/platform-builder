import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseKnowledgeFile, type KbEntry } from '../lib/curatorKb'
import base from '../data/curatorBase.json'

type FileRow = { id: string; name: string; entries: KbEntry[]; created_at: string }

// Куратордың жады: файлдарды қосу/өшіру. lessonId = null — барлық сабақ пен чатқа жалпы; әйтпесе осы сабаққа ғана.
// Бірнеше файл қосуға болады — куратор бәрінен бірден іздейді.
export default function CuratorFilesManager({ lessonId }: { lessonId: string | null }) {
  const [files, setFiles] = useState<FileRow[]>([])
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const q = supabase.from('curator_files').select('id, name, entries, created_at').order('created_at')
    const { data, error } = await (lessonId ? q.eq('lesson_id', lessonId) : q.is('lesson_id', null))
    if (error) return setMsg({ kind: 'error', text: `Кесте оқылмады (migration_30 орындалды ма?): ${error.message}` })
    setFiles((data as FileRow[]) ?? [])
  }
  useEffect(() => { load() }, [lessonId])

  async function upload(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    setMsg(null)
    const results: string[] = []
    for (const file of Array.from(list)) {
      try {
        const entries = await parseKnowledgeFile(file)
        if (!entries.length) { results.push(`❌ ${file.name}: сұрақ-жауап табылмады`); continue }
        const { error } = await supabase.from('curator_files').insert({ lesson_id: lessonId, name: file.name, entries })
        results.push(error ? `❌ ${file.name}: ${error.message}` : `✅ ${file.name}: ${entries.length} сұрақ-жауап`)
      } catch {
        results.push(`❌ ${file.name}: файлды оқу мүмкін болмады`)
      }
    }
    setBusy(false)
    setMsg({ kind: results.some((r) => r.startsWith('❌')) ? 'error' : 'ok', text: results.join('\n') })
    load()
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`«${name}» файлын өшіресіз бе?`)) return
    await supabase.from('curator_files').delete().eq('id', id)
    load()
  }

  return (
    <div className="field-block">
      {lessonId === null && (
        <p className="small">
          <b>Кірістірілген база:</b> {base.length} сұрақ-жауап (AI_kurator_baza_znaniy_Expert.docx). Ол барлық сабақтағы және төлеген клиенттің чатындағы AI-кураторға автоматты қосылған, өзгертілмейді.
        </p>
      )}
      <span className="small muted">
        {lessonId === null ? 'Қосымша жалпы файлдар (барлық сабақ пен чатқа):' : 'Осы сабаққа арналған қосымша файлдар (жалпы базаға қосымша):'}
      </span>
      {files.length === 0 && <span className="small muted">Файл әлі қосылмаған.</span>}
      {files.map((f) => (
        <div key={f.id} className="au-access-row">
          <span className="small"><b>{f.name}</b> — {f.entries?.length ?? 0} сұрақ-жауап</span>
          <button type="button" className="btn btn-outline btn-sm btn-delete-lesson" style={{ marginTop: 0 }} onClick={() => remove(f.id, f.name)}>Өшіру</button>
        </div>
      ))}
      <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
        {busy ? 'Жүктелуде…' : '+ Файл қосу (Word .docx / .txt, бірнешеуін таңдауға болады)'}
        <input type="file" accept=".docx,.txt,.md" multiple hidden disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      </label>
      <span className="small muted">
        Файл форматы: «Сұрақ: … / Жауап: … / Кілт сөздер: …» (әр жұп бос жолмен бөлінеді) немесе базалық файлдағыдай құрылымды Word (ВОПРОС / СҰРАҚ / КЛЮЧЕВЫЕ СЛОВА / ОТВЕТ / ЖАУАП).
      </span>
      {msg && <p className={msg.kind === 'ok' ? 'success' : 'error'} style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>}
    </div>
  )
}
