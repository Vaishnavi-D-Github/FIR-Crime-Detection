import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Logout } from './pages/Logout'
import { PoliceLogin } from './pages/PoliceLogin'
import { PolicePortal } from './pages/PolicePortal'
import { useAuth } from './context/AuthContext'

function PoliceRoute({ children }: { children: React.ReactNode }) {
  const { policeOfficer, loading } = useAuth()
  if (loading) return <motion.div className="ai-loader"><div className="ai-loader-ring" /></motion.div>
  if (!policeOfficer) return <Navigate to="/police/login" replace />
  return children
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><Home /></Page>} />
        <Route path="/login" element={<Page><Login /></Page>} />
        <Route path="/register" element={<Page><Register /></Page>} />
        <Route path="/forgot-password" element={<Page><ForgotPassword /></Page>} />
        <Route path="/reset-password/:token" element={<Page><ResetPassword /></Page>} />
        <Route path="/dashboard" element={<Page><ProtectedRoute><Dashboard /></ProtectedRoute></Page>} />
        <Route path="/logout" element={<Page><Logout /></Page>} />
        <Route path="/police/login" element={<Page wide><PoliceLogin /></Page>} />
        <Route path="/police/portal" element={<Page wide><PoliceRoute><PolicePortal /></PoliceRoute></Page>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={wide ? { maxWidth: '100%' } : undefined}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setBooting(false), 600)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <AuthProvider>
      <ToastProvider>
        <div className={`page-loader ${booting ? '' : 'is-hidden'}`}>
          <span className="loader-ring" />
        </div>
        <BrowserRouter>
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
