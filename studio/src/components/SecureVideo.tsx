import { useCallback, useEffect, useRef, useState } from 'react'

// Ішкі YouTube-ойнатқышты жасырын күйде көрсетеді: YouTube атауы, арна аты/суреті, «YouTube-та қарау»,
// «сілтемені көшіру» көрінбейді; басқару — өз (фирмалық) батырмалары. Ойнатқыш үстіндегі мөлдір қабат
// тінтуір мен оң жақ түймені (контекстік мәзір) ойнатқышқа жеткізбейді.
// Ескерту: видео id-і браузердің техникалық құралдарында (DevTools) техникалық тұрғыдан табылуы мүмкін —
// толық қорғау үшін YouTube-та видеоны «Unlisted» (сілтеме бойынша) етіп қойыңыз.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<any> | null = null
function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT) }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    })
  }
  return apiPromise
}

const fmt = (s: number) => {
  const total = Math.max(0, Math.floor(s))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function SecureVideo({ youtubeId, title, seek, autoPlay = false }: { youtubeId: string; title: string; seek?: { t: number; n: number } | null; autoPlay?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<'idle' | 'playing' | 'paused' | 'ended'>('idle')
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false); setState('idle'); setStarted(false); setCurrent(0); setDuration(0); setError(false)
    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return
      const host = document.createElement('div')
      mountRef.current.innerHTML = ''
      mountRef.current.appendChild(host)
      playerRef.current = new YT.Player(host, {
        videoId: youtubeId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0, playsinline: 1, cc_load_policy: 0, origin: window.location.origin },
        events: {
          onReady: (e: any) => { if (cancelled) return; setReady(true); setDuration(e.target.getDuration?.() ?? 0); if (autoPlay) e.target.playVideo() },
          onStateChange: (e: any) => {
            if (cancelled) return
            const s = e.data
            if (s === 1) { setState('playing'); setStarted(true); setDuration(e.target.getDuration?.() ?? 0) }
            else if (s === 2) setState('paused')
            else if (s === 0) setState('ended')
          },
          onError: () => setError(true),
        },
      })
    })
    return () => { cancelled = true; try { playerRef.current?.destroy?.() } catch { /* ойнатқыш жойылған */ } playerRef.current = null }
  }, [youtubeId])

  useEffect(() => {
    if (state !== 'playing') return
    const id = window.setInterval(() => setCurrent(playerRef.current?.getCurrentTime?.() ?? 0), 250)
    return () => window.clearInterval(id)
  }, [state])

  useEffect(() => {
    if (!seek || !playerRef.current?.seekTo) return
    playerRef.current.seekTo(seek.t, true)
    playerRef.current.playVideo?.()
  }, [seek])

  const toggle = useCallback(() => {
    const p = playerRef.current
    if (!p || !ready) return
    if (state === 'playing') p.pauseVideo()
    else if (state === 'ended') { p.seekTo(0, true); p.playVideo() }
    else p.playVideo()
  }, [ready, state])

  function seekFraction(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = ((e.clientX - rect.left) / rect.width) * duration
    playerRef.current?.seekTo?.(t, true)
    setCurrent(t)
  }

  function toggleMute() {
    const p = playerRef.current
    if (!p) return
    if (muted) p.unMute(); else p.mute()
    setMuted(!muted)
  }

  // iPhone Safari-де кәдімгі Fullscreen API (element.requestFullscreen) тек <video> үшін ғана бар, ал бізде
  // YouTube iframe-і — сондықтан ол жерде батырма үнсіз ештеңе істемейтін. Алдымен нағыз толық экранды
  // (webkit префиксімен де) сынаймыз, болмаса/қабылданбаса — бетті толық алатын «жалған» толық экранға ауысамыз.
  const [pseudoFs, setPseudoFs] = useState(false)

  useEffect(() => {
    if (!pseudoFs) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPseudoFs(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [pseudoFs])

  async function fullscreen() {
    const el = rootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null
    if (!el) return
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    if (pseudoFs) return setPseudoFs(false)
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen()
      else doc.webkitExitFullscreen?.()
      return
    }
    try {
      if (el.requestFullscreen) { await el.requestFullscreen(); return }
      if (el.webkitRequestFullscreen) { await el.webkitRequestFullscreen(); return }
    } catch { /* браузер рұқсат бермеді — төмендегі қосалқы тәсілге өтеміз */ }
    setPseudoFs(true)
  }

  // YouTube-тың атауы/арна жолағы алғашқы секундтарда көрінуі мүмкін — сондықтан ойын басталғанша қабатпен жабамыз
  const covered = state !== 'playing' || current < 0.8
  const percent = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  return (
    <div className={pseudoFs ? 'sv-root sv-pseudo-fs' : 'sv-root'} ref={rootRef}>
      <div className="sv-stage">
        <div className="sv-mount" ref={mountRef} />
        <div
          className="sv-shield"
          onClick={toggle}
          onContextMenu={(e) => e.preventDefault()}
        >
          {covered && (
            <div className="sv-cover">
              {error ? (
                <span>Бейнені жүктеу мүмкін болмады</span>
              ) : !ready ? (
                <span>Жүктелуде…</span>
              ) : state === 'playing' ? (
                <span>Жүктелуде…</span>
              ) : (
                <>
                  <span className="sv-play" aria-label="Ойнату">▶</span>
                  <span className="sv-cover-title">{state === 'ended' ? 'Қайта көру' : started ? 'Жалғастыру' : title}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sv-controls">
        <button type="button" className="sv-btn" onClick={toggle} aria-label={state === 'playing' ? 'Тоқтату' : 'Ойнату'}>{state === 'playing' ? '❚❚' : '▶'}</button>
        <span className="sv-time">{fmt(current)}</span>
        <div className="sv-progress" onClick={seekFraction} role="slider" aria-label="Уақыт" aria-valuenow={Math.round(percent)}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <span className="sv-time">{fmt(duration)}</span>
        <button type="button" className="sv-btn" onClick={toggleMute} aria-label="Дыбыс">{muted ? '🔇' : '🔊'}</button>
        <button type="button" className="sv-btn" onClick={fullscreen} aria-label={pseudoFs ? 'Толық экраннан шығу' : 'Толық экран'}>{pseudoFs ? '✕' : '⛶'}</button>
      </div>
    </div>
  )
}
