import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { DEFAULT_SETTINGS } from '../lib/content'
import { isPaidOrStaff, isStaff } from '../lib/roles'
import AccountMenu from './AccountMenu'
import NavIcon from './NavIcon'
import NewsToastHost from './NewsToastHost'
import NotificationBell from './NotificationBell'
import SupportChat from './SupportChat'

const GUEST_TABS = [
  { to: '/', label: 'Басты', icon: 'home' },
  { to: '/courses', label: 'Курстар', icon: 'courses' },
  { to: '/services', label: 'Қызметтер', icon: 'services' },
  { to: '/free-lessons', label: 'Тегін', icon: 'free' },
]
const PAID_TABS = [
  { to: '/', label: 'Басты', icon: 'home' },
  { to: '/my-courses', label: 'Курстар', icon: 'courses' },
  { to: '/services', label: 'Қызметтер', icon: 'services' },
  { to: '/free-lessons', label: 'Тегін', icon: 'free' },
  { to: '/profile', label: 'Профиль', icon: 'profile' },
]
// Әкімшінің төменгі мәзірі: «Профиль» орнына «Ақылы курстар» (профиль — жоғарғы оң жақтағы аккаунт мәзірінде)
const ADMIN_TABS = [
  { to: '/', label: 'Басты', icon: 'home' },
  { to: '/my-courses', label: 'Курстар', icon: 'courses' },
  { to: '/paid-courses', label: 'Ақылы', icon: 'services' },
  { to: '/services', label: 'Қызметтер', icon: 'services' },
  { to: '/free-lessons', label: 'Тегін', icon: 'free' },
  { to: '/admin', label: 'Админка', icon: 'admin' },
]
const STAFF_TABS = [...PAID_TABS, { to: '/admin', label: 'Админка', icon: 'admin' }]
const GUEST_TOPNAV = [
  { to: '/', label: 'Басты' },
  { to: '/courses', label: 'Курстар' },
  { to: '/services', label: 'Қызметтер' },
  { to: '/free-lessons', label: 'Тегін сабақтар' },
]
const ADMIN_TOPNAV = [
  { to: '/', label: 'Басты' },
  { to: '/my-courses', label: 'Менің курстарым' },
  { to: '/paid-courses', label: 'Ақылы курстар' },
  { to: '/services', label: 'Қызметтер' },
  { to: '/free-lessons', label: 'Тегін сабақтар' },
  { to: '/profile', label: 'Профиль' },
]
const PAID_TOPNAV = [
  { to: '/', label: 'Басты' },
  { to: '/my-courses', label: 'Менің курстарым' },
  { to: '/services', label: 'Қызметтер' },
  { to: '/free-lessons', label: 'Тегін сабақтар' },
  { to: '/profile', label: 'Профиль' },
]

export default function Layout() {
  const { profile, session } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const paidOrStaff = isPaidOrStaff(profile?.role)
  const tabs = isAdmin ? ADMIN_TABS : isStaff(profile?.role) ? STAFF_TABS : paidOrStaff ? PAID_TABS : GUEST_TABS
  const topnav = isAdmin ? ADMIN_TOPNAV : paidOrStaff ? PAID_TOPNAV : GUEST_TOPNAV

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <img src={DEFAULT_SETTINGS.hero_photo_url} alt="" />
          <div className="brand-text">
            <div className="name">{DEFAULT_SETTINGS.expert_name}</div>
            <div className="role">{DEFAULT_SETTINGS.expert_role}</div>
          </div>
        </div>
        <nav className="topnav-links">
          {topnav.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/' || t.to === '/cabinet'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-actions">
          {isStaff(profile?.role) && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'admin-nav-btn active' : 'admin-nav-btn')}>
              Админка
            </NavLink>
          )}
          {session && profile && <NotificationBell userId={profile.id} />}
          {session ? <AccountMenu /> : <Link to="/login" className="btn btn-outline btn-sm">Кіру</Link>}
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <nav className="bottomnav">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/' || t.to === '/cabinet'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <NavIcon name={t.icon} />
            {t.label}
          </NavLink>
        ))}
      </nav>

      {profile && !isStaff(profile.role) && <SupportChat />}
      <NewsToastHost />
    </div>
  )
}
