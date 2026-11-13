// ЭТАП_07 PWA: қарапайым service worker — қосымшаны орнатуға мүмкіндік беру, желі үзілгенде бос
// экранның орнына кэштен көрсету, және /assets/ ішіндегі файлдарды (Vite оларды хэшпен атайды —
// мазмұны өзгерсе, атауы да өзгереді, сондықтан бір рет жүктелген файл ешқашан ескірмейді) кэштен
// бірінші беру — баяу желіде де бет тез ашылады. Сабақтарды/видеоны офлайн кэштеу — бөлек үлкен жұмыс, жоқ.
const CACHE = 'shell-v2'
const SHELL_URLS = ['/', '/manifest.webmanifest']
const NETWORK_TIMEOUT_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // Хэшпен аталған файлдар (JS/CSS/шрифт) — бірден кэштен, жоқ болса желіден алып, кэштеп қоямыз
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        if (res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()))
        return res
      }))
    )
    return
  }

  // Қалғаны (HTML, API): желіден бірінші, бірақ баяу/тоқтап қалған желіде шексіз күтпей —
  // NETWORK_TIMEOUT_MS ішінде жауап келмесе, кэштегі (немесе басты беттің) нұсқасын бірден көрсетеміз.
  event.respondWith(
    new Promise((resolve) => {
      let settled = false
      const finishWithCache = () => {
        if (settled) return
        caches.match(event.request).then((cached) => {
          if (settled) return
          caches.match('/').then((shell) => {
            if (settled) return
            settled = true
            resolve(cached || shell)
          })
        })
      }
      const timer = setTimeout(finishWithCache, NETWORK_TIMEOUT_MS)
      fetch(event.request).then((res) => {
        clearTimeout(timer)
        if (!settled) { settled = true; resolve(res) }
      }).catch(() => {
        clearTimeout(timer)
        finishWithCache()
      })
    })
  )
})
