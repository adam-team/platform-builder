import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { markAllNewsRead, useUnreadNewsCount } from '../lib/notifications'

// Гидкурстағы «аккаунт» панелі сияқты: аватар басылса — Профиль/Хабарландырулар/Пароль/Шығу
// ашылады; әкімшіге қосымша «Төлемдерді растау» сілтемесі шығады.
export default function AccountMenu() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { count: unread, refresh: refreshUnread } = useUnreadNewsCount(profile?.id)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setConfirmLogout(false) }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!profile) return null
  const initial = (profile.full_name || profile.email)[0]?.toUpperCase() ?? '?'

  async function openNews() {
    setOpen(false)
    await markAllNewsRead(profile!.id)
    refreshUnread()
    navigate('/#news')
  }

  function openPassword() {
    setOpen(false)
    navigate('/profile#password')
  }

  return (
    <div className="account-menu" ref={ref}>
      <button className="account-btn" onClick={() => setOpen((v) => !v)} aria-label="Профиль">
        <span className="avatar-circle">{initial}</span>
        {unread > 0 && <span className="bell-dot account-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="account-dropdown">
          <div className="account-dropdown-head">
            <b>{profile.full_name || profile.email}</b>
            <span className="muted small">{profile.email}</span>
          </div>
          <Link to="/profile" className="account-item" onClick={() => setOpen(false)}>👤 Студент профилі</Link>
          {profile.role !== 'admin' && (
            <button className="account-item" onClick={openNews}>
              🔔 Хабарландырулар {unread > 0 && <span className="badge ok">{unread}</span>}
            </button>
          )}
          <button className="account-item" onClick={openPassword}>🔑 Парольді ауыстыру</button>
          {profile.role === 'admin' && (
            <>
              <Link to="/admin?section=sales" className="account-item" onClick={() => setOpen(false)}>💳 Төлемдерді растау</Link>
              <Link to="/" className="account-item" onClick={() => setOpen(false)}>🌐 Сайтты көру</Link>
            </>
          )}
          {profile.role === 'curator' && (
            <>
              <Link to="/admin" className="account-item" onClick={() => setOpen(false)}>🧑‍🏫 Куратор кабинеті</Link>
              <Link to="/" className="account-item" onClick={() => setOpen(false)}>🌐 Сайтты көру</Link>
            </>
          )}
          {!confirmLogout ? (
            <button className="account-item danger" onClick={() => setConfirmLogout(true)}>↪ Шығу</button>
          ) : (
            <div style={{ padding: '8px 12px' }}>
              <p className="small muted" style={{ marginBottom: 8 }}>Аккаунттан шығуды растайсыз ба?</p>
              <div className="row">
                <button type="button" className="btn btn-danger btn-sm" onClick={signOut}>Иә, шығу</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmLogout(false)}>Болдырмау</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
