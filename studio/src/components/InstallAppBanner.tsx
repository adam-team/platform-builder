import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

// ЭТАП_07 «Приложение» — PWA орнату: Android/desktop Chrome — нағыз «Орнату» батырмасы
// (beforeinstallprompt), iPhone-да ондай оқиға жоқ — Safari-дің «Бөлісу → Басты экранға қосу»
// нұсқаулығын көрсетеміз.
export default function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    function onPrompt(e: Event) { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    function onInstalled() { setInstalled(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  if (!deferred && !isIos()) return null // басқа браузерде орнату мүмкіндігі әлі шықпаған

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <div className="notice small" style={{ marginTop: 12 }}>
      {deferred ? (
        <>
          <p style={{ marginBottom: 8 }}>Қосымшаны телефоныңызға орнатып, жылдам кіре аласыз.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={install}>📲 Қосымша ретінде орнату</button>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowIosHelp((v) => !v)}>📲 iPhone-ға орнату</button>
          {showIosHelp && (
            <p style={{ marginTop: 8 }} className="muted">
              Safari-де төмендегі «Бөлісу» ⬆ белгішесін басып, «Басты экранға қосу» дегенді таңдаңыз.
            </p>
          )}
        </>
      )}
    </div>
  )
}
