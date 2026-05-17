import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ThreeHero } from '../components/ThreeHero'
import { AnimatedCard } from '../components/AnimatedCard'

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirm_password: confirm,
      })
      setUser(user)
      showToast('Account created successfully!', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <ThreeHero />
      <AnimatedCard className="auth-card">
        <motion.div className="auth-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span className="eyebrow">Join FIR AI</span>
          <h2>Create Account</h2>
          <p className="subtitle-muted">File reports, upload FIR drafts, and view AI crime insights.</p>
        </motion.div>
        <form onSubmit={handleSubmit} noValidate>
          {[
            { id: 'name', label: 'Full Name', type: 'text', value: name, set: setName, placeholder: 'Enter your full name' },
            { id: 'email', label: 'Email Address', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com' },
          ].map((field, i) => (
            <motion.div
              key={field.id}
              className="form-group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <label htmlFor={field.id}>{field.label}</label>
              <input
                id={field.id}
                type={field.type}
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder={field.placeholder}
                required
              />
            </motion.div>
          ))}
          {[
            { id: 'password', label: 'Password', value: password, set: setPassword },
            { id: 'confirm_password', label: 'Confirm Password', value: confirm, set: setConfirm },
          ].map((field, i) => (
            <motion.div key={field.id} className="form-group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.06 }}>
              <label htmlFor={field.id}>{field.label}</label>
              <input
                id={field.id}
                type="password"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder={field.id === 'password' ? 'At least 6 characters' : 'Re-enter your password'}
                minLength={6}
                required
              />
            </motion.div>
          ))}
          <motion.button type="submit" className="btn btn-primary btn-block" disabled={loading} whileHover={{ scale: 1.03 }}>
            {loading ? 'Creating...' : 'Get Started'}
          </motion.button>
        </form>
        <motion.div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </motion.div>
      </AnimatedCard>
    </div>
  )
}
