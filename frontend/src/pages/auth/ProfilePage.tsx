import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../lib/utils'
import { LogOut } from 'lucide-react'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <Card surface="paper" className="max-w-md w-full text-center p-6 rounded-[28px]">
          <p className="text-sm text-[#737373] mb-4">Anda belum masuk ke akun.</p>
          <Button variant="primary" onClick={() => navigate('/login')}>
            Masuk Sekarang
          </Button>
        </Card>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <InternalLayout
      title="Pengaturan Akun Super Admin"
      subtitle="Informasi identitas, kredensial autentikasi, dan status hak akses administrator"
    >
      <div className="max-w-3xl space-y-5">
        {/* User Card */}
        <Card surface="paper" className="p-6 sm:p-7 rounded-[28px] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-[#e5e5e5]">
            <div className="w-16 h-16 rounded-[22px] bg-[#0a0a0a] text-[#ffffff] flex items-center justify-center text-xl font-bold shadow-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[#0a0a0a]">{user.name}</h2>
                <Badge variant={user.role === 'admin' ? 'solid' : 'soft'}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-[#737373] mt-0.5 font-mono">{user.email}</p>
            </div>
            <div className="self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sesi Aktif
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                ID Pengguna (UUID)
              </span>
              <p className="text-xs font-mono text-[#0a0a0a] mt-1 break-all font-semibold">
                {user.id}
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                Hak Akses / Peran
              </span>
              <p className="text-sm font-semibold text-[#0a0a0a] mt-1 capitalize">
                {user.role === 'admin' ? 'Super Administrator Platform' : user.role}
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                Terdaftar Sejak
              </span>
              <p className="text-sm font-medium text-[#0a0a0a] mt-1 font-mono">
                {user.createdAt ? formatDate(user.createdAt) : 'April 2026'}
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                Otentikasi & Keamanan
              </span>
              <p className="text-sm font-medium text-[#10b981] mt-1 flex items-center gap-1.5 font-semibold">
                JWT Token Terverifikasi
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#e5e5e5] flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (user.role === 'tenant') navigate('/app/tenant/kds')
                else if (user.role === 'admin-food-court') navigate('/app/admin/food-court')
                else if (user.role === 'admin') navigate('/app/dashboard')
                else navigate('/')
              }}
              className="w-full sm:w-auto"
            >
              Kembali ke Dashboard Utama
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full sm:w-auto !text-[#e7000b] hover:!bg-[#fff0f0] hover:!border-[#e7000b]"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Keluar Akun
            </Button>
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
}
