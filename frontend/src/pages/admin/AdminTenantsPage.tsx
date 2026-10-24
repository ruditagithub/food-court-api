import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Switch } from '../../components/ui/Switch'
import { Icons } from '../../components/ui/Icons'
import { TenantFormDialog } from '../../components/admin/TenantFormDialog'
import type { Tenant } from '../../types'

export function AdminTenantsPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [foodCourt, setFoodCourt] = useState<any>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState<Tenant | null>(null)

  const fetchTenants = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      // First get current managed food court
      const fcRes = await apiFetch<{ data: any[] }>('/api/food-courts', {
        token: token || undefined,
      })

      if (fcRes.data && fcRes.data.length > 0) {
        const fc = fcRes.data[0]
        setFoodCourt(fc)

        // Fetch tenants for this food court
        const res = await apiFetch<{ data: Tenant[] }>('/api/tenants', {
          token: token || undefined,
        })
        setTenants(res.data || [])
      } else {
        setTenants([])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar stan'
      toastError('Gagal Memuat Data', msg)
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // Quick toggle isOpen
  const handleToggleOpen = async (tenantId: string, currentStatus: boolean) => {
    // Optimistic update
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, isOpen: !currentStatus } : t))
    )

    try {
      const token = getToken()
      await apiFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        token: token || undefined,
        body: { isOpen: !currentStatus },
      })
      toastSuccess('Status Diubah', `Status stan berhasil diubah menjadi ${!currentStatus ? 'Buka' : 'Tutup'}.`)
    } catch (err: unknown) {
      // Revert on error
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, isOpen: currentStatus } : t))
      )
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status stan'
      toastError('Gagal Mengubah Status', msg)
    }
  }

  const [resendingId, setResendingId] = useState<string | null>(null)

  const handleResendActivation = async (tenant: Tenant) => {
    setResendingId(tenant.id)
    try {
      const token = getToken()
      const res = await apiFetch<{ message: string }>(
        `/api/tenants/${tenant.id}/resend-activation`,
        {
          method: 'POST',
          token: token || undefined,
        }
      )
      toastSuccess(
        'Tautan Terkirim',
        res.message || 'Tautan aktivasi baru telah dikirimkan ke email pemilik.'
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim ulang aktivasi'
      toastError('Gagal Mengirim', msg)
    } finally {
      setResendingId(null)
    }
  }

  const filteredTenants = tenants.filter((t) =>
    search.trim()
      ? t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.stallNumber.toLowerCase().includes(search.toLowerCase())
      : true
  )

  return (
    <InternalLayout
      title="Manajemen Stan Tenant"
      subtitle={foodCourt ? `Daftar gerai dan kios kuliner di ${foodCourt.name}` : 'Kelola stan kuliner cabang Anda'}
      foodCourtName={foodCourt?.name}
      actions={
        <Button
          variant="primary"
          onClick={() => {
            setSelectedForEdit(null)
            setDialogOpen(true)
          }}
          className="gap-2"
        >
          <Icons.Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Daftarkan Stan Baru</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search filter */}
        <Card surface="paper" className="!p-4">
          <div className="relative max-w-md">
            <Input
              placeholder="Cari nama stan atau nomor stan (STAN-A01)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
          </div>
        </Card>

        {/* Stalls Table */}
        <Card surface="paper" className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4 font-medium">Stan Kuliner</th>
                  <th className="py-3 px-4 font-medium">Nomor Stan</th>
                  <th className="py-3 px-4 font-medium">Pemilik & Akun</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Jam Layanan</th>
                  <th className="py-3 px-4 font-medium text-center">Buka / Tutup</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      <div className="flex items-center justify-center gap-2">
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        <span>Memuat stan tenant...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      Belum ada stan tenant yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-[#fafafa] transition-colors">
                      {/* Name & Logo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[14px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {t.logo ? (
                              <img
                                src={t.logo}
                                alt={t.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              t.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0a0a0a] leading-tight truncate max-w-[200px] sm:max-w-xs">
                              {t.name}
                            </p>
                            {t.description && (
                              <p className="text-xs text-[#737373] truncate max-w-xs mt-0.5">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Stall number */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-[12px] bg-[#f5f5f5] text-xs font-mono font-bold text-[#0a0a0a]">
                          {t.stallNumber}
                        </span>
                      </td>

                      {/* Owner & Account status */}
                      <td className="py-3.5 px-4">
                        {t.owner ? (
                          <div className="space-y-1">
                            <p className="font-medium text-[#0a0a0a] text-xs leading-none">
                              {t.owner.name}
                            </p>
                            <p className="text-[11px] font-mono text-[#737373]">
                              {t.owner.email}
                            </p>
                            <div>
                              {t.owner.status === 'ACTIVE' ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dcfce7] text-[#15803d]">
                                  Aktif
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef9c3] text-[#a16207]">
                                  Menunggu Aktivasi
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#737373] italic">Belum terhubung</span>
                        )}
                      </td>

                      {/* Operating hours */}
                      <td className="py-3.5 px-4 text-xs font-mono text-[#737373] hidden sm:table-cell">
                        {t.openingTime?.slice(0, 5) || '09:00'} -{' '}
                        {t.closingTime?.slice(0, 5) || '21:00'}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 justify-center">
                          <Switch
                            checked={t.isOpen}
                            onChange={() => handleToggleOpen(t.id, t.isOpen)}
                            id={`toggle-${t.id}`}
                          />
                          <Badge variant={t.isOpen ? 'solid' : 'soft'} className="text-[10px]">
                            {t.isOpen ? 'BUKA' : 'TUTUP'}
                          </Badge>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.owner?.status === 'PENDING_ACTIVATION' && (
                            <button
                              type="button"
                              title="Kirim Ulang Email Aktivasi"
                              disabled={resendingId === t.id}
                              onClick={() => handleResendActivation(t)}
                              className="p-1.5 rounded-[12px] text-[#a16207] hover:text-[#713f12] hover:bg-[#fef9c3] transition-colors disabled:opacity-50"
                            >
                              {resendingId === t.id ? (
                                <Icons.Refresh className="w-4 h-4 animate-spin" />
                              ) : (
                                <Icons.Mail className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedForEdit(t)
                              setDialogOpen(true)
                            }}
                            className="h-8 px-2.5 gap-1.5"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Form Dialog */}
      <TenantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedForEdit}
        foodCourtId={foodCourt?.id}
        onSuccess={fetchTenants}
      />
    </InternalLayout>
  )
}
