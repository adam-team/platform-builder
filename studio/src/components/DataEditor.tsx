import { useState } from 'react'

// Кез келген құрылымды (мәтін, сан, тізім, тізім ішіндегі тізім, объектілер) өңдейтін жалпы редактор.
// КП беттерінің модульдері мен сабақтарын қосу, өшіру, орнын ауыстыру, мәтінін өзгерту үшін қолданылады.
type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

const LABELS: Record<string, string> = {
  title: 'Атауы', badge: 'Белгі', goal: 'Курс мақсаты', forWhom: 'Кімге арналған', results: 'Нәтижелер', modules: 'Модульдер',
  lessons: 'Сабақтар', body: 'Сипаттама', result: 'Нәтиже', format: 'Формат', label: 'Атауы', value: 'Мәні', text: 'Мәтін',
  author: 'Автор', name: 'Аты', facts: 'Деректер', story: 'Оқиға', after: 'Курстан кейін', why: 'Неге мені таңдайды', big: 'Үлкен белгі',
  offer: 'Ұсыныс', offerSub: 'Ұсыныстың жалғасы', mainResult: 'Негізгі нәтиже', mainResultNote: 'Негізгі нәтиже ескертпесі',
  how: 'Оқу қалай өтеді', howNote: 'Ескертпе', whatsInside: 'Курста не бар', whyNow: 'Неліктен қазір', intro: 'Кіріспе',
  lead: 'Жетекші сөйлем', points: 'Пункттер', outro: 'Қорытынды', finalOffer: 'Соңғы ұсыныс', cta: 'Батырма жазуы', quote: 'Дәйексөз',
  oldPrice: 'Ескі баға, ₸', price: 'Баға, ₸', access: 'Қолжетімділік мерзімі', features: 'Не кіреді', premium: 'Premium тарифіне кіреді',
  marquee: 'Жүгіретін жол', offline: 'Офлайн', online: 'Онлайн',
}
// Техникалық өрістерді (белгіше коды, id) көрсетпейміз — бірақ мәнін сақтаймыз
const HIDDEN = new Set(['icon', 'id'])

const isStr = (v: unknown): v is string => typeof v === 'string'
const isObj = (v: unknown): v is { [k: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v)

// Жаңа элементке үлгі: бастапқы құрылым бойынша бос мәндер
function blankLike(v: Json): Json {
  if (isStr(v)) return ''
  if (typeof v === 'number') return 0
  if (typeof v === 'boolean') return true
  if (Array.isArray(v)) return []
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, HIDDEN.has(k) ? x : blankLike(x)]))
  return ''
}

function summary(v: Json, i: number): string {
  if (isStr(v)) return v
  if (isObj(v)) {
    const s = Object.entries(v).find(([k, x]) => !HIDDEN.has(k) && isStr(x) && x)?.[1]
    if (isStr(s)) return s
  }
  return `#${i + 1}`
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const long = value.length > 70 || value.includes('\n')
  return (
    <label>{label}
      {long ? <textarea rows={Math.min(8, Math.ceil(value.length / 70) + 1)} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  )
}

function RowButtons({ i, len, onMove, onDelete }: { i: number; len: number; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <span className="de-btns">
      <button type="button" className="secondary" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Жоғары">↑</button>
      <button type="button" className="secondary" disabled={i === len - 1} onClick={() => onMove(1)} aria-label="Төмен">↓</button>
      {confirm
        ? <><button type="button" className="danger" onClick={onDelete}>Иә, өшіру</button><button type="button" className="secondary" onClick={() => setConfirm(false)}>Жоқ</button></>
        : <button type="button" className="danger" onClick={() => setConfirm(true)} aria-label="Өшіру">✕</button>}
    </span>
  )
}

function StringList({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="de-block">
      <span className="de-label">{label} <span className="muted small">({value.length})</span></span>
      {value.map((item, i) => (
        <div className="de-row" key={i}>
          <span className="de-num">{i + 1}</span>
          <div className="de-grow"><TextField label="" value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} /></div>
          <RowButtons i={i} len={value.length} onMove={(d) => onChange(move(value, i, d))} onDelete={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => onChange([...value, ''])}>+ Қосу</button>
    </div>
  )
}

function ObjectList({ label, value, template, onChange }: { label: string; value: Json[]; template: Json; onChange: (v: Json[]) => void }) {
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  return (
    <div className="de-block">
      <span className="de-label">{label} <span className="muted small">({value.length})</span></span>
      {value.map((item, i) => (
        <div className="de-card" key={i}>
          <div className="de-card-head">
            <button type="button" className="de-toggle" onClick={() => toggle(i)}>
              <span>{open.has(i) ? '▾' : '▸'}</span> <b>{i + 1}.</b> {summary(item, i).slice(0, 70)}
            </button>
            <RowButtons i={i} len={value.length} onMove={(d) => { setOpen(new Set()); onChange(move(value, i, d)) }} onDelete={() => { setOpen(new Set()); onChange(value.filter((_, j) => j !== i)) }} />
          </div>
          {open.has(i) && (
            <div className="de-card-body">
              <Node k="" value={item} template={template} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
            </div>
          )}
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => { onChange([...value, blankLike(template)]); setOpen(new Set([value.length])) }}>+ Қосу</button>
    </div>
  )
}

function Node({ k, value, template, onChange }: { k: string; value: Json; template?: Json; onChange: (v: Json) => void }) {
  const label = LABELS[k] ?? k
  if (isStr(value)) return <TextField label={label} value={value} onChange={onChange} />
  if (typeof value === 'number') return <label>{label}<input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>
  if (typeof value === 'boolean') return <label className="check"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
  if (Array.isArray(value)) {
    const tpl = Array.isArray(template) ? template[0] : undefined
    if (value.every(isStr) && (value.length > 0 || tpl === undefined || isStr(tpl))) return <StringList label={label} value={value as string[]} onChange={onChange} />
    return <ObjectList label={label} value={value} template={(tpl ?? value[0] ?? '') as Json} onChange={onChange} />
  }
  if (isObj(value)) {
    const tplObj = isObj(template) ? template : {}
    return (
      <div className={k ? 'de-group' : undefined}>
        {k && <span className="de-label">{label}</span>}
        {Object.keys(value).filter((key) => !HIDDEN.has(key)).map((key) => (
          <Node key={key} k={key} value={value[key]} template={tplObj[key]} onChange={(v) => onChange({ ...value, [key]: v })} />
        ))}
      </div>
    )
  }
  return null
}

export default function DataEditor({ value, template, onChange }: { value: unknown; template?: unknown; onChange: (v: unknown) => void }) {
  return <Node k="" value={value as Json} template={template as Json} onChange={onChange} />
}
