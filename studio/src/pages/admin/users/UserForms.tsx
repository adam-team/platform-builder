import { useState, type FormEvent, type ReactNode } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { toLocalInput } from '../../../lib/access'
import { scheduleBackup } from '../../../lib/backup'
import type { Course, Profile, Role } from '../../../lib/types'
import { isAdminRole } from '../../../lib/roles'
import { daysLeft, fmtDate, fmtDateTime, type UsersData } from './useUsersData'

type Unit = 'day' | 'week' | 'month' | 'year'
const UNIT_LABEL: Record<Unit, string> = { day: 'күн', week: 'апта', month: 'ай', year: 'жыл' }
type Grant = { on: boolean; amount: string; unit: Unit }

export const DEFAULT_MESSAGE = 'Сәлеметсіз бе, {name}! Сізге «Эксперт Аты-жөні» платформасына қолжетімділік ашылды. Төменде кіру мәліметтері көрсетілген. Сәттілік тілейміз!'
const STAFF_MESSAGE = 'Сәлеметсіз бе, {name}! Сізді платформаға команда мүшесі ретінде шақырамыз. Төменде кіру мәліметтері көрсетілген.'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="au-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="au-modal">
        <div className="au-modal-head">
          <h3>{title}</h3>
          <button type="button" className="secondary" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export async function syncUserToSheet(token: string | undefined, userId: string) {
  try { await fetch('/api/admin-sync-user', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId }) }) } catch { /* кесте қолжетімсіз — елемейміз */ }
}

export async function callApi(path: string, token: string | undefined, body: unknown) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok && !json.error) json.error = `Сервер қатесі (${res.status}). Vercel → Deployments → Functions журналын қараңыз`
  return { ok: res.ok, json }
}

function CoursePicker({ courses, value, onChange }: { courses: Course[]; value: Record<string, Grant>; onChange: (v: Record<string, Grant>) => void }) {
  return (
    <div className="au-courses">
      {courses.map((c) => {
        const g = value[c.id] ?? { on: false, amount: '', unit: 'month' as Unit }
        const set = (patch: Partial<Grant>) => onChange({ ...value, [c.id]: { ...g, ...patch } })
        return (
          <div key={c.id} className="au-course-row">
            <label className="check"><input type="checkbox" checked={g.on} onChange={(e) => set({ on: e.target.checked })} /> {c.title}</label>
            {g.on && (
              <span className="au-duration">
                <input type="number" min="1" placeholder="мерзімсіз" value={g.amount} onChange={(e) => set({ amount: e.target.value })} />
                <select value={g.unit} onChange={(e) => set({ unit: e.target.value as Unit })}>
                  {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                </select>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const grantsToPayload = (grants: Record<string, Grant>) =>
  Object.entries(grants).filter(([, g]) => g.on).map(([courseId, g]) => ({ courseId, amount: g.amount ? Number(g.amount) : null, unit: g.amount ? g.unit : null }))

function parsePerson(tokens: string[]): { email: string; fullName: string; phone: string } | null {
  const clean = tokens.map((t) => String(t ?? '').trim()).filter(Boolean)
  const email = clean.find((t) => /^\S+@\S+\.\S+$/.test(t))
  if (!email) return null
  const phone = clean.find((t) => t !== email && /^\+?[\d\s()-]{7,}$/.test(t)) ?? ''
  const fullName = clean.filter((t) => t !== email && t !== phone).join(' ')
  return { email, fullName, phone }
}

function parseText(text: string) {
  return text.split('\n').map((line) => parsePerson(line.split(/[;:\t,]/))).filter((x): x is NonNullable<typeof x> => !!x)
}

async function parseFile(file: File) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })
  return rows.map((r) => parsePerson(r as string[])).filter((x): x is NonNullable<typeof x> => !!x)
}

type Result = { email: string; status: 'ok' | 'existing' | 'error'; text: string; password?: string }

// Қосу: жеке пайдаланушы / қызметкер шақыру / бірнешеуін (мәтін, CSV, Excel)
export function AddUserModal({ mode, data, presetCourseId, onClose, onDone }: { mode: 'single' | 'staff' | 'bulk'; data: UsersData; presetCourseId?: string; onClose: () => void; onDone: () => void }) {
  const { session, profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [message, setMessage] = useState(mode === 'staff' ? STAFF_MESSAGE : DEFAULT_MESSAGE)
  const [grants, setGrants] = useState<Record<string, Grant>>(presetCourseId ? { [presetCourseId]: { on: true, amount: '', unit: 'month' } } : {})
  const [grantedAt, setGrantedAt] = useState(toLocalInput(new Date().toISOString()))
  const [sendEmail, setSendEmail] = useState(true)
  const [staffRole, setStaffRole] = useState<'curator' | 'admin'>('curator')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Result[] | null>(null)
  const [progress, setProgress] = useState('')

  async function create(person: { email: string; fullName: string; phone: string }): Promise<Result> {
    const { ok, json } = await callApi('/api/admin-create-user', session?.access_token, {
      ...person,
      message,
      asStaff: mode === 'staff',
      role: mode === 'staff' ? staffRole : undefined,
      courses: mode === 'staff' ? [] : grantsToPayload(grants),
      grantedAt: new Date(grantedAt).toISOString(),
      sendEmail,
    })
    if (!ok) return { email: person.email, status: 'error', text: json.error ?? 'Қате' }
    const mail = sendEmail ? (json.emailSent ? 'хат жіберілді' : `хат жіберілмеді (${json.emailError ?? 'пошта бапталмаған'})`) : 'хатсыз'
    return { email: person.email, status: json.existing ? 'existing' : 'ok', text: `${json.existing ? 'бұрыннан бар — қолжетімділік қосылды' : 'құрылды'}, ${mail}`, password: json.password }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    let people: { email: string; fullName: string; phone: string }[]
    if (mode === 'bulk') {
      people = parseText(bulkText)
      if (!people.length) { setBusy(false); return setError('Пошталар табылмады. Әр жолға: пошта; аты; телефон') }
    } else {
      people = [{ email, fullName, phone }]
    }
    // Бірнешеуін бірден, кезекпен емес — 100 адам да, 1 адам да шамамен бірдей уақытта қосылсын
    // (CONCURRENCY — бір мезгілде жіберілетін сұраныс саны, Supabase/Resend шектеуінен аспас үшін).
    const CONCURRENCY = 24
    const out: Result[] = new Array(people.length)
    let done = 0
    let cursor = 0
    async function worker() {
      while (cursor < people.length) {
        const i = cursor++
        out[i] = await create(people[i])
        done++
        setProgress(people.length > 1 ? `${done} / ${people.length}` : '')
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, people.length) }, worker))
    setBusy(false)
    setProgress('')
    setResults(out)
    scheduleBackup()
    onDone()
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const rows = await parseFile(file)
      setBulkText((prev) => [prev.trim(), ...rows.map((r) => [r.email, r.fullName, r.phone].join('; '))].filter(Boolean).join('\n'))
    } catch { setError('Файлды оқу мүмкін болмады (CSV немесе Excel)') }
  }

  const title = mode === 'staff' ? 'Команда мүшесін шақыру' : mode === 'bulk' ? 'Бірнеше пайдаланушы қосу' : 'Пайдаланушы қосу'

  if (results) {
    return (
      <Modal title="Нәтиже" onClose={onClose}>
        <table>
          <tbody>
            {results.map((r) => (
              <tr key={r.email}>
                <td>{r.status === 'error' ? '❌' : '✅'} {r.email}</td>
                <td className="small">{r.text}{r.password && <> · құпия сөз: <b>{r.password}</b></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 10 }}>Құпия сөз тек осы жерде бір рет көрсетіледі (хат жіберілмесе, өзіңіз беріңіз).</p>
        <button type="button" onClick={onClose} style={{ marginTop: 10 }}>Жабу</button>
      </Modal>
    )
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {mode === 'bulk' ? (
          <>
            <label>Әр жолға бір адам: пошта; аты-жөні; телефон (бөлгіш: ; , : немесе табуляция)
              <textarea rows={6} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={'aidana@mail.ru; Айдана Серікқызы; +7 701 000 00 00\nnurlan@gmail.com; Нұрлан'} />
            </label>
            <label>Немесе CSV / Excel файлын жүктеңіз
              <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            <p className="small muted">Табылған адам саны: <b>{parseText(bulkText).length}</b></p>
          </>
        ) : (
          <>
            <div className="row">
              <label>Аты-жөні<input value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
              <label>Электрондық пошта *<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            </div>
            <label>Телефон<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 ..." /></label>
            {mode === 'staff' && (
              <label>Рөлі
                <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as 'curator' | 'admin')}>
                  <option value="curator">Куратор — қолжетімділік ашады және оқушылардың тапсырмаларына жауап береді</option>
                  {isAdmin && <option value="admin">Әкімші — толық құқық (сайтты өзгертеді, өшіре алады)</option>}
                </select>
              </label>
            )}
          </>
        )}

        <label>Хабарламаның мәтіні ({'{name}'} — пайдаланушы аты). Сайт, логин және құпия сөз хатқа автоматты қосылады.
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>

        {mode !== 'staff' && (
          <>
            <p className="small muted" style={{ margin: '8px 0 4px' }}>Қай курсқа қолжетімділік беріледі (бірнешеуін таңдауға болады). Мерзім бос болса — мерзімсіз:</p>
            <CoursePicker courses={data.courses} value={grants} onChange={setGrants} />
            <label>Қолжетімділік берілген күн мен уақыт<input type="datetime-local" value={grantedAt} onChange={(e) => setGrantedAt(e.target.value)} /></label>
          </>
        )}
        <label className="check"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Поштаға хабарлама жіберу</label>

        {error && <p className="error">{error}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button disabled={busy}>{busy ? `Қосылып жатыр… ${progress}` : 'Қосу'}</button>
          <button type="button" className="secondary" onClick={onClose}>Болдырмау</button>
        </div>
      </form>
    </Modal>
  )
}

const ROLE_LABEL: Record<Role, string> = { free: 'Қонақ (тегін)', paid: 'Төлеген', curator: 'Куратор', admin: 'Әкімші' }

function randomPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => chars[n % chars.length]).join('')
}

// Пайдаланушыны өзгерту: аты, телефон, пошта, құпия сөз, рөл және курстарға қолжетімділік мерзімі
export function EditUserModal({ profile, data, onClose, onChanged }: { profile: Profile; data: UsersData; onClose: () => void; onChanged: () => void }) {
  const { session, profile: me } = useAuth()
  const [form, setForm] = useState({ fullName: profile.full_name ?? '', phone: profile.phone ?? '', email: profile.email, role: profile.role, password: '' })
  const [notify, setNotify] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [current, setCurrent] = useState<{ password: string | null; stored: boolean; changedByUser: boolean } | 'loading' | null>(null)
  const [addGrant, setAddGrant] = useState<Record<string, Grant>>({})
  const isAdmin = isAdminRole(me?.role)
  const stat = data.stats.get(profile.id)
  const enrollments = data.enrollments.filter((e) => e.user_id === profile.id)
  const courseTitle = (id: string) => data.courses.find((c) => c.id === id)?.title ?? 'Курс'

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const body: Record<string, unknown> = { userId: profile.id, notify }
    if (form.fullName !== (profile.full_name ?? '')) body.fullName = form.fullName
    if (form.phone !== (profile.phone ?? '')) body.phone = form.phone
    if (form.email !== profile.email) body.email = form.email
    if (form.role !== profile.role) body.role = form.role
    if (form.password) body.password = form.password
    const { ok, json } = await callApi('/api/admin-update-user', session?.access_token, body)
    setBusy(false)
    if (!ok) return setMsg({ kind: 'error', text: json.error ?? 'Қате' })
    setMsg({ kind: 'ok', text: `Сақталды.${form.password ? ` Жаңа құпия сөз: ${form.password}` : ''}${json.emailSent === false ? ` Хат жіберілмеді: ${json.emailError ?? ''}` : ''}` })
    setForm((f) => ({ ...f, password: '' }))
    setCurrent(null)
    onChanged()
  }

  async function showPassword() {
    setCurrent('loading')
    const { ok, json } = await callApi('/api/admin-get-password', session?.access_token, { userId: profile.id })
    if (!ok) { setCurrent(null); return setMsg({ kind: 'error', text: json.error ?? 'Қате' }) }
    setCurrent(json)
  }

  async function changeExpiry(enrollmentId: string, value: string) {
    await supabase.from('enrollments').update({ expires_at: value ? new Date(value).toISOString() : null }).eq('id', enrollmentId)
    syncUserToSheet(session?.access_token, profile.id)
    onChanged()
  }

  async function closeAccess(courseId: string) {
    if (!window.confirm(`«${courseTitle(courseId)}» курсына қолжетімділікті жабасыз ба? Ол «Жойылғандар тізіміне» өтеді.`)) return
    await supabase.rpc('remove_enrollment', { p_user: profile.id, p_course: courseId })
    syncUserToSheet(session?.access_token, profile.id)
    onChanged()
  }

  async function addAccess() {
    const picked = Object.entries(addGrant).filter(([, g]) => g.on)
    if (!picked.length) return
    const { ok, json } = await callApi('/api/admin-create-user', session?.access_token, {
      email: profile.email,
      sendEmail: false,
      courses: grantsToPayload(addGrant),
    })
    if (!ok) return setMsg({ kind: 'error', text: json.error ?? 'Қате' })
    setAddGrant({})
    onChanged()
  }

  const free = data.courses.filter((c) => !enrollments.some((e) => e.course_id === c.id))

  return (
    <Modal title={profile.full_name || profile.email} onClose={onClose}>
      <p className="small muted">
        Соңғы кіру: <b>{fmtDateTime(stat?.last_sign_in_at)}</b> · Пошта: <b>{stat?.email_confirmed_at ? 'расталған' : 'расталмаған'}</b> · Құпия сөз өзгерген: <b>{fmtDateTime(profile.password_changed_at)}</b>
      </p>
      <form onSubmit={save}>
        <div className="row">
          <label>Аты-жөні<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
          <label>Телефон<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        </div>
        <div className="row">
          <label>Электрондық пошта (логин)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          {isAdmin && (
            <label>Түрі
              <select value={form.role} disabled={profile.id === me?.id} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
          )}
        </div>
        {isAdmin && <div className="field-block">
          <span className="small muted">Ағымдағы құпия сөз</span>
          {current === null && <div><button type="button" className="secondary" onClick={showPassword}>👁 Құпия сөзді көрсету</button></div>}
          {current === 'loading' && <span className="small muted">Жүктелуде…</span>}
          {current && current !== 'loading' && (
            current.password ? (
              <div className="row">
                <code className="au-password">{current.password}</code>
                <button type="button" className="secondary" onClick={() => navigator.clipboard?.writeText(current.password ?? '')}>Көшіру</button>
              </div>
            ) : (
              <p className="small" style={{ color: 'var(--danger)' }}>
                {current.changedByUser
                  ? 'Пайдаланушы құпия сөзін өзі өзгерткен — жаңасы бізге белгісіз. Төменнен жаңасын жасап беріңіз.'
                  : 'Бұл пайдаланушының құпия сөзі сақталмаған (ертерек қосылған немесе өзі қойған). Төменнен жаңасын жасаңыз.'}
              </p>
            )
          )}
        </div>}
        <label>Жаңа құпия сөз (кемінде 8 таңба; бос болса өзгермейді)
          <div className="row">
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} />
            <button type="button" className="secondary" onClick={() => setForm({ ...form, password: randomPassword() })}>Жасау</button>
            <button type="button" className="secondary" onClick={() => navigator.clipboard?.writeText(form.password)}>Көшіру</button>
          </div>
        </label>
        <label className="check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Өзгерістер туралы пайдаланушыға хат жіберу (жаңа құпия сөзбен)</label>
        {msg && <p className={msg.kind === 'ok' ? 'success' : 'error'}>{msg.text}</p>}
        <button disabled={busy}>{busy ? 'Сақталып жатыр…' : 'Сақтау'}</button>
      </form>

      <h4 style={{ margin: '20px 0 8px' }}>Курстарға қолжетімділік</h4>
      {enrollments.length === 0 && <p className="muted small">Қолжетімділік жоқ.</p>}
      {enrollments.map((e) => (
        <div key={e.id} className="au-access-row">
          <div>
            <b>{courseTitle(e.course_id)}</b>
            <div className="small muted">Берілген: {fmtDate(e.created_at)} · {daysLeft(e.expires_at)}</div>
          </div>
          <span className="au-duration">
            <input type="date" defaultValue={e.expires_at ? e.expires_at.slice(0, 10) : ''} onChange={(ev) => changeExpiry(e.id, ev.target.value)} title="Аяқталу күні" />
            <button type="button" className="danger" onClick={() => closeAccess(e.course_id)}>Жабу</button>
          </span>
        </div>
      ))}
      {free.length > 0 && (
        <>
          <p className="small muted" style={{ margin: '12px 0 4px' }}>Жаңа курс қосу:</p>
          <CoursePicker courses={free} value={addGrant} onChange={setAddGrant} />
          <button type="button" className="secondary" onClick={addAccess} style={{ marginTop: 8 }}>Қолжетімділік беру</button>
        </>
      )}
    </Modal>
  )
}
