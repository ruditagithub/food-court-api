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
import { formatRupiah, formatDate } from '../../lib/utils'
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
  LayoutGrid,
  List,
  Eye,
  Clock,
  ExternalLink,
} from 'lucide-react'

export interface CategoryMenuItem {
  id: string
  name: string
  price?: number
  description?: string | null
  imageUrl?: string | null
  status?: string
  isAvailable?: boolean
  preparationTime?: number
  stock?: number
}

interface CategoryItem {
  id: string
  tenantId: string
  name: string
  createdAt?: string
  updatedAt?: string
  menus?: CategoryMenuItem[]
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

  // Detail Modal State (Kartu / Detail Makanan)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<CategoryItem | null>(null)
  const [detailSearch, setDetailSearch] = useState('')

  // View Mode: 'grid' (Kartu Kategori) vs 'table' (Tabel Ringkas)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const handleOpenDetailDialog = (cat: CategoryItem) => {
    setSelectedCategoryForDetail(cat)
    setDetailSearch('')
    setDetailDialogOpen(true)
  }

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

        {/* View Mode Toggle Bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#737373]">
            Menampilkan <strong>{filteredCategories.length}</strong> kategori
          </span>
          <div className="flex items-center bg-[#f5f5f5] p-0.5 rounded-[12px] border border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0a0a0a] shadow-xs'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
              title="Tampilan Kartu Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#0a0a0a] shadow-xs'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
              title="Tampilan Tabel Data"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>
        </div>

        {/* Content: Loading State, Empty State, or Categories */}
        {isLoading ? (
          <Card surface="paper" className="!p-12 text-center text-[#737373]">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#10b981]" />
              <span className="text-xs">Memuat data kategori menu...</span>
            </div>
          </Card>
        ) : filteredCategories.length === 0 ? (
          <Card surface="paper" className="!p-12 text-center text-[#737373]">
            <Layers className="w-10 h-10 mx-auto text-[#a3a3a3] mb-3" />
            <p className="text-sm font-semibold text-[#0a0a0a]">Belum ada kategori menu yang cocok.</p>
            <p className="text-xs text-[#737373] mt-1">
              Klik tombol <strong>+ Tambah Kategori</strong> untuk membuat kategori baru.
            </p>
          </Card>
        ) : viewMode === 'grid' ? (
          /* ==========================================
           * 1. GRID OF CATEGORY CARDS (CLICKABLE POPUP)
           * ========================================== */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredCategories.map((item) => {
              const tenantInfo = item.tenant || tenants.find((t) => t.id === item.tenantId)
              const foodCourtInfo = foodCourts.find((fc) => fc.id === tenantInfo?.foodCourtId)
              const menuCount = item.menus?.length || 0

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetailDialog(item)}
                  className="p-4.5 rounded-[22px] bg-white border border-[#e5e5e5] hover:border-[#0a0a0a] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  title="Klik untuk melihat detail kategori & daftar makanan"
                >
                  <div>
                    {/* Top Header: Icon & Action buttons */}
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-[14px] bg-[#f5f5f5] group-hover:bg-[#0a0a0a] group-hover:text-white transition-colors flex items-center justify-center text-[#0a0a0a] shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>

                      {/* Action buttons (stop propagation so card click is not triggered) */}
                      <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditDialog(item)
                          }}
                          className="p-1.5 rounded-[8px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors cursor-pointer"
                          title="Edit nama kategori"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCategoryToDelete(item)
                            setDeleteDialogOpen(true)
                          }}
                          className="p-1.5 rounded-[8px] text-[#737373] hover:text-[#e7000b] hover:bg-[#fee2e2] transition-colors cursor-pointer"
                          title="Hapus kategori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Category Title */}
                    <h3 className="font-bold text-sm text-[#0a0a0a] mt-3 group-hover:text-[#10b981] transition-colors line-clamp-1">
                      {item.name}
                    </h3>

                    {/* Tenant & Food Court Info */}
                    {!isTenant && (
                      <p className="text-[11px] text-[#737373] font-medium mt-0.5 truncate">
                        {tenantInfo?.stallNumber || 'STAN'} • {tenantInfo?.name || 'Stan Mitra'}
                        {foodCourtInfo?.name && ` (${foodCourtInfo.name.split(' ').slice(0, 3).join(' ')})`}
                      </p>
                    )}

                    {/* Menu Preview / Sample Dishes */}
                    <div className="mt-3.5 pt-3 border-t border-[#f5f5f5]">
                      {menuCount > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-full text-[10px]">
                              {menuCount} Menu Sajian
                            </span>
                            <span className="text-[10px] text-[#737373] flex items-center gap-1 font-medium">
                              <Eye className="w-3 h-3 text-[#10b981]" />
                              Detail
                            </span>
                          </div>

                          {/* Preview first 2 dishes */}
                          <p className="text-[11px] text-[#525252] line-clamp-2 leading-relaxed">
                            {item.menus?.slice(0, 2).map((m) => m.name).join(', ')}
                            {menuCount > 2 && (
                              <span className="text-[#a3a3a3]"> +{menuCount - 2} lainnya</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-[#737373]">
                          <span className="bg-[#f5f5f5] text-[#737373] px-2 py-0.5 rounded-full text-[10px] font-medium">
                            0 Menu
                          </span>
                          <span className="text-[10px] text-[#a3a3a3]">Belum ada menu</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-3.5 pt-2 border-t border-[#f5f5f5] text-[11px] font-semibold text-[#737373] group-hover:text-[#0a0a0a] flex items-center justify-between transition-colors">
                    <span>Lihat daftar makanan</span>
                    <span className="text-xs">&rarr;</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ==========================================
           * 2. TABLE VIEW (ROW CLICKABLE POPUP)
           * ========================================== */
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
                  {filteredCategories.map((item) => {
                    const tenantInfo = item.tenant || tenants.find((t) => t.id === item.tenantId)
                    const foodCourtInfo = foodCourts.find((fc) => fc.id === tenantInfo?.foodCourtId)
                    const menuCount = item.menus?.length || 0

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenDetailDialog(item)}
                        className="hover:bg-[#fafafa] transition-colors group cursor-pointer"
                        title="Klik untuk melihat detail kategori & daftar makanan"
                      >
                        {/* Name and Icon */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[12px] bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] font-bold shrink-0 group-hover:border-[#0a0a0a] transition-colors">
                              <Layers className="w-4 h-4 text-[#0a0a0a]" />
                            </div>
                            <div className="font-bold text-[#0a0a0a] text-xs group-hover:text-[#10b981] transition-colors">
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

                        {/* Menus Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              menuCount > 0
                                ? 'bg-[#dcfce7] text-[#166534]'
                                : 'bg-[#f5f5f5] text-[#737373]'
                            }`}
                          >
                            <UtensilsCrossed className="w-3 h-3" />
                            <span>{menuCount} Sajian</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenDetailDialog(item)
                              }}
                              className="p-1.5 rounded-[10px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors cursor-pointer"
                              title="Lihat detail kategori & daftar makanan"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenEditDialog(item)
                              }}
                              className="p-1.5 rounded-[10px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors cursor-pointer"
                              title="Edit nama kategori"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
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
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
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

      {/* Category Detail & Menus Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} size="2xl">
        <DialogClose onClick={() => setDetailDialogOpen(false)} />
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] shrink-0">
              <Layers className="w-5 h-5 text-[#0a0a0a]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#0a0a0a]">
                {selectedCategoryForDetail?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#737373]">
                {(() => {
                  const tenantInfo =
                    selectedCategoryForDetail?.tenant ||
                    tenants.find((t) => t.id === selectedCategoryForDetail?.tenantId)
                  const fcInfo = foodCourts.find((fc) => fc.id === tenantInfo?.foodCourtId)
                  return (
                    <span>
                      <strong className="text-[#0a0a0a] font-semibold">
                        {tenantInfo?.name || 'Stan Mitra'}
                      </strong>{' '}
                      ({tenantInfo?.stallNumber || 'STAN-01'})
                      {fcInfo?.name ? ` • ${fcInfo.name}` : ''}
                    </span>
                  )
                })()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Header Bar within Modal: Stats & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#166534]">
                {selectedCategoryForDetail?.menus?.length || 0} Sajian Terdaftar
              </span>
              {selectedCategoryForDetail?.createdAt && (
                <span className="text-[11px] text-[#737373]">
                  Dibuat: {formatDate(selectedCategoryForDetail.createdAt)}
                </span>
              )}
            </div>

            {(selectedCategoryForDetail?.menus?.length || 0) > 4 && (
              <div className="relative w-full sm:w-60">
                <Input
                  placeholder="Cari makanan di kategori ini..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="pl-8 py-1.5 text-xs h-8"
                />
                <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Menus List Grid */}
          <div
            data-lenis-prevent
            onWheel={(e) => e.stopPropagation()}
            className="max-h-[50vh] overflow-y-auto overscroll-contain space-y-2 pr-1"
          >
            {(() => {
              const allCategoryMenus = selectedCategoryForDetail?.menus || []
              const filteredMenus = allCategoryMenus.filter((m) => {
                if (!detailSearch.trim()) return true
                const query = detailSearch.toLowerCase()
                return (
                  m.name.toLowerCase().includes(query) ||
                  (m.description && m.description.toLowerCase().includes(query))
                )
              })

              if (filteredMenus.length === 0) {
                return (
                  <div className="py-10 text-center text-[#737373] bg-[#fafafa] rounded-[18px] border border-dashed border-[#e5e5e5] p-6">
                    <UtensilsCrossed className="w-8 h-8 mx-auto text-[#a3a3a3] mb-2" />
                    <p className="text-xs font-semibold text-[#0a0a0a]">
                      {detailSearch.trim()
                        ? `Tidak ada hidangan yang cocok dengan "${detailSearch}".`
                        : 'Belum ada menu sajian dalam kategori ini.'}
                    </p>
                    <p className="text-[11px] text-[#737373] mt-1">
                      Menu dapat dihubungkan ke kategori ini melalui menu manajemen katalog.
                    </p>
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredMenus.map((m) => {
                    const isAvailable = m.status === 'AVAILABLE' || m.isAvailable !== false
                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-[16px] bg-[#ffffff] border border-[#e5e5e5] hover:border-[#a3a3a3] transition-all flex gap-3 items-start"
                      >
                        {/* Image Thumbnail */}
                        <div className="w-13 h-13 rounded-[12px] bg-[#f5f5f5] border border-[#e5e5e5] overflow-hidden shrink-0 flex items-center justify-center text-[#a3a3a3]">
                          {m.imageUrl ? (
                            <img
                              src={m.imageUrl}
                              alt={m.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <UtensilsCrossed className="w-5 h-5 text-[#a3a3a3]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-xs text-[#0a0a0a] truncate" title={m.name}>
                              {m.name}
                            </h4>
                            <span
                              className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                                isAvailable
                                  ? 'bg-[#dcfce7] text-[#166534]'
                                  : 'bg-[#fee2e2] text-[#991b1b]'
                              }`}
                            >
                              {isAvailable ? 'Ready' : 'Habis'}
                            </span>
                          </div>

                          {m.description && (
                            <p className="text-[10px] text-[#737373] line-clamp-1 mt-0.5">
                              {m.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#f5f5f5]">
                            <span className="font-bold text-xs text-[#0a0a0a]">
                              {typeof m.price === 'number' ? formatRupiah(m.price) : '-'}
                            </span>
                            {typeof m.preparationTime === 'number' && m.preparationTime > 0 && (
                              <span className="text-[10px] text-[#737373] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#a3a3a3]" />
                                {m.preparationTime} mnt
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full pt-2">
          <Link
            to={isTenant ? `/app/tenant/menus` : `/app/super-admin/menus`}
            className="inline-flex items-center gap-1.5 text-xs text-[#10b981] hover:underline font-semibold"
          >
            <span>Buka Manajemen Menu</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            {selectedCategoryForDetail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const target = selectedCategoryForDetail
                  setDetailDialogOpen(false)
                  handleOpenEditDialog(target)
                }}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Kategori</span>
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setDetailDialogOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </InternalLayout>
  )
}
