import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  token: string
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState>({
  user: null, token: '', loading: true,
  login: async () => {}, logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('auth_token')
    if (saved) {
      api.login(saved)
        .then(res => { setUser(res.user); setToken(res.token) })
        .catch(() => localStorage.removeItem('auth_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (t: string) => {
    const res = await api.login(t)
    setUser(res.user)
    setToken(res.token)
    localStorage.setItem('auth_token', res.token)
  }

  const logout = () => {
    setUser(null)
    setToken('')
    localStorage.removeItem('auth_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
