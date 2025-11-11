import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LandingPage } from '@/pages/landing'
import { AuthPage } from '@/pages/auth'
import { GetStartedPage } from '@/pages/landing/get-started'
import { Dashboard } from '@/pages/dashboard'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { redirectThroughSession } from '@/lib/session-redirect'

const WORKSPACE_PREF_KEY = 'polycrawl_workspace_preference'
const SECTION_PREF_PREFIX = 'polycrawl_section_'

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-parchment">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (/^\/app\/?$/.test(location.pathname)) {
    let workspace: 'consumer' | 'provider' = 'consumer'
    let section = 'overview'
    try {
      const savedWorkspace = window.localStorage.getItem(WORKSPACE_PREF_KEY)
      if (savedWorkspace === 'provider') workspace = 'provider'
      const savedSection = window.localStorage.getItem(`${SECTION_PREF_PREFIX}${workspace}`)
      if (savedSection) section = savedSection
    } catch {
      // ignore
    }
    return <Navigate to={`/app/${workspace}/${section}`} replace />
  }

  return <Dashboard />
}

function AuthScreen() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const returnTo = new URLSearchParams(location.search).get('return_to')

  useEffect(() => {
    if (isAuthenticated && returnTo) {
      redirectThroughSession(returnTo)
    }
  }, [isAuthenticated, returnTo])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-parchment">
        Loading…
      </div>
    )
  }

  if (isAuthenticated) {
    if (returnTo) {
      return null
    }
    return <Navigate to="/app" replace />
  }

  return <AuthPage />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  const [hashAuth, setHashAuth] = useState(false)

  useEffect(() => {
    if (isAuthenticated) return
    const handleHashChange = () => {
      setHashAuth(window.location.hash === '#auth')
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isAuthenticated])

  return (
    <Routes>
      <Route path="/" element={hashAuth ? <AuthPage /> : <LandingPage />} />
      <Route path="/auth" element={<AuthScreen />} />
      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/app/*" element={<ProtectedRoute />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/app' : '/'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
