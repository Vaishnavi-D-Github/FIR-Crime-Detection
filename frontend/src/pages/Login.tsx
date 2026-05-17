import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ThreeHero } from '../components/ThreeHero'
import { AnimatedCard } from '../components/AnimatedCard'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/dashboard'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await api.login(email.trim(), password)
      setUser(user)
      showToast('Welcome back!', 'success')
      navigate(from, { replace: true })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <ThreeHero />
      </motion.div>
      <AnimatedCard className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">Welcome Back</span>
          <h2>Sign In</h2>
          <p className="subtitle-muted">Access your FIR workspace and AI crime classification.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <motion.div className="form-group" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="username"
            />
          </motion.div>
          <motion.div className="form-group" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass((s) => !s)}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </motion.div>
          <motion.button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>
        <p className="auth-meta">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <div className="auth-footer">
          <p>
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </AnimatedCard>
    </div>
  )
}
