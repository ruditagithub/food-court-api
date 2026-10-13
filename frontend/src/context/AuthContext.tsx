import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, Role } from '../types'
import { getToken, setToken, clearToken } from '../api/client'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  hasRole: (roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const storedToken = getToken()
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        setTokenState(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        clearToken()
      }
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setTokenState(newToken)
    setUser(newUser)
  }

  const logout = () => {
    clearToken()
    setTokenState(null)
    setUser(null)
  }

  const hasRole = (roles: Role[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}