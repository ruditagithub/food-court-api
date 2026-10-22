import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Switch } from '../../components/ui/Switch'
import { Icons } from '../../components/ui/Icons'
import { MenuFormDialog } from '../../components/tenant/MenuFormDialog'
import { CategoryManagerDialog } from '../../components/tenant/CategoryManagerDialog'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../components/ui/Dialog'
import { formatRupiah } from '../../lib/utils'
import type { Menu } from '../../types'

export function TenantMenusPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [tenant, setTenant] = useState<any>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Dialog states
  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState<Menu | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch tenant info and menus
  const fetchTenantAndMenus = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      // 1. Get tenant info
      const tRes = await apiFetch<{ data: any }>('/api/tenants/mine', {
        token: token || undefined,
      })

      if (tRes.data) {
        setTenant(tRes.data)

        // 2. Fetch categories
        try {
          const catRes = await apiFetch<{ data: any[] }>(`/api/menus/categories/${tRes.data.id}`)
          setCategories(catRes.data || [])
        } catch {
          // ignore
        }

        // 3. Fetch menus
        const menuRes = await apiFetch<{ data: Menu[] }>('/api/menus', {
          token: token || undefined,
        })
        setMenus(menuRes.data || [])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat katalog menu'
      toastError('Gagal Memuat Menu', msg)
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchTenantAndMenus()
  }, [fetchTenantAndMenus])

  // Instant Availability Toggle
  const handleToggleAvailable = async (menuId: string, currentStatus: boolean) => {
    setMenus((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, isAvailable: !currentStatus } : m))
    )

    try {
      const token = getToken()
      await apiFetch(`/api/menus/${menuId}`, {
        method: 'PUT',
        token: token || undefined,
        body: { isAvailable: !currentStatus },
      })
      toastSuccess(
        'Ketersediaan Diubah',
        `Menu ditandai sebagai ${!currentStatus ? 'Tersedia' : 'Habis'}.`
      )
    } catch (err: unknown) {
      setMenus((prev) =>
        prev.map((m) => (m.id === menuId ? { ...m, isAvailable: currentStatus } : m))
      )
      const msg = err instanceof Error ? err.message : 'Gagal mengubah ketersediaan'
      toastError('Gagal Mengubah Status', msg)
    }
  }

  // Stock quick adjustment
  const handleAdjustStock = async (menuId: string, delta: number) => {
    const target = menus.find((m) => m.id === menuId)
    if (!target) return
    const newStock = Math.max(0, (target.stock || 0) + delta)

    setMenus((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, stock: newStock } : m))
    )

    try {
      const token = getToken()
      await apiFetch(`/api/menus/${menuId}`, {
        method: 'PUT',
        token: token || undefined,
        body: { stock: newStock },
      })
    } catch {
      setMenus((prev) =>
        prev.map((m) => (m.id === menuId ? { ...m, stock: target.stock } : m))
      )
    }
  }

  // Delete menu
  const handleDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const token = getToken()
      await apiFetch(`/api/menus/${itemToDelete.id}`, {
        method: 'DELETE',
        token: token || undefined,
      })
      toastSuccess('Berhasil Dihapus', `Menu "${itemToDelete.name}" telah dihapus.`)
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      fetchTenantAndMenus()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus menu'
      toastError('Gagal Menghapus', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredMenus = menus.filter((m) => {
    const matchesSearch = search.trim()
      ? m.name.toLowerCase().includes(search.toLowerCase())
      : true
    const matchesCategory = categoryFilter
      ? m.categoryId === categoryFilter
      : true
    return matchesSearch && matchesCategory
  })

  return (
    <InternalLayout
      title="Katalog Menu & Stok Cepat"
      subtitle="Kelola sajian kuliner, sesuaikan stok porsi, dan aktifkan menu harian"
      foodCourtName={tenant?.foodCourt?.name}
      stallNumber={tenant?.stallNumber}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoryDialogOpen(true)}
            className="gap-1.5"
          >
            <Icons.Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Kelola Kategori</span>
            <span className="sm:hidden">Kategori</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedForEdit(null)
              setMenuDialogOpen(true)
            }}
            className="gap-1.5"
          >
            <Icons.Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Menu Baru</span>
            <span className="sm:hidden">Menu</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filter Card */}
        <Card surface="paper" className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Cari nama makanan atau minuman..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            <div className="w-full sm:w-56">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        {/* Menu Items Table */}
        <Card surface="paper" className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4 font-medium">Sajian Kuliner</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Kategori</th>
                  <th className="py-3 px-4 font-medium">Harga</th>
                  <th className="py-3 px-4 font-medium text-center">Stok Porsi</th>
                  <th className="py-3 px-4 font-medium text-center">Tersedia</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      <div className="flex items-center justify-center gap-2">
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        <span>Memuat katalog menu...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMenus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      Belum ada menu yang dibuat. Klik tombol "+ Tambah Menu Baru" di atas.
                    </td>
                  </tr>
                ) : (
                  filteredMenus.map((item) => (
                    <tr key={item.id} className="hover:bg-[#fafafa] transition-colors">
                      {/* Name & Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-[14px] bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-[#e5e5e5]">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Icons.Utensils className="w-5 h-5 text-[#737373]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0a0a0a] leading-tight truncate max-w-[180px] sm:max-w-xs">
                              {item.name}
                            </p>
                            {item.description && (
                              <p className="text-xs text-[#737373] truncate max-w-xs mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <Badge variant="soft" className="text-[11px]">
                          {item.category?.name || 'Tanpa Kategori'}
                        </Badge>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#0a0a0a]">
                        {formatRupiah(item.price)}
                      </td>

                      {/* Stock Adjuster */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-[18px] bg-[#f5f5f5] p-1 border border-[#e5e5e5]">
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(item.id, -1)}
                            className="w-6 h-6 rounded-full bg-white hover:bg-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                            aria-label="Kurangi stok"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs font-bold px-1.5 min-w-[24px] text-center">
                            {item.stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(item.id, 1)}
                            className="w-6 h-6 rounded-full bg-white hover:bg-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                            aria-label="Tambah stok"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Availability Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 justify-center">
                          <Switch
                            checked={item.isAvailable}
                            onChange={() => handleToggleAvailable(item.id, item.isAvailable)}
                            id={`avail-${item.id}`}
                          />
                          <Badge variant={item.isAvailable ? 'solid' : 'soft'} className="text-[10px]">
                            {item.isAvailable ? 'TERSEDIA' : 'HABIS'}
                          </Badge>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Edit Menu"
                            onClick={() => {
                              setSelectedForEdit(item)
                              setMenuDialogOpen(true)
                            }}
                            className="p-1.5 rounded-[12px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Icons.Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Hapus Menu"
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

      {/* Menu Form Dialog */}
      <MenuFormDialog
        open={menuDialogOpen}
        onOpenChange={setMenuDialogOpen}
        initialData={selectedForEdit}
        tenantId={tenant?.id}
        onSuccess={fetchTenantAndMenus}
      />

      {/* Category Manager Dialog */}
      <CategoryManagerDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        tenantId={tenant?.id}
        onCategoriesChanged={fetchTenantAndMenus}
      />

      {/* Delete Confirmation Alert Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogClose onClick={() => setDeleteConfirmOpen(false)} />
        <DialogHeader>
          <DialogTitle className="text-[#e7000b]">Hapus Menu Makanan?</DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. Menu{' '}
            <strong className="text-[#0a0a0a]">{itemToDelete?.name}</strong> akan dihapus dari
            katalog stan Anda dan tidak dapat dipesan lagi oleh pelanggan.
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
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Menu'}
          </Button>
        </DialogFooter>
      </Dialog>
    </InternalLayout>
  )
}
