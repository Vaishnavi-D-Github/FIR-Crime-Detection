import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { AnimatedCard } from '../components/AnimatedCard'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await api.forgotPassword(email.trim())
      setResetUrl(result.reset_url ?? null)
      showToast('If an account exists, reset instructions were prepared.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Request failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <AnimatedCard>
        <span className="eyebrow">Account Recovery</span>
        <h2>Reset Password</h2>
        <p className="subtitle-muted">Enter your email to receive a password reset link.</p>
        <form onSubmit={handleSubmit}>
          <motion.div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </motion.div>
          <motion.button type="submit" className="btn btn-primary btn-block" disabled={loading} whileHover={{ scale: 1.03 }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </motion.button>
        </form>
        {resetUrl && (
          <div className="alert alert-success" style={{ marginTop: '1rem', wordBreak: 'break-all' }}>
            Dev reset link: <a href={resetUrl}>{resetUrl}</a>
          </div>
        )}
        <p className="auth-meta">
          <Link to="/login">Back to sign in</Link>
        </p>
      </AnimatedCard>
    </div>
  )
}
