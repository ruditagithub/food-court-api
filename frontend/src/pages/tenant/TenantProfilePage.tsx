import { useState, useEffect, type FormEvent } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'

export function TenantProfilePage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [tenant, setTenant] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [openingTime, setOpeningTime] = useState('09:00')
  const [closingTime, setClosingTime] = useState('21:00')
  const [isOpen, setIsOpen] = useState(true)
  const [logo, setLogo] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchTenantProfile = async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any }>('/api/tenants/mine', {
        token: token || undefined,
      })

      if (res.data) {
        const t = res.data
        setTenant(t)
        setName(t.name || '')
        setDescription(t.description || '')
        setOpeningTime(t.openingTime ? t.openingTime.slice(0, 5) : '09:00')
        setClosingTime(t.closingTime ? t.closingTime.slice(0, 5) : '21:00')
        setIsOpen(t.isOpen ?? true)
        setLogo(t.logo || '')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat profil stan'
      toastError('Gagal Memuat Profil', msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTenantProfile()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!tenant) return

    if (!name.trim()) {
      toastError('Validasi Gagal', 'Nama gerai tidak boleh kosong')
      return
    }

    setIsSaving(true)
    try {
      const token = getToken()
      const formattedOpeningTime = openingTime.length === 5 ? `${openingTime}:00` : openingTime
      const formattedClosingTime = closingTime.length === 5 ? `${closingTime}:00` : closingTime

      await apiFetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        token: token || undefined,
        body: {
          name: name.trim(),
          description: description.trim() || null,
          openingTime: formattedOpeningTime,
          closingTime: formattedClosingTime,
          isOpen,
          logo: logo.trim() || null,
        },
      })

      toastSuccess('Profil Kios Disimpan', 'Perubahan jam operasional dan identitas gerai telah diperbarui.')
      fetchTenantProfile()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui profil'
      toastError('Gagal Menyimpan', msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <InternalLayout title="Profil & Jam Operasional Kios">
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Icons.Refresh className="w-6 h-6 animate-spin text-[#737373]" />
          <p className="text-xs text-[#737373]">Memuat informasi kios Anda...</p>
        </div>
      </InternalLayout>
    )
  }

  if (!tenant) {
    return (
      <InternalLayout title="Profil Kios">
        <Card surface="paper" className="max-w-md mx-auto text-center py-12 p-6">
          <p className="text-sm text-[#737373]">
            Akun Anda belum dikaitkan dengan stan tenant manapun. Hubungi pengelola food court untuk mendaftarkan kios Anda.
          </p>
        </Card>
      </InternalLayout>
    )
  }

  return (
    <InternalLayout
      title="Profil & Jam Operasional Kios"
      subtitle="Kelola jam buka toko, status penerimaan pesanan, dan cerita kuliner Anda"
      foodCourtName={tenant.foodCourt?.name}
      stallNumber={tenant.stallNumber}
    >
      <div className="max-w-3xl space-y-6">
        {/* Master Open/Close Status Card */}
        <Card
          surface="paper"
          className={`p-6 border-2 transition-all ${
            isOpen ? 'border-[#0a0a0a]' : 'border-[#e5e5e5]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-[18px] flex items-center justify-center font-bold text-xl transition-colors ${
                  isOpen ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-[#737373]'
                }`}
              >
                <Icons.Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0a0a0a]">
                    Status Penerimaan Pesanan
                  </h3>
                  <Badge variant={isOpen ? 'solid' : 'soft'}>
                    {isOpen ? 'SEDANG BUKA' : 'TUTUP SEMENTARA'}
                  </Badge>
                </div>
                <p className="text-xs text-[#737373] mt-0.5">
                  {isOpen
                    ? 'Stan Anda aktif melayani pesanan pelanggan yang masuk dari meja'
                    : 'Pelanggan tidak dapat memesan makanan dari kios Anda saat ini'}
                </p>
              </div>
            </div>

            <Switch
              checked={isOpen}
              onChange={setIsOpen}
              id="master-stall-status"
              disabled={isSaving}
            />
          </div>
        </Card>

        {/* Read-Only Location Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
              Nomor Stan Terdaftar
            </span>
            <p className="text-base font-mono font-bold text-[#0a0a0a] mt-1">
              {tenant.stallNumber}
            </p>
            <p className="text-[10px] text-[#737373] mt-0.5">
              *Dikelola oleh pengelola food court
            </p>
          </div>

          <div className="p-4 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
              Lokasi Cabang Food Court
            </span>
            <p className="text-sm font-semibold text-[#0a0a0a] mt-1 truncate">
              {tenant.foodCourt?.name || 'Food Court Utama'}
            </p>
            <p className="text-[10px] text-[#737373] mt-0.5">
              *Dikelola oleh pengelola food court
            </p>
          </div>
        </div>

        {/* Profile Settings Form */}
        <Card surface="paper" className="space-y-6">
          <div className="pb-4 border-b border-[#e5e5e5]">
            <h4 className="text-base font-bold text-[#0a0a0a]">
              Identitas Gerai Makanan
            </h4>
            <p className="text-xs text-[#737373]">
              Informasi ini tampil pada kartu stan di aplikasi pemesanan pelanggan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tenant-self-name" required>
                Nama Stan / Gerai Makanan
              </Label>
              <Input
                id="tenant-self-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="tenant-self-desc">Cerita Kuliner & Deskripsi Kios</Label>
              <textarea
                id="tenant-self-desc"
                rows={3}
                className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all disabled:opacity-50"
                placeholder="Ceritakan kelezatan racikan bumbu khas atau resep turun temurun kios Anda"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tenant-self-open">Jam Buka Harian</Label>
                <Input
                  id="tenant-self-open"
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="tenant-self-close">Jam Tutup Harian</Label>
                <Input
                  id="tenant-self-close"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tenant-self-logo">URL Foto / Logo Gerai</Label>
              <Input
                id="tenant-self-logo"
                type="url"
                placeholder="https://example.com/logo-stan.jpg"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Kios'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </InternalLayout>
  )
}
