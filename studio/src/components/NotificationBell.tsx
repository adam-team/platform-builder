import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { markAllNewsRead, useUnreadNewsCount } from '../lib/notifications'
import type { News, Notification } from '../lib/types'

// ЭТАП_12 «Панель уведомлений» — честный срез: жеке хабарландырулар тізімі (қоңырау белгішесі).
// Толық арна матрицасы (email/Telegram/push әр оқиға түрі бойынша) жоқ — ол бөлек үлкен жұмыс.
export default function NotificationBell({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [news, setNews] = useState<News[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const { count: unreadNews, refresh: refreshUnreadNews } = useUnreadNewsCount(userId)

  async function load() {
    const [{ data }, { data: newsRows }] = await Promise.all([
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      supabase.from('news').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
    ])
    setItems((data as Notification[]) ?? [])
    setNews((newsRows as News[]) ?? [])
  }
  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((n) => !n.read_at).length + unreadNews

  async function markAllRead() {
    await Promise.all([
      supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null),
      markAllNewsRead(userId),
    ])
    refreshUnreadNews()
    load()
  }
  async function openNews() {
    setOpen(false)
    await markAllNewsRead(userId)
    refreshUnreadNews()
    navigate('/#news')
  }
  async function openItem(n: Notification) {
    setOpen(false)
    if (!n.read_at) await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id)
    if (n.link) navigate(n.link)
    load()
  }

  return (
    <div className="account-menu" ref={ref}>
      <button className="bell-btn" onClick={() => setOpen((v) => !v)} aria-label="Хабарландырулар">
        🔔
        {unread > 0 && <span className="bell-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="account-dropdown notif-dropdown">
          <div className="account-dropdown-head" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>Хабарландырулар</b>
            {unread > 0 && <button className="secondary btn-sm" onClick={markAllRead}>Барлығын оқылды деп белгілеу</button>}
          </div>
          {news.length > 0 && (
            <div className="notif-news-block">
              <span className="notif-news-label">Соңғы жаңалықтар</span>
              <div className="notif-news-grid">
                {news.map((n) => (
                  <button key={n.id} type="button" className="notif-news-card" onClick={openNews}>
                    <b>{n.title}</b>
                    {n.body && <span>{n.body}</span>}
                  </button>
                ))}
              </div>
              <button type="button" className="account-item small muted" style={{ padding: '8px 0 0' }} onClick={openNews}>Барлық жаңалықтарды көру →</button>
            </div>
          )}
          {items.length === 0 && news.length === 0 && <p className="muted small" style={{ padding: '16px 12px' }}>Хабарландырулар әлі жоқ.</p>}
          {items.map((n) => (
            <button key={n.id} className="account-item notif-item" style={!n.read_at ? { fontWeight: 700 } : undefined} onClick={() => openItem(n)}>
              <span>
                <span style={{ display: 'block' }}>{n.title}</span>
                {n.body && <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>{n.body}</span>}
              </span>
            </button>
          ))}
          {items.length > 0 && (
            <Link to="/profile" className="account-item small muted" onClick={() => setOpen(false)}>Хабарландыру баптаулары</Link>
          )}
        </div>
      )}
    </div>
  )
}
