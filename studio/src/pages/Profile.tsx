import { useEffect, useState, type FormEvent } from 'react'
import { isStaff } from '../lib/roles'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { withDefaults } from '../lib/content'
import { CURRENT_SCHOOL_ID } from '../lib/school'
import { useSiteSettingsForm } from './admin/useSiteSettingsForm'
import type { SiteSettings } from '../lib/types'
import InstallAppBanner from '../components/InstallAppBanner'

const ROLE_LABEL = { free: 'Тегін қолданушы', paid: 'Төлеген клиент', curator: 'Куратор', admin: 'Әкімші' } as const

export default function Profile() {
  const { profile } = useAuth()
  if (!profile) return <p className="muted">Жүктелуде…</p>
  const isAdmin = profile.role === 'admin'
  const canEditCurator = isStaff(profile.role)

  return (
    <div style={{ marginTop: 20, maxWidth: 560 }}>
      <div className="section-head">
        <h1>Студент профилі</h1>
        <span className="badge ok">{ROLE_LABEL[profile.role]}</span>
      </div>

      <InstallAppBanner />

      <PersonalInfoSection />
      <CuratorSection canEdit={canEditCurator} />
      <SupportSection isAdmin={isAdmin} />
    </div>
  )
}

// ---------- 1. Жеке ақпарат: аты-жөні, email, телефон, пароль — бәрі бір «Деректерді өзгерту» астында ----------
function PersonalInfoSection() {
  const { profile, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  // Аккаунт мәзіріндегі «Парольді ауыстыру» осында #password арқылы келеді — формасы автоматты ашылады
  useEffect(() => {
    if (profile && window.location.hash === '#password') startEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  if (!profile) return null

  function startEdit() {
    setFullName(profile!.full_name ?? '')
    setEmail(profile!.email ?? '')
    setPhone(profile!.phone ?? '')
    setPassword('')
    setMsg(null)
    setEditing(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (password && password.length < 8) return setMsg({ kind: 'error', text: 'Пароль кемінде 8 таңба болу керек' })
    setBusy(true)
    setMsg(null)

    const { error: profileError } = await supabase.from('profiles').update({ full_name: fullName || null, phone: phone || null }).eq('id', profile!.id)
    if (profileError) { setBusy(false); return setMsg({ kind: 'error', text: profileError.message }) }

    const emailChanged = email && email !== profile!.email
    if (emailChanged) {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) { setBusy(false); return setMsg({ kind: 'error', text: error.message }) }
    }

    if (password) {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setBusy(false); return setMsg({ kind: 'error', text: error.message }) }
      supabase.rpc('note_password_changed').then(() => {}, () => {})
    }

    await refreshProfile()
    setBusy(false)
    setPassword('')
    setEditing(false)
    setMsg({ kind: 'success', text: emailChanged ? 'Сақталды. Жаңа поштаны растау хаты жіберілді.' : 'Сақталды.' })
  }

  return (
    <section className="panel" id="password">
      <h3 style={{ marginBottom: 14 }}>👤 Жеке ақпарат</h3>
      {msg && <p className={msg.kind === 'error' ? 'error' : 'success'} style={{ marginBottom: 12 }}>{msg.text}</p>}

      {!editing ? (
        <>
          <div className="profile-row"><span className="muted small">Аты-жөні</span><b>{profile.full_name || '—'}</b></div>
          <div className="profile-row"><span className="muted small">Email</span><b>{profile.email}</b></div>
          <div className="profile-row"><span className="muted small">Телефон нөмірі</span><b>{profile.phone || '—'}</b></div>
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={startEdit}>Деректерді өзгерту</button>
        </>
      ) : (
        <form onSubmit={save}>
          <label>Аты-жөні<input value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Телефон нөмірі<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 7__ ___ __ __" /></label>
          <label>Жаңа пароль (өзгерткіңіз келмесе — бос қалдырыңыз)<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <div className="row">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Болдырмау</button>
          </div>
        </form>
      )}
    </section>
  )
}

// ---------- 2. Куратормен байланысу — клиент пен әкімшіге бірдей көрінеді, әкімшіде қосымша «Өзгерту» ----------
function useSchoolSettings() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    supabase.from('site_settings').select('*').eq('school_id', CURRENT_SCHOOL_ID).maybeSingle().then(({ data }) => {
      setSettings(withDefaults(data as Partial<SiteSettings> | null))
    })
  }, [version])
  return { settings, reload: () => setVersion((v) => v + 1) }
}

function CuratorSection({ canEdit }: { canEdit: boolean }) {
  const { settings, reload } = useSchoolSettings()
  const [editing, setEditing] = useState(false)
  const adminForm = useSiteSettingsForm({})

  if (!settings) return null

  async function save(e: FormEvent) {
    await adminForm.save(e)
    setEditing(false)
    reload()
  }

  return (
    <section className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editing ? 14 : 6 }}>
        <h3 style={{ margin: 0 }}>💬 Куратормен байланысу</h3>
        {canEdit && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { adminForm.set('curator_name', settings.curator_name); adminForm.set('curator_hours', settings.curator_hours); adminForm.set('curator_contact_url', settings.curator_contact_url); setEditing((v) => !v) }}>
            {editing ? 'Болдырмау' : 'Өзгерту'}
          </button>
        )}
      </div>

      {!editing ? (
        <>
          <div className="profile-row"><span className="muted small">Куратор</span><b>{settings.curator_name}</b></div>
          {settings.curator_hours && (
            <div className="profile-row"><span className="muted small">Жұмыс уақыты</span><b>{settings.curator_hours}</b></div>
          )}
          <a href={settings.curator_contact_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block" style={{ marginTop: 12 }}>
            Куратормен байланысу
          </a>
        </>
      ) : (
        <form onSubmit={save}>
          <label>Куратордың аты-жөні<input value={adminForm.form.curator_name ?? ''} onChange={(e) => adminForm.set('curator_name', e.target.value)} placeholder="Айгерім" /></label>
          <label>Жұмыс уақыты<input value={adminForm.form.curator_hours ?? ''} onChange={(e) => adminForm.set('curator_hours', e.target.value)} placeholder="Дс–Жм, 10:00–19:00" /></label>
          <label>WhatsApp немесе Telegram сілтемесі<input value={adminForm.form.curator_contact_url ?? ''} onChange={(e) => adminForm.set('curator_contact_url', e.target.value)} /></label>
          <div className="row">
            <button className="btn btn-primary" disabled={adminForm.busy}>{adminForm.busy ? 'Сақталуда…' : 'Сақтау'}</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Болдырмау</button>
          </div>
        </form>
      )}
    </section>
  )
}

// ---------- 3. Қолдау және шығу ----------
function SupportSection({ isAdmin }: { isAdmin: boolean }) {
  const { signOut } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [editing, setEditing] = useState(false)
  const { settings, reload } = useSchoolSettings()
  const adminForm = useSiteSettingsForm({})

  if (!settings) return null

  async function save(e: FormEvent) {
    await adminForm.save(e)
    setEditing(false)
    reload()
  }

  return (
    <section className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editing ? 14 : 14 }}>
        <h3 style={{ margin: 0 }}>🛟 Қолдау және шығу</h3>
        {isAdmin && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { adminForm.set('support_contact_url', settings.support_contact_url); adminForm.set('legal_agreement_url', settings.legal_agreement_url); setEditing((v) => !v) }}>
            {editing ? 'Болдырмау' : 'Өзгерту'}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} style={{ marginBottom: 16 }}>
          <label>«Техникалық қолдауға жазу» сілтемесі<input value={adminForm.form.support_contact_url ?? ''} onChange={(e) => adminForm.set('support_contact_url', e.target.value)} /></label>
          <label>Пайдаланушы келісімі (шарт) сілтемесі<input value={adminForm.form.legal_agreement_url ?? ''} onChange={(e) => adminForm.set('legal_agreement_url', e.target.value)} /></label>
          <div className="row">
            <button className="btn btn-primary" disabled={adminForm.busy}>{adminForm.busy ? 'Сақталуда…' : 'Сақтау'}</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Болдырмау</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          <a href={settings.support_contact_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-block">📩 Техникалық қолдауға жазу</a>
          {settings.legal_agreement_url?.startsWith('/') ? (
            <Link to={settings.legal_agreement_url} className="btn btn-outline btn-block">📄 Пайдаланушы келісімі</Link>
          ) : (
            <a href={settings.legal_agreement_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-block">📄 Пайдаланушы келісімі</a>
          )}
        </div>
      )}

      {!confirmLogout ? (
        <button type="button" className="account-item danger" onClick={() => setConfirmLogout(true)}>↪ Аккаунттан шығу</button>
      ) : (
        <div style={{ padding: '10px 12px' }}>
          <p className="small muted" style={{ marginBottom: 10 }}>Аккаунттан шығуды растайсыз ба?</p>
          <div className="row">
            <button type="button" className="btn btn-danger btn-sm" onClick={signOut}>Иә, шығу</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmLogout(false)}>Болдырмау</button>
          </div>
        </div>
      )}
    </section>
  )
}
