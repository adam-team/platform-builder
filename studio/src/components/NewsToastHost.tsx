import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { markAllNewsRead } from '../lib/notifications'
import type { News } from '../lib/types'

const POLL_MS = 30_000
const SEEN_KEY = 'news-toast-seen-id'

// Жаңа жаңалық жарияланғанда WhatsApp-тәрізді хабарландыру жоғарыдан шығады, 3 секундтан кейін өзі
// жоғалады — оқылмағаны бәрібір қоңырау белгісінде қалады. Тек кірген пайдаланушыға (сайтты сол сәтте
// ашық ұстағанда) көрінеді; кезекте тұрған ескі жаңалықтарды бірінші тексерісте хабарламай-ақ «көрдім» деп белгілейміз.
export default function NewsToastHost() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState<News | null>(null)
  const lastId = useRef<string | null>(null)
  const seeded = useRef(false)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    async function check() {
      const { data } = await supabase.from('news').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(1)
      const latest = (data as News[] | null)?.[0]
      if (!latest || cancelled) return
      if (!seeded.current) {
        seeded.current = true
        try { lastId.current = localStorage.getItem(SEEN_KEY) || latest.id } catch { lastId.current = latest.id }
        return
      }
      if (latest.id !== lastId.current) {
        lastId.current = latest.id
        try { localStorage.setItem(SEEN_KEY, latest.id) } catch { /* sessionStorage жоқ — бәрібір көрсетеміз */ }
        setToast(latest)
        setTimeout(() => setToast((t) => (t?.id === latest.id ? null : t)), 3000)
      }
    }
    check()
    const id = window.setInterval(check, POLL_MS)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [profile?.id])

  if (!toast) return null

  function open() {
    setToast(null)
    if (profile) markAllNewsRead(profile.id)
    navigate('/#news')
  }

  return (
    <button type="button" className="news-toast" onClick={open}>
      <span className="news-toast-icon">🔔</span>
      <span className="news-toast-body">
        <b>Жаңа жаңалық</b>
        <span>{toast.title}</span>
      </span>
    </button>
  )
}
