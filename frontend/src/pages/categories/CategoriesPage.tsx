import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/Dialog'
import {
  Layers,
  Store,
  RefreshCw,
  Trash2,
  Search,
  Plus,
  Pencil,
  UtensilsCrossed,
  FolderCheck,
  FolderX,
} from 'lucide-react'

interface CategoryItem {
  id: string
  tenantId: string
  name: string
  createdAt?: string
  updatedAt?: string
  menus?: Array<{ id: string; name: string }>
  tenant?: {
    id: string
    name: string
    stallNumber: string
    foodCourtId: string
    foodCourt?: {
      id: string
      name: string
    }
  }
}

export function CategoriesPage() {
  const { user } = useAuth()
  const role = user?.role
  const isSuperAdmin = role === 'admin'
  const isFoodCourtManager = role === 'admin-food-court'
  const isTenant = role === 'tenant'
  const { error: toastError, success: toastSuccess } = useToast()

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')

  // Form Modal State (Create / Edit)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form Fields
  const [formFoodCourtId, setFormFoodCourtId] = useState('')
  const [formTenantId, setFormTenantId] = useState('')
  const [formName, setFormName] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete Modal State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load Categories, Tenants, Food Courts
  const loadData = useCallback(async () => {
    setIsLoading(true)
    const token = getToken()
    const headers = { token: token || undefined }

    try {
      const [catsRes, tenantsRes, fcRes] = await Promise.allSettled([
        apiFetch<{ data: CategoryItem[] }>('/api/menus/categories', headers),
        apiFetch<{ data: any[] }>('/api/tenants', headers),
        apiFetch<{ data: any[] }>('/api/food-courts', headers),
      ])

      if (catsRes.status === 'fulfilled' && catsRes.value?.data) {
        setCategories(catsRes.value.data)
      }
      if (tenantsRes.status === 'fulfilled' && tenantsRes.value?.data) {
        setTenants(tenantsRes.value.data)
      }
      if (fcRes.status === 'fulfilled' && fcRes.value?.data) {
        setFoodCourts(fcRes.value.data)
        if (isFoodCourtManager && fcRes.value.data.length > 0) {
          setSelectedFoodCourtId(fcRes.value.data[0].id)
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat kategori:', err)
      toastError(err?.message || 'Gagal memuat daftar kategori menu')
    } finally {
      setIsLoading(false)
    }
  }, [toastError, isFoodCourtManager])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered tenants by selected food court
  const availableTenants = useMemo(() => {
    if (!selectedFoodCourtId) return tenants
    return tenants.filter((t) => t.foodCourtId === selectedFoodCourtId)
  }, [tenants, selectedFoodCourtId])

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // 1. Search text (Category Name or Tenant Name)
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = cat.name?.toLowerCase().includes(query)
        const matchTenant = cat.tenant?.name?.toLowerCase().includes(query)
        const matchStall = cat.tenant?.stallNumber?.toLowerCase().includes(query)
        if (!matchName && !matchTenant && !matchStall) return false
      }

      // 2. Filter by Food Court
      if (selectedFoodCourtId) {
        const tenantOfCat = tenants.find((t) => t.id === cat.tenantId)
        if (tenantOfCat && tenantOfCat.foodCourtId !== selectedFoodCourtId) {
          return false
        }
      }

      // 3. Filter by Tenant
      if (selectedTenantId && cat.tenantId !== selectedTenantId) {
        return false
      }

      return true
    })
  }, [categories, search, selectedFoodCourtId, selectedTenantId, tenants])

  // Metrics
  const totalCategoriesCount = categories.length
  const filledCategoriesCount = categories.filter((c) => (c.menus?.length || 0) > 0).length
  const emptyCategoriesCount = totalCategoriesCount - filledCategoriesCount
  const uniqueTenantsCount = new Set(categories.map((c) => c.tenantId)).size

  // Available tenants for modal form based on formFoodCourtId
  const formAvailableTenants = useMemo(() => {
    if (isTenant) {
      return tenants // Tenant only owns their kiosk
    }
    if (!formFoodCourtId) return tenants
    return tenants.filter((t) => t.foodCourtId === formFoodCourtId)
  }, [tenants, formFoodCourtId, isTenant])

  // Open Create Dialog
  const handleOpenCreateDialog = () => {
    setEditingCategory(null)
    const initialFcId = selectedFoodCourtId || (foodCourts[0]?.id || '')
    setFormFoodCourtId(initialFcId)

    const initialTenants = tenants.filter((t) => !initialFcId || t.foodCourtId === initialFcId)
    const initialTenantId = selectedTenantId || (initialTenants[0]?.id || '')
    setFormTenantId(initialTenantId)

    setFormName('')
    setFormErrors({})
    setFormDialogOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEditDialog = (item: CategoryItem) => {
    setEditingCategory(item)
    const tenantOfCat = tenants.find((t) => t.id === item.tenantId)
    setFormFoodCourtId(tenantOfCat?.foodCourtId || '')
    setFormTenantId(item.tenantId)
    setFormName(item.name || '')
    setFormErrors({})
    setFormDialogOpen(true)
  }

  // Handle Submit Form (Create / Edit)
  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault()

    const errs: Record<string, string> = {}
    if (!formTenantId && !isTenant) {
      errs.tenantId = 'Stan tenant wajib dipilih'
    }
    if (!formName.trim() || formName.trim().length < 2) {
      errs.name = 'Nama kategori minimal 2 karakter'
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    setIsSaving(true)
    try {
      const token = getToken()

      if (editingCategory) {
        // Update existing category
        await apiFetch(`/api/menus/categories/${editingCategory.id}`, {
          method: 'PUT',
          token: token || undefined,
          body: {
            name: formName.trim(),
          },
        })
        toastSuccess(`Kategori "${formName}" berhasil diperbarui!`)
      } else {
        // Create new category
        const effectiveTenantId = isTenant ? (tenants[0]?.id || formTenantId) : formTenantId
        await apiFetch('/api/menus/categories', {
          method: 'POST',
          token: token || undefined,
          body: {
            tenantId: effectiveTenantId,
            name: formName.trim(),
          },
        })
        toastSuccess(`Kategori "${formName}" berhasil dibuat!`)
      }

      setFormDialogOpen(false)
      setEditingCategory(null)
      await loadData()
    } catch (err: any) {
      toastError(err?.message || 'Gagal menyimpan kategori.')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Delete Category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return
    setIsDeleting(true)

    try {
      const token = getToken()
      await apiFetch(`/api/menus/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        token: token || undefined,
      })

      setCategories((prev) => prev.filter((item) => item.id !== categoryToDelete.id))
      toastSuccess(`Kategori "${categoryToDelete.name}" berhasil dihapus. Menu terkait dialihkan ke Tanpa Kategori.`)
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (err: any) {
      toastError(err?.message || 'Gagal menghapus kategori.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <InternalLayout
      title={
        isSuperAdmin
          ? 'Manajemen Kategori Menu Global'
          : isFoodCourtManager
          ? 'Kategori Menu Cabang'
          : 'Kategori Menu Gerai'
      }
      subtitle={
        isSuperAdmin
          ? 'Pusat pengaturan pengelompokan menu makanan & minuman lintas stan dan cabang food court'
          : isFoodCourtManager
          ? 'Pengawasan dan pengaturan kategori sajian menu stan kuliner di cabang Anda'
          : 'Atur pengelompokan menu gerai Anda (misal: Makanan Utama, Camilan, Minuman Segar, Paket Hemat)'
      }
      foodCourtName={isFoodCourtManager ? (foodCourts?.[0]?.name ?? 'Amici Food Court Grand City') : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateDialog}
            className="gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Stat 1 */}
          <div className="p-5 rounded-[26px] bg-gradient-to-br from-[#0a0a0a] via-[#171717] to-[#262626] text-white shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/90">Total Kategori</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-black">{totalCategoriesCount} Kategori</div>
              <div className="text-[11px] text-white/80 mt-1 font-medium">
                Terdaftar di sistem katalog
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Kategori Terisi Menu</span>
              <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#10b981]">
                <FolderCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold text-[#0a0a0a]">
                {filledCategoriesCount} Kategori
              </div>
              <div className="text-[11px] text-[#10b981] mt-1 font-medium">
                Memiliki sajian aktif
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Kategori Kosong</span>
              <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#e7000b]">
                <FolderX className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold text-[#0a0a0a]">
                {emptyCategoriesCount} Kategori
              </div>
              <div className="text-[11px] text-[#737373] mt-1 font-medium">
                Belum dihubungkan ke menu
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Stan Tenant Mitra</span>
              <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                <Store className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold text-[#0a0a0a]">
                {uniqueTenantsCount || (isTenant ? 1 : tenants.length)} Stan Kios
              </div>
              <div className="text-[11px] text-[#737373] mt-1 font-medium">
                Memiliki kategori sajian
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar Card */}
        <Card surface="paper" className="!p-4">
          <div className={`grid grid-cols-1 gap-3 ${isSuperAdmin ? 'sm:grid-cols-3' : isFoodCourtManager ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Cari nama kategori atau stan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
              <Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            {/* Cabang Filter (Super Admin only) */}
            {isSuperAdmin && (
              <div>
                <Select
                  value={selectedFoodCourtId}
                  onChange={(e) => {
                    setSelectedFoodCourtId(e.target.value)
                    setSelectedTenantId('')
                  }}
                  className="text-xs"
                >
                  <option value="">Semua Cabang Food Court</option>
                  {foodCourts.map((fc) => (
                    <option key={fc.id} value={fc.id}>
                      {fc.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Tenant Filter (Super Admin & Admin Food Court) */}
            {!isTenant && (
              <div>
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="text-xs"
                >
                  <option value="">Semua Stan Tenant</option>
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.stallNumber} - {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Reset Filters Shortcut */}
          {(search || (!isFoodCourtManager && selectedFoodCourtId) || selectedTenantId) && (
            <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-xs text-[#737373]">
              <span>
                Menampilkan <strong>{filteredCategories.length}</strong> dari <strong>{categories.length}</strong> kategori
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  if (!isFoodCourtManager) setSelectedFoodCourtId('')
                  setSelectedTenantId('')
                }}
                className="text-xs text-[#0a0a0a] hover:underline font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          )}
        </Card>

        {/* Categories Data Table Card */}
        <Card surface="paper" className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[10px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4 font-medium">Nama Kategori</th>
                  {!isTenant && <th className="py-3 px-4 font-medium">Stan & Cabang</th>}
                  <th className="py-3 px-4 font-medium text-center">Jumlah Menu</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f5]">
                {isLoading ? (
                  <tr>
                    <td colSpan={isTenant ? 3 : 4} className="py-12 text-center text-[#737373]">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#10b981]" />
                        <span>Memuat data kategori menu...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={isTenant ? 3 : 4} className="py-12 text-center text-[#737373]">
                      Belum ada kategori menu yang cocok. Klik tombol <strong>+ Tambah Kategori</strong> untuk membuat kategori baru.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((item) => {
                    const tenantInfo = item.tenant || tenants.find((t) => t.id === item.tenantId)
                    const foodCourtInfo = foodCourts.find((fc) => fc.id === tenantInfo?.foodCourtId)
                    const menuCount = item.menus?.length || 0

                    return (
                      <tr key={item.id} className="hover:bg-[#fafafa] transition-colors group">
                        {/* Name and Icon */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[12px] bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] font-bold shrink-0">
                              <Layers className="w-4 h-4 text-[#0a0a0a]" />
                            </div>
                            <div className="font-bold text-[#0a0a0a] text-xs">
                              {item.name}
                            </div>
                          </div>
                        </td>

                        {/* Tenant and Food Court */}
                        {!isTenant && (
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#0a0a0a] truncate max-w-[160px]">
                                {tenantInfo?.name || 'Stan Mitra'}
                              </span>
                              <span className="text-[10px] font-mono text-[#737373]">
                                {tenantInfo?.stallNumber || 'STAN-01'} •{' '}
                                {foodCourtInfo?.name || 'Sentra Cabang'}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Menus Count & Link */}
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            to={isTenant ? `/app/tenant/menus` : `/app/super-admin/menus`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:opacity-80 ${
                              menuCount > 0
                                ? 'bg-[#dcfce7] text-[#166534]'
                                : 'bg-[#f5f5f5] text-[#737373]'
                            }`}
                            title="Buka katalog menu terkait"
                          >
                            <UtensilsCrossed className="w-3 h-3" />
                            <span>{menuCount} Sajian</span>
                          </Link>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDialog(item)}
                              className="p-1.5 rounded-[10px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors cursor-pointer"
                              title="Edit nama kategori"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryToDelete(item)
                                setDeleteDialogOpen(true)
                              }}
                              className="p-1.5 rounded-[10px] text-[#737373] hover:text-[#e7000b] hover:bg-[#fee2e2] transition-colors cursor-pointer"
                              title="Hapus kategori dari sistem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create & Edit Category Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogClose onClick={() => setFormDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Edit Kategori Menu' : 'Tambah Kategori Menu Baru'}
          </DialogTitle>
          <DialogDescription>
            {editingCategory
              ? `Perbarui nama atau urutan tampilan kategori "${editingCategory.name}".`
              : 'Daftarkan grup kategori sajian kuliner baru untuk stan tenant.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* Cabang & Tenant Selection (Only for Super Admin / Food Court Manager, locked in edit) */}
          {!isTenant && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cabang Food Court */}
              <div>
                <Label htmlFor="form-foodcourt" required>
                  Cabang Food Court
                </Label>
                <Select
                  id="form-foodcourt"
                  value={formFoodCourtId}
                  onChange={(e) => {
                    setFormFoodCourtId(e.target.value)
                    const newTenants = tenants.filter(
                      (t) => !e.target.value || t.foodCourtId === e.target.value
                    )
                    setFormTenantId(newTenants[0]?.id || '')
                  }}
                  disabled={isFoodCourtManager || !!editingCategory}
                  className="text-xs"
                >
                  {!isFoodCourtManager && <option value="">Pilih Cabang Food Court</option>}
                  {foodCourts.map((fc) => (
                    <option key={fc.id} value={fc.id}>
                      {fc.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Stan Tenant */}
              <div>
                <Label htmlFor="form-tenant" required>
                  Stan Tenant
                </Label>
                <Select
                  id="form-tenant"
                  value={formTenantId}
                  onChange={(e) => setFormTenantId(e.target.value)}
                  disabled={!!editingCategory}
                  error={!!formErrors.tenantId}
                  helperText={formErrors.tenantId}
                  className="text-xs"
                >
                  <option value="">Pilih Stan Tenant</option>
                  {formAvailableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.stallNumber} - {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {/* Category Name */}
          <div>
            <Label htmlFor="form-name" required>
              Nama Kategori
            </Label>
            <Input
              id="form-name"
              placeholder="Contoh: Makanan Utama, Camilan Gurih, Minuman Dingin"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value)
                if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }))
              }}
              error={!!formErrors.name}
              helperText={formErrors.name}
              className="text-sm"
              required
            />
          </div>


          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setFormDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingCategory ? 'Simpan Perubahan' : 'Buat Kategori'}</span>
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogClose onClick={() => setDeleteDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Konfirmasi Hapus Kategori</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus kategori &quot;{categoryToDelete?.name}&quot;?
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 rounded-[16px] bg-[#fef2f2] border border-[#fecaca] text-xs text-[#991b1b] my-2">
          <strong>Perhatian:</strong> Menghapus kategori ini <strong>tidak akan menghapus</strong> menu hidangan di dalamnya. Seluruh menu yang terhubung akan dialihkan menjadi berstatus <em>Tanpa Kategori</em> di katalog meja.
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={() => setDeleteDialogOpen(false)}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDeleteCategory}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {isDeleting && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>Hapus Kategori</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </InternalLayout>
  )
}
