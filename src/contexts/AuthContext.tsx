import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'
import { api } from '../lib/apiClient'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('smanko_token')
    const savedUser  = localStorage.getItem('smanko_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const res = await api.post<{
      status: string
      data: { token: string; user: User }
    }>('/auth/login.php', { username, password })

    const { token: t, user: u } = res.data
    localStorage.setItem('smanko_token', t)
    localStorage.setItem('smanko_user',  JSON.stringify(u))
    setToken(t)
    setUser(u)
  }

  const logout = async () => {
    try { await api.post('/auth/logout.php', {}) } catch { /* ignore */ }
    localStorage.removeItem('smanko_token')
    localStorage.removeItem('smanko_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
