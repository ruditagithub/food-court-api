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
import { FoodCourtDialog } from '../../components/superadmin/FoodCourtDialog'
import { FoodCourtDetailSheet } from '../../components/superadmin/FoodCourtDetailSheet'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../components/ui/Dialog'
import type { FoodCourt } from '../../types'

export function SuperAdminFoodCourtsPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modals state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState<FoodCourt | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedForDetailId, setSelectedForDetailId] = useState<string | null>(null)

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchFoodCourts = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (search.trim()) params.append('search', search.trim())

      const queryStr = params.toString() ? `?${params.toString()}` : ''
      const res = await apiFetch<{ data: any[] }>(`/api/food-courts${queryStr}`, {
        token: token || undefined,
      })
      setFoodCourts(res.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar food court'
      toastError('Gagal Memuat Data', msg)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, toastError])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFoodCourts()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchFoodCourts])

  const handleDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const token = getToken()
      await apiFetch(`/api/food-courts/${itemToDelete.id}`, {
        method: 'DELETE',
        token: token || undefined,
      })
      toastSuccess('Berhasil Dihapus', `Food court ${itemToDelete.name} telah dihapus.`)
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      fetchFoodCourts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus food court'
      toastError('Gagal Menghapus', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <InternalLayout
      title="Master Food Court"
      subtitle="Kelola dan pantau seluruh lokasi cabang food court platform"
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
          <span className="hidden sm:inline">Daftarkan Cabang Baru</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filter Bar */}
        <Card surface="paper" className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Cari nama atau slug cabang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="ACTIVE">Aktif (ACTIVE)</option>
                <option value="INACTIVE">Nonaktif (INACTIVE)</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Data Table */}
        <Card surface="paper" className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4 font-medium">Cabang Food Court</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Alamat</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Kontak / Manajer</th>
                  <th className="py-3 px-4 font-medium text-center">Stan & Meja</th>
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
                        <span>Memuat daftar cabang...</span>
                      </div>
                    </td>
                  </tr>
                ) : foodCourts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      Tidak ada food court yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  foodCourts.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#fafafa] transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedForDetailId(item.id)
                        setDetailSheetOpen(true)
                      }}
                    >
                      {/* Logo and Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[14px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {item.logo ? (
                              <img
                                src={item.logo}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-[14px]"
                              />
                            ) : (
                              item.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0a0a0a] leading-snug truncate max-w-[200px] sm:max-w-xs">
                              {item.name}
                            </p>
                            <p className="text-[11px] font-mono text-[#737373]">
                              /{item.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4 text-xs text-[#737373] hidden md:table-cell max-w-xs truncate">
                        {item.address || '-'}
                      </td>

                      {/* Contact / Manager */}
                      <td className="py-3.5 px-4 hidden lg:table-cell text-xs">
                        <p className="text-[#0a0a0a] font-medium">
                          {item.manager?.name || 'Tanpa Manajer'}
                        </p>
                        <p className="text-[#737373] text-[11px]">
                          {item.phone || item.manager?.email || '-'}
                        </p>
                      </td>

                      {/* Tenants & Tables Counts */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex gap-1.5">
                          <span className="px-2 py-0.5 rounded-[12px] bg-[#f5f5f5] text-[11px] font-mono text-[#0a0a0a]">
                            {item.tenants?.length || 0} Stan
                          </span>
                          <span className="px-2 py-0.5 rounded-[12px] bg-[#f5f5f5] text-[11px] font-mono text-[#0a0a0a] hidden sm:inline-block">
                            {item.tables?.length || 0} Meja
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={item.status === 'ACTIVE' ? 'solid' : 'soft'}>
                          {item.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Rincian"
                            onClick={() => {
                              setSelectedForDetailId(item.id)
                              setDetailSheetOpen(true)
                            }}
                            className="p-1.5 rounded-[12px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Icons.Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setSelectedForEdit(item)
                              setDialogOpen(true)
                            }}
                            className="p-1.5 rounded-[12px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Icons.Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Hapus"
                            onClick={() => {
                              setItemToDelete({ id: item.id, name: item.name })
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

      {/* Universal Create/Edit Dialog */}
      <FoodCourtDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedForEdit}
        onSuccess={fetchFoodCourts}
      />

      {/* Detail Sheet */}
      <FoodCourtDetailSheet
        foodCourtId={selectedForDetailId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={(item) => {
          setSelectedForEdit(item)
          setDialogOpen(true)
        }}
      />

      {/* Delete Confirmation Alert Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogClose onClick={() => setDeleteConfirmOpen(false)} />
        <DialogHeader>
          <DialogTitle className="text-[#e7000b]">Hapus Cabang Food Court?</DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. Menghapus{' '}
            <strong className="text-[#0a0a0a]">{itemToDelete?.name}</strong> akan menghapus
            seluruh data stan tenant, daftar menu, dan meja makan yang terdaftar di cabang ini.
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
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
          </Button>
        </DialogFooter>
      </Dialog>
    </InternalLayout>
  )
}
