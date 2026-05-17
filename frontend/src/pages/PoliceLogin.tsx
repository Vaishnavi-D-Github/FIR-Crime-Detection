import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ThreeHero } from '../components/ThreeHero'
import { AnimatedCard } from '../components/AnimatedCard'

export function PoliceLogin() {
  const [officerId, setOfficerId] = useState('')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const { setPoliceOfficer } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { officer } = await api.policeLogin(officerId.trim(), secret)
      setPoliceOfficer(officer)
      showToast('Officer portal unlocked.', 'success')
      navigate('/police/portal')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Invalid credentials', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <ThreeHero />
      <AnimatedCard>
        <span className="eyebrow">Officer Access</span>
        <h2>Police Login</h2>
        <p className="subtitle-muted">Register official FIR records for citizen verification.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="officer_userid">Officer ID</label>
            <input id="officer_userid" value={officerId} onChange={(e) => setOfficerId(e.target.value)} required />
          </div>
          <motion.div className="form-group">
            <label htmlFor="secret_key">Secret Key</label>
            <input id="secret_key" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required />
          </motion.div>
          <motion.button type="submit" className="btn btn-primary btn-block" disabled={loading} whileHover={{ scale: 1.03 }}>
            {loading ? 'Authenticating...' : 'Enter Portal'}
          </motion.button>
        </form>
      </AnimatedCard>
    </div>
  )
}
