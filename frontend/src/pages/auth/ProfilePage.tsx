import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { formatDate } from '../../lib/utils'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card surface="paper" className="max-w-md w-full text-center p-6">
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
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a]">
              Profil Akun
            </h1>
            <p className="text-sm text-[#737373]">
              Informasi identitas dan hak akses akun Anda
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            ← Kembali
          </Button>
        </div>

        {/* User Card */}
        <Card surface="paper" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-[#e5e5e5]">
            <div className="w-16 h-16 rounded-[24px] bg-[#0a0a0a] text-[#fafafa] flex items-center justify-center text-xl font-bold">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#0a0a0a]">{user.name}</h2>
                <Badge variant={user.role === 'admin' ? 'solid' : 'soft'}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-[#737373] mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                ID Pengguna
              </span>
              <p className="text-xs font-mono text-[#0a0a0a] mt-1 break-all">
                {user.id}
              </p>
            </div>

            <div className="p-4 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                Peran Pengguna
              </span>
              <p className="text-sm font-semibold text-[#0a0a0a] mt-1 capitalize">
                {user.role}
              </p>
            </div>

            <div className="p-4 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                Terdaftar Sejak
              </span>
              <p className="text-sm font-medium text-[#0a0a0a] mt-1">
                {user.createdAt ? formatDate(user.createdAt) : '-'}
              </p>
            </div>

            <div className="p-4 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                Status Sesi
              </span>
              <p className="text-sm font-medium text-[#0a0a0a] mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Aktif & Terverifikasi
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#e5e5e5] flex flex-col sm:flex-row justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (user.role === 'tenant') navigate('/app/tenant/kds')
                else if (user.role === 'admin-food-court') navigate('/app/admin/food-court')
                else if (user.role === 'admin') navigate('/app/super-admin/food-courts')
                else navigate('/')
              }}
            >
              Buka Layar Kerja
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="!text-[#e7000b] hover:!bg-[#fff0f0] hover:!border-[#e7000b]"
            >
              <Icons.Logout className="w-4 h-4 mr-2" />
              Keluar dari Sesi
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
