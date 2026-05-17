import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { PoliceOfficer, User } from '../types'

interface AuthContextValue {
  user: User | null
  policeOfficer: PoliceOfficer | null
  loading: boolean
  refresh: () => Promise<void>
  setUser: (user: User | null) => void
  setPoliceOfficer: (officer: PoliceOfficer | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [policeOfficer, setPoliceOfficer] = useState<PoliceOfficer | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const session = await api.getSession()
      setUser(session.user)
      setPoliceOfficer(session.police_officer)
    } catch {
      setUser(null)
      setPoliceOfficer(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({
      user,
      policeOfficer,
      loading,
      refresh,
      setUser,
      setPoliceOfficer,
    }),
    [user, policeOfficer, loading, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
