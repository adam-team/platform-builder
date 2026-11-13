import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/tracker'
import AuthShell from '../components/AuthShell'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) return setError(error.message)
    trackEvent('register')
    // если в Supabase включено подтверждение почты — сессии нет, ждём письмо
    if (!data.session) setDone(true)
  }

  if (done) {
    return (
      <AuthShell title="Поштаңызды тексеріңіз">
        <p>Растау сілтемесі бар хат жібердік. Растағаннан кейін <Link to="/login">кіре аласыз</Link>.</p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Тіркелу" subtitle="Курстар мен сабақтарға қолжетімділік алу үшін аккаунт ашыңыз">
      <form onSubmit={submit}>
        <label>Аты-жөні<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label>Пошта<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Құпия сөз (кемінде 8 таңба)<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Жасалуда…' : 'Аккаунт жасау'}</button>
      </form>
      <p className="small">Аккаунтыңыз бар ма? <Link to="/login">Кіру</Link></p>
    </AuthShell>
  )
}
