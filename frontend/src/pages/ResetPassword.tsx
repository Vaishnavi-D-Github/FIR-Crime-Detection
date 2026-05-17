import { FormEvent, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { AnimatedCard } from '../components/AnimatedCard'

export function ResetPassword() {
  const { token = '' } = useParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.resetPassword(token, password, confirm)
      showToast('Password updated. You can sign in now.', 'success')
      navigate('/login')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <AnimatedCard>
        <span className="eyebrow">New Password</span>
        <h2>Set Password</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <motion.button type="submit" className="btn btn-primary btn-block" disabled={loading} whileHover={{ scale: 1.03 }}>
            {loading ? 'Saving...' : 'Update Password'}
          </motion.button>
        </form>
        <p className="auth-meta">
          <Link to="/login">Back to sign in</Link>
        </p>
      </AnimatedCard>
    </div>
  )
}
