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

  // Initialize auth from localStorage and verify with /api/auth/me
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getToken()
      const storedUser = localStorage.getItem('user')

      if (!storedToken) {
        setIsLoading(false)
        return
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
          setTokenState(storedToken)
        } catch {
          clearToken()
        }
      }

      // Verify token with backend
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        if (response.ok) {
          const resData = await response.json()
          if (resData.data) {
            setUser(resData.data)
            setTokenState(storedToken)
            localStorage.setItem('user', JSON.stringify(resData.data))
          }
        } else if (response.status === 401) {
          // Token expired or invalid
          clearToken()
          setTokenState(null)
          setUser(null)
        }
      } catch (e) {
        // Network error - keep cached user for offline/resilience
        console.warn('Could not verify auth session with backend:', e)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
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