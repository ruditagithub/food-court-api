import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'

export function FoodCourtProfilePage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [foodCourt, setFoodCourt] = useState<any>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form states for active management
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [logo, setLogo] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [isSaving, setIsSaving] = useState(false)

  // Onboarding form states
  const [obName, setObName] = useState('')
  const [obAddress, setObAddress] = useState('')
  const [obPhone, setObPhone] = useState('')
  const [obLogo, setObLogo] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchFoodCourtData = async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any[] }>('/api/food-courts', {
        token: token || undefined,
      })

      if (res.data && res.data.length > 0) {
        const fc = res.data[0]
        setFoodCourt(fc)
        setName(fc.name || '')
        setAddress(fc.address || '')
        setPhone(fc.phone || '')
        setLogo(fc.logo || '')
        setStatus(fc.status || 'ACTIVE')

        // Fetch tenants for this food court
        try {
          const tenantRes = await apiFetch<{ data: any[] }>(`/api/food-court/${fc.id}/tenant`, {
            token: token || undefined,
          })
          setTenants(tenantRes.data || [])
        } catch (tErr) {
          console.warn('Could not load tenants for food court:', tErr)
        }
      } else {
        setFoodCourt(null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat profil food court'
      toastError('Gagal Memuat Data', msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFoodCourtData()
  }, [])

  // Handle onboarding submission
  const handleOnboardingSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!obName.trim()) {
      toastError('Validasi Gagal', 'Nama cabang food court wajib diisi')
      return
    }

    setIsCreating(true)
    try {
      const token = getToken()
      await apiFetch('/api/food-courts', {
        method: 'POST',
        token: token || undefined,
        body: {
          name: obName.trim(),
          address: obAddress.trim() || undefined,
          phone: obPhone.trim() || undefined,
          logo: obLogo.trim() || undefined,
        },
      })
      toastSuccess('Cabang Berhasil Dibuat', 'Food court Anda telah didaftarkan.')
      fetchFoodCourtData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftarkan cabang'
      toastError('Pendaftaran Gagal', msg)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle active management update
  const handleUpdateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!foodCourt) return
    if (!name.trim()) {
      toastError('Validasi Gagal', 'Nama cabang food court tidak boleh kosong')
      return
    }

    setIsSaving(true)
    try {
      const token = getToken()
      await apiFetch(`/api/food-courts/${foodCourt.id}`, {
        method: 'PUT',
        token: token || undefined,
        body: {
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          logo: logo.trim() || null,
          status,
        },
      })
      toastSuccess('Perubahan Disimpan', 'Profil food court berhasil diperbarui.')
      fetchFoodCourtData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan perubahan'
      toastError('Gagal Menyimpan', msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <InternalLayout title="Profil Cabang Food Court">
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Icons.Refresh className="w-6 h-6 animate-spin text-[#737373]" />
          <p className="text-xs text-[#737373]">Memuat profil cabang...</p>
        </div>
      </InternalLayout>
    )
  }

  // Case 1: Onboarding State
  if (!foodCourt) {
    return (
      <InternalLayout
        title="Pendaftaran Cabang Baru"
        subtitle="Selamat datang! Mulai dengan mendaftarkan lokasi food court kelolaan Anda"
      >
        <div className="max-w-2xl mx-auto py-6">
          <Card surface="paper" className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-[20px] bg-[#0a0a0a] text-white flex items-center justify-center mx-auto shadow-md">
                <Icons.Building className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-[#0a0a0a] tracking-tight">
                Mulai Kelola Food Court Anda
              </h2>
              <p className="text-sm text-[#737373] max-w-md mx-auto">
                Anda belum memiliki cabang food court yang terdaftar. Masukkan identitas cabang
                Anda untuk mulai menambahkan stan tenant dan meja.
              </p>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="ob-name" required>
                  Nama Cabang Food Court
                </Label>
                <Input
                  id="ob-name"
                  placeholder="Contoh: Grand City Food Court @Lantai 2"
                  value={obName}
                  onChange={(e) => setObName(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div>
                <Label htmlFor="ob-address">Alamat Lengkap</Label>
                <textarea
                  id="ob-address"
                  rows={2}
                  className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all disabled:opacity-50"
                  placeholder="Jl. Pemuda No. 10 Lantai 2, Surabaya"
                  value={obAddress}
                  onChange={(e) => setObAddress(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ob-phone">Nomor Telepon Kontak</Label>
                  <Input
                    id="ob-phone"
                    type="tel"
                    placeholder="081234567890"
                    value={obPhone}
                    onChange={(e) => setObPhone(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div>
                  <Label htmlFor="ob-logo">URL Foto / Logo</Label>
                  <Input
                    id="ob-logo"
                    type="url"
                    placeholder="https://example.com/logo.jpg"
                    value={obLogo}
                    onChange={(e) => setObLogo(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                disabled={isCreating}
              >
                {isCreating ? 'Mendaftarkan Cabang...' : 'Daftarkan Cabang Sekarang'}
              </Button>
            </form>
          </Card>
        </div>
      </InternalLayout>
    )
  }

  // Case 2: Active Management State
  return (
    <InternalLayout
      title={foodCourt.name}
      subtitle={`Pengaturan profil operasional dan stan cabang`}
      foodCourtName={foodCourt.name}
      actions={
        <Link to="/app/admin/tenants">
          <Button variant="outline" size="sm" className="gap-2">
            <Icons.Store className="w-4 h-4" />
            <span className="hidden sm:inline">Kelola Stan Tenant</span>
            <span className="sm:hidden">Tenant</span>
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card surface="paper" className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center shrink-0">
              <Icons.Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-[#0a0a0a]">
                {tenants.length}
              </span>
              <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
                Stan Terdaftar
              </p>
            </div>
          </Card>

          <Card surface="paper" className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center shrink-0">
              <Icons.QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-[#0a0a0a]">
                {foodCourt.tables?.length || 0}
              </span>
              <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
                Meja Makan Aktif
              </p>
            </div>
          </Card>

          <Card surface="paper" className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center shrink-0">
              <Icons.Shield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-[#0a0a0a] truncate block">
                {foodCourt.manager?.name || 'Manajer Aktif'}
              </span>
              <p className="text-xs font-mono text-[#737373] truncate">
                {foodCourt.manager?.email || '-'}
              </p>
            </div>
          </Card>
        </div>

        {/* Profile Settings Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card surface="paper" className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
                <div>
                  <h3 className="text-base font-bold text-[#0a0a0a]">
                    Informasi Profil Cabang
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Perbarui nama, kontak telepon, dan alamat yang tampil pada pelanggan
                  </p>
                </div>
                <Badge variant={status === 'ACTIVE' ? 'solid' : 'soft'}>
                  {status}
                </Badge>
              </div>

              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name" required>
                    Nama Cabang Food Court
                  </Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="mt-1 text-xs font-mono text-[#737373]">
                    Slug Publik: <span className="text-[#0a0a0a] font-semibold">/{foodCourt.slug}</span> (Otomatis)
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-address">Alamat Lengkap Lokasi</Label>
                  <textarea
                    id="edit-address"
                    rows={2}
                    className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all disabled:opacity-50"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-phone">Nomor Telepon Kontak</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-status">Status Operasional</Label>
                    <Select
                      id="edit-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                      disabled={isSaving}
                    >
                      <option value="ACTIVE">Aktif (ACTIVE)</option>
                      <option value="INACTIVE">Nonaktif (INACTIVE)</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-logo">URL Foto / Logo</Label>
                  <Input
                    id="edit-logo"
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setName(foodCourt.name || '')
                      setAddress(foodCourt.address || '')
                      setPhone(foodCourt.phone || '')
                      setLogo(foodCourt.logo || '')
                      setStatus(foodCourt.status || 'ACTIVE')
                    }}
                    disabled={isSaving}
                  >
                    Reset
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Stalls quick summary column */}
          <div className="space-y-4">
            <Card surface="paper" className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
                <h4 className="text-sm font-bold text-[#0a0a0a]">
                  Stan Tenant Cabang ({tenants.length})
                </h4>
                <Link
                  to="/app/admin/tenants"
                  className="text-xs text-[#0a0a0a] font-semibold underline underline-offset-2"
                >
                  Kelola
                </Link>
              </div>

              {tenants.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#737373]">
                  Belum ada stan tenant yang ditambahkan.
                  <div className="mt-3">
                    <Link to="/app/admin/tenants">
                      <Button variant="outline" size="sm">
                        + Tambah Tenant
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {tenants.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-[#0a0a0a] truncate">{t.name}</p>
                        <p className="font-mono text-[#737373] text-[11px]">
                          {t.stallNumber}
                        </p>
                      </div>
                      <Badge variant={t.isOpen ? 'solid' : 'soft'}>
                        {t.isOpen ? 'BUKA' : 'TUTUP'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </InternalLayout>
  )
}
