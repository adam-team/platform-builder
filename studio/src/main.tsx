import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
// Шрифт өз серверімізден жүктеледі (Google Fonts-қа тәуелділік жоқ — жылдамырақ әрі тұрақты)
import '@fontsource/commissioner/400.css'
import '@fontsource/commissioner/500.css'
import '@fontsource/commissioner/600.css'
import '@fontsource/commissioner/700.css'
import '@fontsource/commissioner/800.css'
import './styles.css'
import { reloadOnceForNewVersion } from './lib/chunkReload'

// Жаңа нұсқа шыққанда Vite ескі файлды таба алмаса — бетті бір рет автоматты жаңартамыз
window.addEventListener('vite:preloadError', (e) => {
  if (reloadOnceForNewVersion()) e.preventDefault()
})

// Ссылки из писем (приглашение / сброс пароля) ведут на страницу установки пароля.
// Токены остаются в hash — supabase-js сам их подхватит.
if (/type=(invite|recovery)/.test(window.location.hash) && window.location.pathname !== '/reset-password') {
  window.history.replaceState(null, '', '/reset-password' + window.location.hash)
}

// PWA: қосымша ретінде орнатуға мүмкіндік беру (ЭТАП_07). Тек dev-те емес, production-та ғана —
// vite dev серверінде service worker ескі файлдарды кэштеп, әзірлеуге кедергі жасайды.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
