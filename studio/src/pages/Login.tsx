import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { isDemo, supabase } from '../lib/supabase'
import { DEMO_USERS } from '../lib/demo'
import { useAuth } from '../lib/auth'
import AuthShell from '../components/AuthShell'
import { isStaff } from '../lib/roles'

export default function Login() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={isStaff(profile?.role) ? '/admin' : '/'} replace />

  // Кіргеннен кейін қайда апару керегін шешу үшін рөлін сұраймыз: әкімші — тікелей консольге,
  // басқалары — басты бетке.
  async function goByRole(userId: string) {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    navigate(isStaff(data?.role) ? '/admin' : '/')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error || !data.user) return setError('Почта немесе құпия сөз қате')
    await goByRole(data.user.id)
  }

  async function demoLogin(who: keyof typeof DEMO_USERS) {
    const { data } = await supabase.auth.signInWithPassword({ email: DEMO_USERS[who].email, password: DEMO_USERS[who].password })
    if (data.user) await goByRole(data.user.id)
    else navigate('/')
  }

  return (
    <AuthShell title="Кіру" subtitle="Жеке кабинетке кіру үшін мәліметтеріңізді енгізіңіз">
      {isDemo && (
        <div className="notice">
          <b>Демо:</b> бір батырмамен кіріңіз
          <div className="row" style={{ marginTop: 8 }}>
            {(Object.keys(DEMO_USERS) as (keyof typeof DEMO_USERS)[]).map((who) => (
              <button key={who} type="button" className="secondary" onClick={() => demoLogin(who)}>{DEMO_USERS[who].label}</button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit}>
        <label>Пошта<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Құпия сөз<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Кіріп жатырмыз…' : 'Кіру'}</button>
      </form>
      <p className="small"><Link to="/forgot">Құпия сөзді ұмыттыңыз ба?</Link></p>
      <p className="small">Аккаунтыңыз жоқ па? <Link to="/register">Тіркелу</Link></p>
      <Link to="/" className="btn btn-outline btn-block" style={{ marginTop: 16 }}>Басты бетке өту</Link>
    </AuthShell>
  )
}
