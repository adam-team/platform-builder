import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function Forgot() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/reset-password', { state: { email } })
  }

  return (
    <AuthShell title="Құпия сөзді қалпына келтіру" subtitle="Поштаңызға 6 таңбалы кодты жібереміз">
      <form onSubmit={submit}>
        <label>Пошта<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Жіберілуде…' : 'Кодты поштаға жіберу'}</button>
      </form>
      <p className="small"><Link to="/login">← Кіруге оралу</Link></p>
    </AuthShell>
  )
}
