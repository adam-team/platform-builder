import { createHash, randomBytes } from 'node:crypto'

// Freedom Pay (Казахстан) — онлайн-оплата картой, Kaspi QR и другими способами на странице Freedom Pay.
// Документация: https://freedompay.kz/docs-en/merchant-api/pay и https://freedompay.kz/docs-en/merchant-api/intro
// Подпись pg_sig = md5("<имя скрипта>;<значения всех полей по алфавиту ключей>;<секретный ключ>").
// Имя скрипта — последний сегмент URL: для создания платежа "init_payment.php", для уведомления — имя нашего
// обработчика ("pay-result").

export const FREEDOM_API = 'https://api.freedompay.kz'

export type FreedomConfig = { merchantId: string; secretKey: string; testing: boolean }

export function freedomConfig(): FreedomConfig | { error: string } {
  const merchantId = process.env.FREEDOM_MERCHANT_ID
  const secretKey = process.env.FREEDOM_SECRET_KEY
  if (!merchantId || !secretKey) {
    const missing = [!merchantId && 'FREEDOM_MERCHANT_ID', !secretKey && 'FREEDOM_SECRET_KEY'].filter(Boolean).join(', ')
    return { error: `Оплата не настроена: в Vercel нет переменной ${missing}` }
  }
  return { merchantId, secretKey, testing: process.env.FREEDOM_TESTING === '1' }
}

interface Params { [key: string]: string | number | undefined | null | Params | (string | number)[] }

// Плоский список «ключ → значение» как в эталонном PHP из документации: вложенные поля получают имя
// родитель + ключ + номер позиции (001, 002…). Пустые (undefined/null) поля не участвуют.
function flatten(params: Params, parent = ''): [string, string][] {
  const out: [string, string][] = []
  let i = 0
  for (const [key, value] of Object.entries(params)) {
    i += 1
    if (value === undefined || value === null) continue
    const name = parent ? `${parent}${key}${String(i).padStart(3, '0')}` : key
    if (typeof value === 'object') out.push(...flatten(value as Params, name))
    else out.push([name, String(value)])
  }
  return out
}

export function sign(script: string, params: Params, secretKey: string): string {
  const pairs = flatten(Object.fromEntries(Object.entries(params).filter(([k]) => k !== 'pg_sig')) as Params)
  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const line = [script, ...pairs.map(([, v]) => v), secretKey].join(';')
  return createHash('md5').update(line, 'utf8').digest('hex')
}

export function verify(script: string, params: Record<string, string>, secretKey: string): boolean {
  return !!params.pg_sig && sign(script, params, secretKey) === params.pg_sig
}

export const salt = () => randomBytes(8).toString('hex')

// Ответ Freedom Pay приходит в XML: <response><pg_status>ok</pg_status><pg_redirect_url>…</pg_redirect_url>…</response>
export function readXml(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  if (!m) return null
  return m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/&amp;/g, '&').trim()
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Ответ нашего сервера на уведомление об оплате (тоже XML с подписью).
export function resultResponse(script: string, status: 'ok' | 'rejected' | 'error', description: string, secretKey: string): string {
  const body = { pg_status: status, pg_description: description, pg_salt: salt() }
  const pg_sig = sign(script, body, secretKey)
  return `<?xml version="1.0" encoding="utf-8"?><response><pg_status>${status}</pg_status><pg_description>${esc(description)}</pg_description><pg_salt>${body.pg_salt}</pg_salt><pg_sig>${pg_sig}</pg_sig></response>`
}
