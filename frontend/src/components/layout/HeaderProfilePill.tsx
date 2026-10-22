import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'

export function HeaderProfilePill() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const getRoleBadgeVariant = (role: string): 'solid' | 'soft' | 'outline' => {
    switch (role) {
      case 'admin':
        return 'solid'
      case 'admin-food-court':
        return 'soft'
      case 'tenant':
        return 'outline'
      default:
        return 'soft'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Super Admin'
      case 'admin-food-court':
        return 'Food Court Admin'
      case 'tenant':
        return 'Tenant'
      case 'customer':
        return 'Customer'
      default:
        return role
    }
  }

  // Get user initials
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-[18px] bg-[#ffffff] border border-[#e5e5e5] hover:border-[#737373] transition-all duration-150 cursor-pointer shadow-xs"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        <div className="w-7 h-7 rounded-full bg-[#0a0a0a] text-[#fafafa] flex items-center justify-center font-bold text-xs">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-[#0a0a0a] leading-tight line-clamp-1 max-w-[120px]">
            {user.name}
          </span>
          <span className="text-[10px] text-[#737373] leading-none">
            {getRoleLabel(user.role)}
          </span>
        </div>
        <Badge variant={getRoleBadgeVariant(user.role)} className="hidden md:inline-flex text-[10px] px-2 py-0.5">
          {user.role}
        </Badge>
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-[18px] bg-[#ffffff] border border-[#e5e5e5] shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="px-4 py-2 border-b border-[#e5e5e5]">
            <p className="text-sm font-semibold text-[#0a0a0a] truncate">{user.name}</p>
            <p className="text-xs text-[#737373] truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              to="/app/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
            >
              <Icons.User className="w-4 h-4 text-[#737373]" />
              Profil Akun
            </Link>

            <Link
              to="/"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
            >
              <Icons.Store className="w-4 h-4 text-[#737373]" />
              Halaman Depan
            </Link>
          </div>

          <div className="pt-1 border-t border-[#e5e5e5]">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-[#e7000b] hover:bg-[#fff0f0] transition-colors cursor-pointer"
            >
              <Icons.Logout className="w-4 h-4 text-[#e7000b]" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
