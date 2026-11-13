import { supabase } from './supabase'
import { isDemo } from './supabase'

// ЭТАП_11 «Трафик» — жеңіл бірінші тараптық трекер: әр браузерге бір visitor_id (localStorage),
// әр парақ жүктелгенде бір сессия жазбасы + UTM/referrer, әр бетке ауысқанда pageview оқиғасы.
// Демо-режимде жазбайды (ойдан шығарылған деректерге қоспау үшін).
const VISITOR_KEY = 'visitor-id'
const SESSION_KEY = 'traffic-session-id'

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, id) }
    return id
  } catch { return crypto.randomUUID() }
}

async function ensureSession(): Promise<string | null> {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const params = new URLSearchParams(window.location.search)
    const id = crypto.randomUUID()
    // id-ны браузерде өзіміз жасаймыз да жазбаны кері оқымаймыз (.select() жоқ) — анонимді
    // қонақтарға SELECT саясаты жоқ әдейі (тек әкімші оқи алады), сол себепті RETURNING RLS-ке соқтығысады.
    const { error } = await supabase.from('traffic_sessions').insert({
      id,
      visitor_id: getVisitorId(),
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      referrer: document.referrer || null,
      landing_page: window.location.pathname,
      device: /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    })
    if (error) return null
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch { return null }
}

export async function trackEvent(eventType: 'pageview' | 'register' | 'order' | 'payment', path?: string) {
  if (isDemo) return
  const sessionId = await ensureSession()
  if (!sessionId) return
  await supabase.from('traffic_events').insert({ session_id: sessionId, event_type: eventType, path: path ?? window.location.pathname }).then(() => {}, () => {})
}
