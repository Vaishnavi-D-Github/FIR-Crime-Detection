import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function Logout() {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  useEffect(() => {
    void (async () => {
      try {
        await api.logout()
      } finally {
        setUser(null)
        navigate('/', { replace: true })
      }
    })()
  }, [navigate, setUser])

  return (
    <div className="ai-loader">
      <div className="ai-loader-ring" />
      <p className="subtitle-muted">Signing out...</p>
    </div>
  )
}
