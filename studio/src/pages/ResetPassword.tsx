import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import AuthShell from '../components/AuthShell'

// Сюда попадают двумя путями:
// 1) приглашение от администратора — переходят по ссылке из письма, сессия уже есть (просто вводят пароль);
// 2) «Забыли пароль» — сессии нет, вводят 6-значный код из письма + новый пароль (verifyOtp сам создаёт сессию).
export default function ResetPassword() {
  const { session, loading } = useAuth()
  const location = useLocation() as { state?: { email?: string } }
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitWithSession(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) supabase.rpc('note_password_changed').then(() => {}, () => {})
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  async function submitWithCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
    if (otpError) {
      setBusy(false)
      return setError('Код қате немесе мерзімі өтіп кеткен. Жаңасын сұраңыз.')
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) supabase.rpc('note_password_changed').then(() => {}, () => {})
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  if (loading) return <p className="center muted">Жүктелуде…</p>

  if (session) {
    return (
      <AuthShell title="Жаңа құпия сөз">
        <form onSubmit={submitWithSession}>
          <label>Құпия сөз (кемінде 8 таңба)<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>{busy ? 'Сақталуда…' : 'Құпия сөзді сақтау'}</button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Жаңа құпия сөз">
      <form onSubmit={submitWithCode}>
        {!location.state?.email && (
          <label>Пошта<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        )}
        <label>Хаттағы код (6 сан)<input required value={code} onChange={(e) => setCode(e.target.value)} /></label>
        <label>Жаңа құпия сөз (кемінде 8 таңба)<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Сақталуда…' : 'Құпия сөзді сақтау'}</button>
      </form>
      <p className="small"><Link to="/forgot">Кодты қайта сұрау</Link></p>
    </AuthShell>
  )
}
