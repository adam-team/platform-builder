// «Куратор» — ЖИ-сіз: сабаққа тіркелген «сұрақ-жауап» файлынан кілт сөздер бойынша жауап табады (ақысыз, API керек емес).
export type QaEntry = { question: string; answer: string; keywords: string }

const Q_RE = /^\s*(сұрақ|вопрос|question|q)\s*[:：.)-]\s*(.*)$/i
const A_RE = /^\s*(жауап|ответ|answer|a)\s*[:：.)-]\s*(.*)$/i
const K_RE = /^\s*(кілт\s*сөздер|кілт сөз|ключевые\s*слова|keywords?)\s*[:：]\s*(.*)$/i

// Файл форматы: «Сұрақ: … / Жауап: … / Кілт сөздер: …» (кілт сөздер міндетті емес).
// Белгісіз болса — бос жолмен бөлінген блоктар: бірінші жол — сұрақ, қалғаны — жауап.
export function parseQa(text: string): QaEntry[] {
  const lines = text.replace(/\r/g, '').split('\n')
  const entries: QaEntry[] = []
  let cur: QaEntry | null = null
  let mode: 'q' | 'a' | 'k' | null = null

  for (const line of lines) {
    const q = line.match(Q_RE)
    const a = line.match(A_RE)
    const k = line.match(K_RE)
    if (q) {
      if (cur) entries.push(cur)
      cur = { question: q[2].trim(), answer: '', keywords: '' }
      mode = 'q'
    } else if (cur && a) {
      cur.answer = a[2].trim()
      mode = 'a'
    } else if (cur && k) {
      cur.keywords = k[2].trim()
      mode = 'k'
    } else if (cur && line.trim()) {
      if (mode === 'a') cur.answer += `\n${line.trim()}`
      else if (mode === 'k') cur.keywords += ` ${line.trim()}`
      else cur.question += ` ${line.trim()}`
    }
  }
  if (cur) entries.push(cur)
  const valid = entries.filter((e) => e.question && e.answer)
  if (valid.length > 0) return valid

  // қосалқы жол: бос жолмен бөлінген блоктар
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim().split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length >= 2)
    .map((b) => ({ question: b[0], answer: b.slice(1).join('\n'), keywords: '' }))
}
