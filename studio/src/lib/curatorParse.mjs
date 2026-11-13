// Құрылымдық Word білім базасын (h2 «D01 · тақырып», ВОПРОС/СҰРАҚ/КЛЮЧЕВЫЕ СЛОВА/КІЛТ СӨЗДЕР, ОТВЕТ/ЖАУАП) талдау.
// Браузерде де (админ жаңа файл жүктегенде), Node-та да (скрипт) істейді — тек жол өңдеу, DOM керек емес.

const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()

const FEEDBACK_RE = /<p><em>\s*(Помог ли вам|Бұл жауап сізге көмектесті)[\s\S]*?<\/em><\/p>/gi

function field(block, labelRe) {
  const m = block.match(new RegExp(`<p><strong>\\s*(?:${labelRe})\\s*(?:\\([A-Z]{2}\\))?\\s*:?\\s*</strong>([\\s\\S]*?)</p>`, 'i'))
  return m ? stripTags(m[1]) : ''
}

function answerBlock(block, startRe, endRe) {
  const s = block.search(startRe)
  if (s < 0) return ''
  const after = block.slice(s).replace(startRe, '')
  const e = endRe ? after.search(endRe) : -1
  return (e >= 0 ? after.slice(0, e) : after).replace(FEEDBACK_RE, '').trim()
}

export function parseStructuredHtml(html) {
  const parts = html.split(/<h2>/).slice(1)
  const entries = []
  for (const part of parts) {
    const headEnd = part.indexOf('</h2>')
    if (headEnd < 0) continue
    const head = stripTags(part.slice(0, headEnd))
    const m = head.match(/^([A-Za-zА-Яа-я]\d{1,3})\s*[·.:\-–]\s*(.+)$/)
    if (!m) continue
    const body = part.slice(headEnd + 5)
    const question = field(body, 'ВОПРОС')
    const questionKz = field(body, 'СҰРАҚ')
    const answer = answerBlock(body, /<p><strong>\s*ОТВЕТ\s*(?:\(RU\))?\s*<\/strong><\/p>/i, /<p><strong>\s*ЖАУАП\s*(?:\(KZ\))?\s*<\/strong><\/p>/i)
    const answerKz = answerBlock(body, /<p><strong>\s*ЖАУАП\s*(?:\(KZ\))?\s*<\/strong><\/p>/i, null)
    if (!(question || questionKz) || !(answer || answerKz)) continue
    entries.push({
      id: m[1].toUpperCase(),
      question: question || m[2],
      questionKz,
      keywords: field(body, 'КЛЮЧЕВЫЕ СЛОВА'),
      keywordsKz: field(body, 'КІЛТ СӨЗДЕР'),
      answer,
      answerKz,
    })
  }
  return entries
}
