import { AuthProvider } from '../context/AuthContext'
import { QueryProvider } from './QueryProvider'
import { ToastProvider } from '../components/ui/Toast'
import { type ReactNode } from 'react'

/**
 * Combined providers wrapper for the app
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

// Re-export for convenience
export { useAuth } from '../context/AuthContext'
export { useToast } from '../components/ui/Toast'