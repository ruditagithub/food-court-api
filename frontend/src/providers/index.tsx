import { AuthProvider } from '../context/AuthContext'
import { QueryProvider } from './QueryProvider'
import { type ReactNode } from 'react'

/**
 * Combined providers wrapper for the app
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryProvider>
  )
}

// Re-export for convenience
export { useAuth } from '../context/AuthContext'