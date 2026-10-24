import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { TenantFormDialog } from '../../components/admin/TenantFormDialog'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../components/ui/Dialog'
import type { Tenant, FoodCourt } from '../../types'

export function SuperAdminTenantsPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [foodCourts, setFoodCourts] = useState<FoodCourt[]>([])
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Dialog & Delete states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState<Tenant | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch food courts for dropdown filter
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const token = getToken()
        const res = await apiFetch<{ data: FoodCourt[] }>('/api/food-courts', {
          token: token || undefined,
        })
        setFoodCourts(res.data || [])
      } catch (err) {
        console.warn('Failed to load food courts filter list:', err)
      }
    }
    fetchCourts()
  }, [])

  const fetchAllTenants = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const params = new URLSearchParams()
      if (selectedFoodCourtId) params.append('foodCourtId', selectedFoodCourtId)
      if (statusFilter) params.append('isOpen', statusFilter === 'open' ? 'true' : 'false')

      const queryStr = params.toString() ? `?${params.toString()}` : ''
      const res = await apiFetch<{ data: Tenant[] }>(`/api/tenants${queryStr}`, {
        token: token || undefined,
      })
      setTenants(res.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar stan global'
      toastError('Gagal Memuat Data', msg)
    } finally {
      setIsLoading(false)
    }
  }, [selectedFoodCourtId, statusFilter, toastError])

  useEffect(() => {
    fetchAllTenants()
  }, [fetchAllTenants])

  const handleDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const token = getToken()
      await apiFetch(`/api/tenants/${itemToDelete.id}`, {
        method: 'DELETE',
        token: token || undefined,
      })
      toastSuccess('Berhasil Dihapus', `Stan ${itemToDelete.name} telah dihapus permanen.`)
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      fetchAllTenants()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus stan'
      toastError('Gagal Menghapus', msg)
    } finally {
      setIsDeleting(false)
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
      title="Master Tenant Platform"
      subtitle="Pengawasan seluruh gerai kios kuliner lintas seluruh cabang food court"
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
        {/* Filters */}
        <Card surface="paper" className="!p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                placeholder="Cari nama gerai atau nomor stan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            <div>
              <Select
                value={selectedFoodCourtId}
                onChange={(e) => setSelectedFoodCourtId(e.target.value)}
              >
                <option value="">Semua Cabang Food Court</option>
                {foodCourts.map((fc) => (
                  <option key={fc.id} value={fc.id}>
                    {fc.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status Gerai</option>
                <option value="open">Sedang Buka (Open)</option>
                <option value="closed">Sedang Tutup (Closed)</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Global Tenants Table */}
        <Card surface="paper" className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4 font-medium">Gerai Makanan</th>
                  <th className="py-3 px-4 font-medium">Nomor Stan</th>
                  <th className="py-3 px-4 font-medium">Pemilik & Akun</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Jam Buka/Tutup</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      <div className="flex items-center justify-center gap-2">
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        <span>Memuat seluruh tenant...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      Tidak ada tenant yang cocok dengan filter.
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
                            <p className="text-[11px] font-mono text-[#737373] mt-0.5">
                              /{t.slug}
                            </p>
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

                      {/* Jam */}
                      <td className="py-3.5 px-4 text-xs font-mono text-[#737373] hidden sm:table-cell">
                        {t.openingTime?.slice(0, 5) || '09:00'} -{' '}
                        {t.closingTime?.slice(0, 5) || '21:00'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={t.isOpen ? 'solid' : 'soft'}>
                          {t.isOpen ? 'BUKA' : 'TUTUP'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
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

                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setSelectedForEdit(t)
                              setDialogOpen(true)
                            }}
                            className="p-1.5 rounded-[12px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Icons.Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Hapus Stan"
                            onClick={() => {
                              setItemToDelete({ id: t.id, name: t.name })
                              setDeleteConfirmOpen(true)
                            }}
                            className="p-1.5 rounded-[12px] text-[#737373] hover:text-[#e7000b] hover:bg-[#fff0f0] transition-colors"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
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

      {/* Tenant Form Dialog */}
      <TenantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedForEdit}
        foodCourtId={selectedFoodCourtId || undefined}
        onSuccess={fetchAllTenants}
      />

      {/* Danger Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogClose onClick={() => setDeleteConfirmOpen(false)} />
        <DialogHeader>
          <DialogTitle className="text-[#e7000b]">Hapus Stan Tenant?</DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. Menghapus{' '}
            <strong className="text-[#0a0a0a]">{itemToDelete?.name}</strong> akan menghapus
            seluruh daftar menu dan data pesanan dapur stan ini.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleDelete}
            disabled={isDeleting}
            className="!bg-[#e7000b] hover:!bg-[#c50009] !text-white"
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Stan'}
          </Button>
        </DialogFooter>
      </Dialog>
    </InternalLayout>
  )
}
