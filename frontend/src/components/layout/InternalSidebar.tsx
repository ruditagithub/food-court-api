import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icons } from '../ui/Icons'

interface InternalSidebarProps {
  onClose?: () => void
}

export function InternalSidebar({ onClose }: InternalSidebarProps) {
  const { user } = useAuth()

  if (!user) return null

  const getNavLinks = () => {
    if (user.role === 'admin') {
      return [
        { to: '/app/dashboard', label: 'Ringkasan Dashboard', icon: Icons.Building },
        { to: '/app/super-admin/food-courts', label: 'Master Cabang Food Court', icon: Icons.Building },
        { to: '/app/super-admin/tenants', label: 'Master Stan Tenant', icon: Icons.Store },
        { to: '/app/super-admin/menus', label: 'Katalog Menu Global', icon: Icons.Utensils },
        { to: '/app/admin/orders', label: 'Monitoring Seluruh Pesanan', icon: Icons.ShoppingBag },
        { to: '/app/admin/payments', label: 'Rekap Pembayaran QRIS', icon: Icons.CreditCard },
        { to: '/app/admin/tables', label: 'Manajemen Meja QR Global', icon: Icons.QrCode },
        { to: '/app/profile', label: 'Pengaturan Akun Super Admin', icon: Icons.User },
      ]
    }

    if (user.role === 'admin-food-court') {
      return [
        { to: '/app/dashboard', label: 'Dashboard Utama', icon: Icons.Building },
        { to: '/app/admin/food-court', label: 'Profil Cabang', icon: Icons.Building },
        { to: '/app/admin/tenants', label: 'Stan Tenant', icon: Icons.Store },
        { to: '/app/admin/tables', label: 'Manajemen Meja', icon: Icons.QrCode },
        { to: '/app/admin/orders', label: 'Monitoring Pesanan', icon: Icons.ShoppingBag },
        { to: '/app/admin/payments', label: 'Log Transaksi', icon: Icons.CreditCard },
        { to: '/app/profile', label: 'Profil Akun', icon: Icons.User },
      ]
    }

    if (user.role === 'tenant') {
      return [
        { to: '/app/dashboard', label: 'Ringkasan Omzet', icon: Icons.Building },
        { to: '/app/tenant/kds', label: 'Layar Dapur (KDS)', icon: Icons.Kitchen },
        { to: '/app/tenant/menus', label: 'Katalog Menu & Stok', icon: Icons.Utensils },
        { to: '/app/tenant/profile', label: 'Profil Kios', icon: Icons.Store },
        { to: '/app/tenant/orders', label: 'Rekap Pesanan', icon: Icons.ShoppingBag },
        { to: '/app/profile', label: 'Profil Akun', icon: Icons.User },
      ]
    }

    return [
      { to: '/app/profile', label: 'Profil Akun', icon: Icons.User },
    ]
  }

  const links = getNavLinks()

  return (
    <aside className="w-64 bg-[#fafafa] border-r border-[#e5e5e5] flex flex-col h-full shrink-0">
      {/* Brand logo & title */}
      <div className="p-5 border-b border-[#e5e5e5] flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-[14px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            FC
          </span>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-[#0a0a0a]">
              FoodCourt OS
            </span>
            <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider">
              {user.role}
            </span>
          </div>
        </NavLink>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-[14px] text-[#737373] hover:text-[#0a0a0a]"
          >
            <Icons.Close className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#737373]">
          Navigasi Utama
        </div>
        {links.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[18px] text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0a0a0a] text-[#fafafa] shadow-xs'
                    : 'text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-[#e5e5e5] text-xs text-[#737373] flex items-center justify-between">
        <span className="font-mono text-[11px]">v1.0.0</span>
        <NavLink
          to="/"
          className="text-xs hover:text-[#0a0a0a] transition-colors inline-flex items-center gap-1"
        >
          <span>Landing Page</span>
        </NavLink>
      </div>
    </aside>
  )
}
