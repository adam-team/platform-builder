import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { isStaff } from './lib/roles'
import { isConfigured, isDemo } from './lib/supabase'
import { trackEvent } from './lib/tracker'
import { warmUpOfferPagesWhenIdle } from './lib/prefetchOffers'
import { UndoToastProvider } from './components/UndoToast'
import Layout from './components/Layout'
import Login from './pages/Login'
const Register = lazy(() => import('./pages/Register'))
const Forgot = lazy(() => import('./pages/Forgot'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
import Home from './pages/Home'
const Courses = lazy(() => import('./pages/Courses'))
const CoursePage = lazy(() => import('./pages/CoursePage'))
const Services = lazy(() => import('./pages/Services'))
const FreeLessons = lazy(() => import('./pages/FreeLessons'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const Cabinet = lazy(() => import('./pages/Cabinet'))
const MyCourses = lazy(() => import('./pages/MyCourses'))
const Profile = lazy(() => import('./pages/Profile'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Admin = lazy(() => import('./pages/admin/Admin'))
const PaidCourses = lazy(() => import('./pages/PaidCourses'))
const OfferIpotekaPro = lazy(() => import('./pages/OfferIpotekaPro'))
const OfferKaryzsyzOmir = lazy(() => import('./pages/OfferKaryzsyzOmir'))

function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <p className="center muted">Жүктелуде…</p>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

// ЭТАП_11 «Трафик» — әр бет ауысқанда pageview жазады (демо-режимде жазбайды)
function PageviewTracker() {
  const location = useLocation()
  useEffect(() => { trackEvent('pageview', location.pathname) }, [location.pathname])
  return null
}

// Ипотека PRO / Қарызсыз өмір беттерін бос уақытта алдын ала жүктеп қою — баяу желіде де тез ашылсын
function OfferPrefetch() {
  useEffect(() => { warmUpOfferPagesWhenIdle() }, [])
  return null
}

// React Router айналдырмайды («/#news» секілді сілтемелер тек URL-ды өзгертетін еді, бетті айналдырмайтын) —
// осы компонент hash өзгерген сайын сол id-дегі элементке дейін айналдырады.
function ScrollToHash() {
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    // Лениво жүктелетін беттердің өзі, содан кейін оның ішіндегі деректері (мысалы, жаңалықтар) әлі
    // жүктеліп жатқан болуы мүмкін — элемент пайда болғанша бірнеше рет қайталап көреміз.
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
      if (++attempts < 20) timer = setTimeout(tryScroll, 100)
    }
    timer = setTimeout(tryScroll, 100)
    return () => clearTimeout(timer)
    // location.key — әр navigate() шақырғанда өзгереді, тіпті хэш бұрынғыдай «#news» болып қалса да
    // (мысалы, жаңалықты екінші рет ашқанда) — сондықтан осыған тәуелдіміз, hash мәніне емес.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])
  return null
}

function RequireAdmin() {
  const { profile, loading } = useAuth()
  if (loading) return <p className="center muted">Жүктелуде…</p>
  return profile?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />
}

// Әкімші және куратор консольге кіре алады; қай бөлімдерді көретінін Admin.tsx рөлге қарай шешеді
function RequireStaff() {
  const { profile, loading } = useAuth()
  if (loading) return <p className="center muted">Жүктелуде…</p>
  return isStaff(profile?.role) ? <Outlet /> : <Navigate to="/" replace />
}

export default function App() {
  if (!isConfigured) {
    return (
      <div className="auth-card">
        <h1>Supabase қосылмаған</h1>
        <p className="muted">
          <code>.env.example</code> үлгісі бойынша <code>.env.local</code> файлын жасап,
          VITE_SUPABASE_URL мен VITE_SUPABASE_ANON_KEY жазыңыз да, <code>npm run dev</code>-ті қайта іске қосыңыз.
        </p>
      </div>
    )
  }

  return (
    <UndoToastProvider>
      {isDemo && <div className="demo-banner">ДЕМО: деректер ойдан шығарылған, әр жаңартуда жоғалады</div>}
      <PageviewTracker />
      <OfferPrefetch />
      <ScrollToHash />
      <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* «Ипотека PRO» коммерциялық ұсыныс беті — жеке, менюсіз (сатылым беті) */}
        <Route path="/offer/ipoteka-pro" element={<OfferIpotekaPro />} />
        <Route path="/offer/karyzsyz-omir" element={<OfferKaryzsyzOmir />} />

        {/* Әкімшінің беті — жеке, толық экранды консоль (жоғарғы панельсіз, бөлек мәзірсіз) */}
        <Route element={<RequireStaff />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/course/:courseId" element={<CoursePage />} />
          <Route path="/services" element={<Services />} />
          <Route path="/free-lessons" element={<FreeLessons />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route element={<RequireAdmin />}>
            <Route path="/paid-courses" element={<PaidCourses />} />
          </Route>
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/cabinet" element={<Cabinet />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </UndoToastProvider>
  )
}
