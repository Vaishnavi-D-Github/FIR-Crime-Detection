import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AmbientBackground } from './AmbientBackground'
import { useAuth } from '../context/AuthContext'

const navIcon = (d: string) => (
  <span className="nav-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
)

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path))

  return (
    <>
      <AmbientBackground />
      <motion.div className="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
        <header className="app-header">
          <Link to="/" className="app-logo" aria-label="Home">
            <span className="logo-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V6l-8-4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  fill="rgba(255,176,0,0.15)"
                />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="logo-text">
              FIR<span className="logo-accent">AI</span>
            </span>
          </Link>
          <div className="app-header-actions">
            {user ? (
              <span className="header-chip">{user.name.split(' ')[0]}</span>
            ) : pathname === '/login' || pathname === '/register' ? (
              <Link to="/" className="header-link">
                Skip
              </Link>
            ) : null}
          </div>
        </header>

        <main className="app-main">{children}</main>

        <nav className="bottom-nav" aria-label="Main navigation">
          <Link to="/" className={`bottom-nav-item ${isActive('/') && pathname === '/' ? 'is-active' : ''}`}>
            {navIcon('M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z')}
            <span>Home</span>
          </Link>
          {user ? (
            <Link to="/dashboard" className={`bottom-nav-item ${isActive('/dashboard') ? 'is-active' : ''}`}>
              {navIcon('M4 6h16M4 12h10M4 18h14')}
              <span>FIR</span>
            </Link>
          ) : (
            <Link to="/login" className={`bottom-nav-item ${isActive('/login') ? 'is-active' : ''}`}>
              {navIcon('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z')}
              <span>Login</span>
            </Link>
          )}
          <Link to="/police/login" className={`bottom-nav-item ${pathname.startsWith('/police') ? 'is-active' : ''}`}>
            {navIcon('M12 3l7 4v5c0 4.5-2.8 8.74-7 9.93C7.8 20.74 5 16.5 5 12V7l7-4z')}
            <span>Police</span>
          </Link>
          {user ? (
            <Link to="/logout" className="bottom-nav-item">
              {navIcon('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9')}
              <span>Exit</span>
            </Link>
          ) : (
            <Link to="/register" className={`bottom-nav-item ${isActive('/register') ? 'is-active' : ''}`}>
              {navIcon('M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8zm8 10v-2a3 3 0 00-2.82-2.96M19 4.5a3 3 0 010 5.99')}
              <span>Join</span>
            </Link>
          )}
        </nav>
      </motion.div>
    </>
  )
}
