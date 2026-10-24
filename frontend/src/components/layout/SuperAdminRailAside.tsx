import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building,
  Store,
  UtensilsCrossed,
  ChefHat,
  Calendar,
  FileText,
  Layers,
  FolderKanban,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function SuperAdminRailAside() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const isFoodCourtManager = user?.role === 'admin-food-court'
  const isTenant = user?.role === 'tenant'

  const navItems = isTenant
    ? [
        {
          to: '/app/dashboard',
          label: 'Ringkasan Omzet Gerai',
          icon: LayoutDashboard,
          isActive:
            location.pathname === '/app/dashboard' || location.pathname === '/dashboard',
        },
        {
          to: '/app/tenant/kds',
          label: 'Layar Dapur (KDS)',
          icon: ChefHat,
          isActive: location.pathname.startsWith('/app/tenant/kds'),
        },
        {
          to: '/app/tenant/menus',
          label: 'Katalog Menu & Stok',
          icon: UtensilsCrossed,
          isActive: location.pathname.startsWith('/app/tenant/menus'),
        },
        {
          to: '/app/categories',
          label: 'Kategori Menu Gerai',
          icon: FolderKanban,
          isActive: location.pathname.startsWith('/app/categories'),
        },
        {
          to: '/app/admin/orders',
          label: 'Rekap Pesanan Masuk',
          icon: Calendar,
          isActive:
            location.pathname.startsWith('/app/admin/orders') ||
            location.pathname.startsWith('/app/tenant/orders'),
        },
        {
          to: '/app/tenant/profile',
          label: 'Profil & Operasional Kios',
          icon: Store,
          isActive: location.pathname.startsWith('/app/tenant/profile'),
        },
        {
          to: '/app/profile',
          label: 'Pengaturan Akun Pengguna',
          icon: Settings,
          isActive: location.pathname.startsWith('/app/profile'),
        },
      ]
    : isFoodCourtManager
    ? [
        {
          to: '/app/dashboard',
          label: 'Ringkasan Dashboard Cabang',
          icon: LayoutDashboard,
          isActive:
            location.pathname === '/app/dashboard' || location.pathname === '/dashboard',
        },
        {
          to: '/app/admin/food-court',
          label: 'Kelola Profil Cabang Saya',
          icon: Building,
          isActive: location.pathname.startsWith('/app/admin/food-court'),
        },
        {
          to: '/app/admin/tenants',
          label: 'Stan Tenant Cabang',
          icon: Store,
          isActive: location.pathname.startsWith('/app/admin/tenants'),
        },
        {
          to: '/app/super-admin/menus',
          label: 'Katalog Menu Cabang',
          icon: UtensilsCrossed,
          isActive:
            location.pathname.startsWith('/app/super-admin/menus') ||
            location.pathname.startsWith('/app/tenant/menus'),
        },
        {
          to: '/app/categories',
          label: 'Kategori Menu Cabang',
          icon: FolderKanban,
          isActive: location.pathname.startsWith('/app/categories'),
        },
        {
          to: '/app/admin/orders',
          label: 'Monitoring Seluruh Pesanan',
          icon: Calendar,
          isActive: location.pathname.startsWith('/app/admin/orders'),
        },
        {
          to: '/app/admin/payments',
          label: 'Rekap Pembayaran & Gateway',
          icon: FileText,
          isActive: location.pathname.startsWith('/app/admin/payments'),
        },
        {
          to: '/app/admin/tables',
          label: 'Manajemen Meja QR Cabang',
          icon: Layers,
          isActive: location.pathname.startsWith('/app/admin/tables'),
        },
        {
          to: '/app/profile',
          label: 'Pengaturan Akun Manajer',
          icon: Settings,
          isActive: location.pathname.startsWith('/app/profile'),
        },
      ]
    : [
        {
          to: '/app/dashboard',
          label: 'Ringkasan Dashboard',
          icon: LayoutDashboard,
          isActive:
            location.pathname === '/app/dashboard' || location.pathname === '/dashboard',
        },
        {
          to: '/app/super-admin/food-courts',
          label: 'Master Cabang Food Court',
          icon: Building,
          isActive: location.pathname.startsWith('/app/super-admin/food-courts'),
        },
        {
          to: '/app/super-admin/tenants',
          label: 'Master Stan Tenant Kios',
          icon: Store,
          isActive: location.pathname.startsWith('/app/super-admin/tenants'),
        },
        {
          to: '/app/super-admin/menus',
          label: 'Katalog Menu Global',
          icon: UtensilsCrossed,
          isActive:
            location.pathname.startsWith('/app/super-admin/menus') ||
            location.pathname.startsWith('/app/tenant/menus'),
        },
        {
          to: '/app/categories',
          label: 'Kategori Menu Global',
          icon: FolderKanban,
          isActive: location.pathname.startsWith('/app/categories'),
        },
        {
          to: '/app/admin/orders',
          label: 'Monitoring Seluruh Pesanan',
          icon: Calendar,
          isActive: location.pathname.startsWith('/app/admin/orders'),
        },
        {
          to: '/app/admin/payments',
          label: 'Rekap Pembayaran & Gateway',
          icon: FileText,
          isActive: location.pathname.startsWith('/app/admin/payments'),
        },
        {
          to: '/app/admin/tables',
          label: 'Manajemen Meja QR Global',
          icon: Layers,
          isActive: location.pathname.startsWith('/app/admin/tables'),
        },
        {
          to: '/app/profile',
          label: 'Pengaturan Akun Super Admin',
          icon: Settings,
          isActive: location.pathname.startsWith('/app/profile'),
        },
      ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col items-center justify-between py-2 w-14 shrink-0 select-none sticky top-6 h-[calc(100vh-3rem)] self-start z-30">
      {/* Top: Floating Navigation Pill Dock */}
      <div className="flex flex-col items-center gap-2 p-2 rounded-[28px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.to} className="relative group flex items-center justify-center">
              <Link
                to={item.to}
                className={`w-10 h-10 rounded-[16px] flex items-center justify-center transition-all ${
                  item.isActive
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </Link>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-[10px] bg-[#0a0a0a] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0a0a0a]" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom: Help & Logout */}
      <div className="flex flex-col items-center gap-2">
        {/* Help */}
        <div className="relative group flex items-center justify-center">
          <button
            type="button"
            onClick={() =>
              alert('Pusat Bantuan Amici Food Court v1.0.0 - Akses API Swagger: /swagger')
            }
            className="w-10 h-10 rounded-[16px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#ffffff] flex items-center justify-center transition-colors cursor-pointer"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-[10px] bg-[#0a0a0a] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
            Bantuan & Panduan API
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0a0a0a]" />
          </div>
        </div>

        {/* Logout */}
        <div className="relative group flex items-center justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="w-10 h-10 rounded-[16px] text-[#737373] hover:text-[#e7000b] hover:bg-[#ffffff] flex items-center justify-center transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-[10px] bg-[#e7000b] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
            Keluar Akun
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#e7000b]" />
          </div>
        </div>
      </div>
    </aside>
  )
}
