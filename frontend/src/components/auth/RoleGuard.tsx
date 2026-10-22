import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: Role[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] border-t-transparent animate-spin" />
          <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
            Memverifikasi Akses...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to default home screen according to actual user role
    if (user.role === 'tenant') {
      return <Navigate to="/app/tenant/kds" replace />
    } else if (user.role === 'admin-food-court') {
      return <Navigate to="/app/admin/food-court" replace />
    } else if (user.role === 'admin') {
      return <Navigate to="/app/super-admin/food-courts" replace />
    } else {
      return <Navigate to="/app/profile" replace />
    }
  }

  return <>{children}</>
}
