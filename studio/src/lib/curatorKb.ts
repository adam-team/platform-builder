import { parseQa } from './curatorMatch'
import { parseStructuredHtml } from './curatorParse.mjs'

// ЖИ-сіз «куратор»: білім базасынан (Word файлдар) кілт сөздер бойынша жауап табады. Бірнеше файлдан бірден іздейді.
export type KbEntry = {
  id: string
  question: string
  questionKz: string
  keywords: string
  keywordsKz: string
  answer: string // HTML
  answerKz: string // HTML
  source: string
}

export type Lang = 'kz' | 'ru'

// Ең көп қойылатын 3 сұрақ (кірістірілген базадағы нөмірлері): қарыз, жинақ, баспана
export const POPULAR_IDS = ['D01', 'F01', 'H01']
export const FEEDBACK_IDS = { human: 'X05', no: 'X07', yes: 'X08' }
const SPECIAL = new Set(['X05', 'X07', 'X08'])

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const textToHtml = (text: string) => text.split(/\n{2,}|\n/).filter((l) => l.trim()).map((l) => `<p>${escapeHtml(l.trim())}</p>`).join('')

export function detectLang(text: string): Lang {
  const kz = (text.match(/[әғқңөұүһі]/gi) ?? []).length
  const ru = (text.match(/[а-яё]/gi) ?? []).length
  if (kz > 0) return 'kz'
  return ru > 0 ? 'ru' : 'kz'
}

export function entriesFromParsed(parsed: ReturnType<typeof parseStructuredHtml>, source: string): KbEntry[] {
  return parsed.map((p) => ({ ...p, source }))
}

export function entriesFromPlainText(text: string, source: string): KbEntry[] {
  return parseQa(text).map((e, i) => ({
    id: `${source}#${i + 1}`,
    question: e.question,
    questionKz: e.question,
    keywords: e.keywords,
    keywordsKz: e.keywords,
    answer: textToHtml(e.answer),
    answerKz: textToHtml(e.answer),
    source,
  }))
}

// Жүктелген файлдан жазбалар: Word (құрылымдық немесе қарапайым «Сұрақ: … Жауап: …») немесе .txt
export async function parseKnowledgeFile(file: File): Promise<KbEntry[]> {
  const name = file.name
  if (/\.docx$/i.test(name)) {
    const mammoth = (await import('mammoth/mammoth.browser') as unknown) as {
      convertToHtml: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
      extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
    }
    const buf = await file.arrayBuffer()
    const structured = entriesFromParsed(parseStructuredHtml((await mammoth.convertToHtml({ arrayBuffer: buf })).value), name)
    if (structured.length) return structured
    return entriesFromPlainText((await mammoth.extractRawText({ arrayBuffer: buf })).value, name)
  }
  return entriesFromPlainText(await file.text(), name)
}

// Қазақша/орысша жалғауларды ескеру үшін сөздің алғашқы 4 әрпін салыстырамыз
const STOP = new Set([
  'и', 'в', 'на', 'не', 'что', 'как', 'это', 'а', 'по', 'для', 'мне', 'меня', 'мой', 'моя', 'мои', 'можно', 'ли', 'если', 'хочу', 'или', 'у', 'я', 'мы', 'вы', 'с', 'к', 'от', 'до', 'же', 'бы', 'так', 'то', 'ещё', 'еще',
  'мен', 'бен', 'және', 'деп', 'ма', 'ме', 'ба', 'бе', 'па', 'пе', 'қалай', 'ол', 'бұл', 'бар', 'жоқ', 'үшін', 'да', 'де', 'та', 'те', 'менің', 'маған', 'керек', 'болады', 'бола', 'ба', 'қай', 'қандай',
])

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}/]+/gu, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s: string) => norm(s).split(' ').filter((w) => w.length >= 2 && !STOP.has(w))
const stem = (w: string) => (w.length > 4 ? w.slice(0, 4) : w)
const stems = (s: string) => [...new Set(tokens(s).map(stem))]

const splitKeywords = (s: string) => s.split(/[,;\n]/).map((k) => norm(k)).filter((k) => k.length >= 3)

// Қарыз сомасы бойынша бағыттау: 0–1 млн → D03; 1–10 → D04; 10–100 → D05; 100+ → D06
function debtBucket(query: string): string | null {
  const q = norm(query)
  if (!/(қарыз|долг|кредит|несие|займ)/.test(q)) return null
  if (/(миллиард|млрд)/.test(q)) return 'D06'
  const m = q.match(/(\d+(?:[.,]\d+)?)\s*(млн|миллион|million|м\b)/)
  if (!m) return null
  const v = parseFloat(m[1].replace(',', '.'))
  return v <= 1 ? 'D03' : v <= 10 ? 'D04' : v <= 100 ? 'D05' : 'D06'
}

type Scored = { e: KbEntry; score: number }

// Сирек кездесетін сөздер маңыздырақ (IDF): «с чего начать» сияқты жалпы сөз тіркестері бәріне ұқсамайды
const dfCache = new WeakMap<KbEntry[], { n: number; stem: Map<string, number>; phrase: Map<string, number> }>()
function docFreq(entries: KbEntry[]) {
  let c = dfCache.get(entries)
  if (c) return c
  const stemDf = new Map<string, number>()
  const phraseDf = new Map<string, number>()
  for (const e of entries) {
    const set = new Set([...stems(`${e.keywords} ${e.keywordsKz}`), ...stems(`${e.question} ${e.questionKz}`)])
    for (const st of set) stemDf.set(st, (stemDf.get(st) ?? 0) + 1)
    for (const ph of new Set([...splitKeywords(e.keywords), ...splitKeywords(e.keywordsKz)])) phraseDf.set(ph, (phraseDf.get(ph) ?? 0) + 1)
  }
  c = { n: Math.max(entries.length, 2), stem: stemDf, phrase: phraseDf }
  dfCache.set(entries, c)
  return c
}
const idf = (n: number, df: number) => Math.min(2, Math.max(0.6, 0.6 + Math.log(n / Math.max(df, 1)) / 2.2))

export function findAnswer(entries: KbEntry[], query: string): { best: KbEntry | null; suggestions: KbEntry[] } {
  const q = norm(query)
  const qStems = stems(query)
  if (qStems.length === 0) return { best: null, suggestions: [] }

  const bucket = debtBucket(query)
  if (bucket) {
    const hit = entries.find((e) => e.id === bucket)
    if (hit) return { best: hit, suggestions: [] }
  }

  const df = docFreq(entries)
  const scored: Scored[] = entries.map((e) => {
    const kwPhrases = [...splitKeywords(e.keywords), ...splitKeywords(e.keywordsKz)]
    const kwStems = new Set(stems(`${e.keywords} ${e.keywordsKz}`))
    const qsStems = new Set(stems(`${e.question} ${e.questionKz}`))
    let score = 0
    let coveredW = 0
    let totalW = 0
    for (const s of qStems) {
      const w = idf(df.n, df.stem.get(s) ?? 1)
      totalW += w
      if (kwStems.has(s) || qsStems.has(s)) coveredW += w
      score += (kwStems.has(s) ? 3 : qsStems.has(s) ? 1.5 : 0) * w
    }
    // кілт сөз тіркесі: барлық сөзі (түбірі) сұрақта болса — үлкен ұпай, көбі болса — аздап
    for (const phrase of kwPhrases) {
      const ps = stems(phrase)
      if (ps.length === 0) continue
      const cov = ps.filter((x) => qStems.includes(x)).length / ps.length
      const pw = idf(df.n, df.phrase.get(phrase) ?? 1)
      if (cov === 1) score += (ps.length >= 2 ? 8 : 5) * pw
      else if (ps.length >= 2 && cov >= 0.66) score += 3 * pw
    }
    // сұрақтың қаншасын осы жазба жауып тұр
    score += 6 * (coveredW / Math.max(totalW, 1))
    if (SPECIAL.has(e.id) && qStems.length > 6) score = 0
    return { e, score }
  }).sort((a, b) => b.score - a.score)

  const need = qStems.length <= 2 ? 3 : 4
  const top = scored[0]
  const best = top && top.score >= need ? top.e : null
  const suggestions = scored.filter((x) => x.score >= 2 && x.e !== best && !SPECIAL.has(x.e.id)).slice(0, 3).map((x) => x.e)
  return { best, suggestions }
}

export const questionOf = (e: KbEntry, lang: Lang) => (lang === 'kz' ? e.questionKz || e.question : e.question || e.questionKz)
export const answerOf = (e: KbEntry, lang: Lang) => (lang === 'kz' ? e.answerKz || e.answer : e.answer || e.answerKz)

// Ипотека / мөлшерлеме / мемлекеттік бағдарлама / банкроттық — ескерту жолын міндетті түрде қосамыз
export function needsDisclaimer(e: KbEntry): boolean {
  return /^(M|D11)/i.test(e.id) || /(ипотек|ставк|мөлшерлеме|банкрот|банкроттық|бағдарлам|программ)/i.test(e.keywords + ' ' + e.keywordsKz)
}
export const DISCLAIMER: Record<Lang, string> = {
  kz: 'Маңызды: деректер 2026 жылғы қыркүйектегі жағдай бойынша, шарттар өзгеруі мүмкін. Нақты шартты ресми сайттардан немесе консультацияда нақтылаңыз.',
  ru: 'Важно: данные актуальны на сентябрь 2026 года, условия могут меняться. Точные условия уточняйте на официальных сайтах или на консультации.',
}

const ALLOWED = new Set(['P', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'BR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A', 'H3', 'H4', 'SPAN'])

// Жауап HTML-ін тазалау (тек қауіпсіз тегтер) және жалаң сілтемелерді басылатын ету
export function sanitizeAnswer(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); continue }
      for (const attr of [...child.attributes]) {
        if (!(child.tagName === 'A' && attr.name === 'href')) child.removeAttribute(attr.name)
      }
      if (child.tagName === 'A') {
        const href = child.getAttribute('href') ?? ''
        if (!/^(https?:|tel:)/i.test(href)) child.removeAttribute('href')
        child.setAttribute('target', '_blank')
        child.setAttribute('rel', 'noopener noreferrer')
      }
      walk(child)
    }
  }
  const root = doc.body.firstElementChild as Element
  walk(root)
  // жалаң URL-дерді сілтемеге айналдырамыз (тек мәтіндік түйіндерде, бар <a> ішінде емес)
  const urlRe = /(https?:\/\/[^\s<)]+[^\s<).,;])/g
  const texts: Text[] = []
  const tw = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (tw.nextNode()) { const n = tw.currentNode as Text; if (n.parentElement?.tagName !== 'A' && urlRe.test(n.data)) texts.push(n); urlRe.lastIndex = 0 }
  for (const n of texts) {
    const frag = doc.createDocumentFragment()
    let last = 0
    for (const m of n.data.matchAll(urlRe)) {
      frag.append(n.data.slice(last, m.index))
      const a = doc.createElement('a')
      a.href = m[0]; a.target = '_blank'; a.rel = 'noopener noreferrer'
      a.textContent = m[0].length > 40 ? 'Сілтеме / Ссылка' : m[0]
      frag.append(a)
      last = (m.index ?? 0) + m[0].length
    }
    frag.append(n.data.slice(last))
    n.replaceWith(frag)
  }
  return root.innerHTML
}
