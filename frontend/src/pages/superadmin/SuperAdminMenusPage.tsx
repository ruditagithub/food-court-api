import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { Switch } from '../../components/ui/Switch'
import { ImageUploadInput } from '../../components/ui/ImageUploadInput'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/Dialog'
import { formatRupiah } from '../../lib/utils'
import {
  UtensilsCrossed,
  Store,
  RefreshCw,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  FolderPlus,
} from 'lucide-react'

interface MenuItem {
  id: string
  tenantId: string
  categoryId?: string | null
  name: string
  description?: string | null
  price: number
  stock: number
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'HIDDEN'
  isAvailable?: boolean
  imageUrl?: string | null
  category?: {
    id: string
    name: string
  }
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

interface MenuCategory {
  id: string
  tenantId: string
  name: string
}

export function SuperAdminMenusPage() {
  const { user } = useAuth()
  const isFoodCourtManager = user?.role === 'admin-food-court'
  const { error: toastError, success: toastSuccess } = useToast()

  const [menus, setMenus] = useState<MenuItem[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [tenantCategories, setTenantCategories] = useState<MenuCategory[]>([])
  const [isCategoryFilterLoading, setIsCategoryFilterLoading] = useState(false)
  const [availabilityFilter, setAvailabilityFilter] = useState('')

  // Form dialog state (Create & Edit)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form inputs
  const [formFoodCourtId, setFormFoodCourtId] = useState('')
  const [formTenantId, setFormTenantId] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formStock, setFormStock] = useState('50')
  const [formDescription, setFormDescription] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formIsAvailable, setFormIsAvailable] = useState(true)
  const [formCategories, setFormCategories] = useState<MenuCategory[]>([])
  const [isFormCategoryLoading, setIsFormCategoryLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Quick category creation inside modal
  const [showQuickCategoryInput, setShowQuickCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [menuToDelete, setMenuToDelete] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load all menus, tenants, and food courts
  const loadData = useCallback(async () => {
    setIsLoading(true)
    const token = getToken()
    const headers = { token: token || undefined }

    try {
      const [menusRes, tenantsRes, fcRes] = await Promise.allSettled([
        apiFetch<{ data: MenuItem[] }>('/api/menus', headers),
        apiFetch<{ data: any[] }>('/api/tenants', headers),
        apiFetch<{ data: any[] }>('/api/food-courts', headers),
      ])

      if (menusRes.status === 'fulfilled' && menusRes.value?.data) {
        setMenus(menusRes.value.data)
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
      console.warn('Error fetching global menu catalog:', err)
      toastError(err?.message || 'Gagal memuat katalog menu global')
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

  // Fetch categories when selectedTenantId in filter toolbar changes
  useEffect(() => {
    if (!selectedTenantId) {
      setTenantCategories([])
      setSelectedCategoryId('')
      return
    }

    let isMounted = true
    setIsCategoryFilterLoading(true)
    const token = getToken()

    apiFetch<{ data: MenuCategory[] }>(`/api/menus/categories/${selectedTenantId}`, {
      token: token || undefined,
    })
      .then((res) => {
        if (isMounted && res?.data) {
          setTenantCategories(res.data)
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat kategori tenant:', err)
        if (isMounted) setTenantCategories([])
      })
      .finally(() => {
        if (isMounted) setIsCategoryFilterLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedTenantId])

  // Filtered menus
  const filteredMenus = useMemo(() => {
    return menus.filter((m) => {
      // 1. Search text
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = m.name?.toLowerCase().includes(query)
        const matchDesc = m.description?.toLowerCase().includes(query)
        const matchTenant = m.tenant?.name?.toLowerCase().includes(query)
        if (!matchName && !matchDesc && !matchTenant) return false
      }

      // 2. Filter by Food Court
      if (selectedFoodCourtId) {
        const tenantOfMenu = tenants.find((t) => t.id === m.tenantId)
        if (tenantOfMenu && tenantOfMenu.foodCourtId !== selectedFoodCourtId) {
          return false
        }
      }

      // 3. Filter by Tenant
      if (selectedTenantId && m.tenantId !== selectedTenantId) {
        return false
      }

      // 4. Filter by Category (/api/menus/categories/{tenantId})
      if (selectedCategoryId) {
        if (m.categoryId !== selectedCategoryId) {
          return false
        }
      }

      // 5. Filter by Availability
      if (availabilityFilter === 'available') {
        if (m.status !== 'AVAILABLE' && m.isAvailable !== true) return false
      } else if (availabilityFilter === 'out_of_stock') {
        if (m.status === 'AVAILABLE' || m.isAvailable === true) return false
      }

      return true
    })
  }, [menus, search, selectedFoodCourtId, selectedTenantId, selectedCategoryId, availabilityFilter, tenants])

  // Metrics
  const totalMenusCount = menus.length
  const availableCount = menus.filter(
    (m) => m.status === 'AVAILABLE' || m.isAvailable === true
  ).length
  const outOfStockCount = totalMenusCount - availableCount
  const totalTenantsCount = new Set(menus.map((m) => m.tenantId)).size

  // Load categories for form dialog when formTenantId changes
  useEffect(() => {
    if (!formTenantId || !formDialogOpen) {
      setFormCategories([])
      return
    }

    let isMounted = true
    setIsFormCategoryLoading(true)
    const token = getToken()

    apiFetch<{ data: MenuCategory[] }>(`/api/menus/categories/${formTenantId}`, {
      token: token || undefined,
    })
      .then((res) => {
        if (isMounted && res?.data) {
          setFormCategories(res.data)
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat kategori modal:', err)
        if (isMounted) setFormCategories([])
      })
      .finally(() => {
        if (isMounted) setIsFormCategoryLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [formTenantId, formDialogOpen])

  // Available tenants for modal form based on formFoodCourtId
  const formAvailableTenants = useMemo(() => {
    if (!formFoodCourtId) return tenants
    return tenants.filter((t) => t.foodCourtId === formFoodCourtId)
  }, [tenants, formFoodCourtId])

  // Open Create Menu Dialog
  const handleOpenCreateDialog = () => {
    setEditingMenu(null)
    const initialFcId = selectedFoodCourtId || (foodCourts[0]?.id || '')
    setFormFoodCourtId(initialFcId)

    const initialTenants = tenants.filter((t) => !initialFcId || t.foodCourtId === initialFcId)
    const initialTenantId = selectedTenantId || (initialTenants[0]?.id || '')
    setFormTenantId(initialTenantId)

    setFormCategoryId('')
    setFormName('')
    setFormPrice('')
    setFormStock('50')
    setFormDescription('')
    setFormImageUrl('')
    setFormIsAvailable(true)
    setFormErrors({})
    setShowQuickCategoryInput(false)
    setNewCategoryName('')
    setFormDialogOpen(true)
  }

  // Open Edit Menu Dialog
  const handleOpenEditDialog = (item: MenuItem) => {
    setEditingMenu(item)
    const tenantOfMenu = tenants.find((t) => t.id === item.tenantId)
    setFormFoodCourtId(tenantOfMenu?.foodCourtId || '')
    setFormTenantId(item.tenantId)
    setFormCategoryId(item.categoryId || '')
    setFormName(item.name || '')
    setFormPrice(String(item.price || 0))
    setFormStock(String(item.stock ?? 50))
    setFormDescription(item.description || '')
    setFormImageUrl(item.imageUrl || '')
    setFormIsAvailable(item.isAvailable ?? (item.status === 'AVAILABLE'))
    setFormErrors({})
    setShowQuickCategoryInput(false)
    setNewCategoryName('')
    setFormDialogOpen(true)
  }

  // Handle Quick Create Category inside Modal
  const handleCreateCategory = async () => {
    if (!formTenantId) {
      toastError('Pilih tenant stan terlebih dahulu sebelum membuat kategori.')
      return
    }
    const trimmed = newCategoryName.trim()
    if (!trimmed || trimmed.length < 2) {
      toastError('Nama kategori minimal 2 karakter.')
      return
    }

    setIsCreatingCategory(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: MenuCategory }>('/api/menus/categories', {
        method: 'POST',
        token: token || undefined,
        body: {
          tenantId: formTenantId,
          name: trimmed,
        },
      })

      if (res?.data) {
        setFormCategories((prev) => [...prev, res.data])
        setFormCategoryId(res.data.id)
        // Also update filter categories if same tenant
        if (selectedTenantId === formTenantId) {
          setTenantCategories((prev) => [...prev, res.data])
        }
        toastSuccess(`Kategori "${trimmed}" berhasil dibuat!`)
        setNewCategoryName('')
        setShowQuickCategoryInput(false)
      }
    } catch (err: any) {
      toastError(err?.message || 'Gagal membuat kategori baru.')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  // Validate and submit menu (Create / Update)
  const handleSubmitMenu = async (e: React.FormEvent) => {
    e.preventDefault()

    const errs: Record<string, string> = {}
    if (!formTenantId) {
      errs.tenantId = 'Stan tenant wajib dipilih'
    }
    if (!formName.trim() || formName.trim().length < 2) {
      errs.name = 'Nama menu minimal 2 karakter'
    }
    const numPrice = Number(formPrice)
    if (isNaN(numPrice) || numPrice < 0 || formPrice.trim() === '') {
      errs.price = 'Harga porsi harus berupa angka positif'
    }
    const numStock = Number(formStock)
    if (isNaN(numStock) || numStock < 0) {
      errs.stock = 'Stok porsi tidak boleh bernilai negatif'
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    setIsSaving(true)
    try {
      const token = getToken()
      const parsedPrice = Math.round(Number(formPrice))
      const parsedStock = Math.round(Number(formStock))

      if (editingMenu) {
        // Update existing menu
        await apiFetch(`/api/menus/${editingMenu.id}`, {
          method: 'PUT',
          token: token || undefined,
          body: {
            name: formName.trim(),
            categoryId: formCategoryId || null,
            price: parsedPrice,
            stock: parsedStock,
            description: formDescription.trim() || null,
            imageUrl: formImageUrl.trim() || null,
            isAvailable: formIsAvailable,
          },
        })
        toastSuccess(`Menu "${formName}" berhasil diperbarui!`)
      } else {
        // Create new menu
        await apiFetch('/api/menus', {
          method: 'POST',
          token: token || undefined,
          body: {
            tenantId: formTenantId,
            categoryId: formCategoryId || undefined,
            name: formName.trim(),
            price: parsedPrice,
            stock: parsedStock,
            description: formDescription.trim() || undefined,
            imageUrl: formImageUrl.trim() || undefined,
            isAvailable: formIsAvailable,
          },
        })
        toastSuccess(`Menu "${formName}" berhasil didaftarkan ke stan tenant!`)
      }

      setFormDialogOpen(false)
      setEditingMenu(null)
      await loadData()
    } catch (err: any) {
      toastError(err?.message || 'Gagal menyimpan menu.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Menu Handler
  const handleDeleteMenu = async () => {
    if (!menuToDelete) return
    setIsDeleting(true)

    try {
      const token = getToken()
      await apiFetch(`/api/menus/${menuToDelete.id}`, {
        method: 'DELETE',
        token: token || undefined,
      })

      setMenus((prev) => prev.filter((item) => item.id !== menuToDelete.id))
      toastSuccess(`Menu "${menuToDelete.name}" berhasil dihapus dari sistem.`)
      setDeleteDialogOpen(false)
      setMenuToDelete(null)
    } catch (err: any) {
      toastError(err?.message || 'Gagal menghapus menu.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Toggle availability
  const handleToggleAvailability = async (menuItem: MenuItem) => {
    const isCurrentlyAvailable =
      menuItem.status === 'AVAILABLE' || menuItem.isAvailable === true
    const newStatus = isCurrentlyAvailable ? 'OUT_OF_STOCK' : 'AVAILABLE'

    try {
      const token = getToken()
      await apiFetch(`/api/menus/${menuItem.id}`, {
        method: 'PUT',
        token: token || undefined,
        body: {
          status: newStatus,
          isAvailable: !isCurrentlyAvailable,
        },
      })

      setMenus((prev) =>
        prev.map((item) =>
          item.id === menuItem.id
            ? { ...item, status: newStatus, isAvailable: !isCurrentlyAvailable }
            : item
        )
      )
      toastSuccess(
        `Status "${menuItem.name}" diubah menjadi ${
          !isCurrentlyAvailable ? 'Tersedia' : 'Habis'
        }`
      )
    } catch (err: any) {
      toastError(err?.message || 'Gagal memperbarui status ketersediaan menu')
    }
  }

  return (
    <InternalLayout
      title={isFoodCourtManager ? 'Katalog Menu Cabang' : 'Katalog Menu Global'}
      subtitle={
        isFoodCourtManager
          ? 'Manajemen penuh produk kuliner, harga porsi, stok dapur, dan kategori sajian di cabang Anda'
          : 'Manajemen terpusat seluruh sajian kuliner, penetapan harga, stok, dan kategori lintas cabang food court'
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
            <span>Tambah Menu</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Stat 1 */}
          <div className="p-5 rounded-[26px] bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#15803d] text-white shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/90">
                {isFoodCourtManager ? 'Total Menu Cabang' : 'Total Menu Global'}
              </span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <UtensilsCrossed className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-black">{totalMenusCount} Produk</div>
              <div className="text-[11px] text-white/80 mt-1 font-medium">
                Terdaftar di database sistem
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Menu Tersedia (Ready)</span>
              <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#10b981]">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold text-[#0a0a0a]">
                {availableCount} Menu
              </div>
              <div className="text-[11px] text-[#10b981] mt-1 font-medium">
                Siap dipesan pengunjung
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Menu Habis (Sold Out)</span>
              <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#e7000b]">
                <XCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold text-[#0a0a0a]">
                {outOfStockCount} Menu
              </div>
              <div className="text-[11px] text-[#737373] mt-1 font-medium">
                Sedang tidak dapat dipesan
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Tenant Mitra Aktif</span>
              <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                <Store className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold text-[#0a0a0a]">
                {totalTenantsCount || tenants.length} Stan Kios
              </div>
              <div className="text-[11px] text-[#737373] mt-1 font-medium">
                Memiliki katalog aktif
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar Card with Category Filter */}
        <Card surface="paper" className="!p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Search */}
            <div className="relative">
              <Input
                placeholder="Cari nama menu / stan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
              <Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            {/* 2. Cabang Filter */}
            <div>
              <Select
                value={selectedFoodCourtId}
                onChange={(e) => {
                  setSelectedFoodCourtId(e.target.value)
                  setSelectedTenantId('')
                  setSelectedCategoryId('')
                }}
                disabled={isFoodCourtManager}
                className="text-xs"
              >
                {!isFoodCourtManager && <option value="">Semua Cabang Food Court</option>}
                {foodCourts.map((fc) => (
                  <option key={fc.id} value={fc.id}>
                    {fc.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3. Tenant Filter */}
            <div>
              <Select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value)
                  setSelectedCategoryId('')
                }}
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

            {/* 4. Category Filter (/api/menus/categories/{tenantId}) */}
            <div>
              <Select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={!selectedTenantId || isCategoryFilterLoading}
                className="text-xs"
              >
                {!selectedTenantId ? (
                  <option value="">Pilih Stan untuk Kategori</option>
                ) : isCategoryFilterLoading ? (
                  <option value="">Memuat Kategori...</option>
                ) : (
                  <>
                    <option value="">Semua Kategori ({tenantCategories.length})</option>
                    {tenantCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </>
                )}
              </Select>
            </div>

            {/* 5. Availability Filter */}
            <div>
              <Select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="text-xs"
              >
                <option value="">Semua Status</option>
                <option value="available">Tersedia (Ready)</option>
                <option value="out_of_stock">Habis (Out of Stock)</option>
              </Select>
            </div>
          </div>

          {/* Reset Filters Shortcut if active */}
          {(search || (!isFoodCourtManager && selectedFoodCourtId) || selectedTenantId || selectedCategoryId || availabilityFilter) && (
            <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-xs text-[#737373]">
              <span>
                Menampilkan <strong>{filteredMenus.length}</strong> dari <strong>{menus.length}</strong> menu
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  if (!isFoodCourtManager) setSelectedFoodCourtId('')
                  setSelectedTenantId('')
                  setSelectedCategoryId('')
                  setAvailabilityFilter('')
                }}
                className="text-xs text-[#0a0a0a] hover:underline font-semibold cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </Card>

        {/* Global Menus Data Table Card */}
        <Card surface="paper" className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[10px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4 font-medium">Menu Kuliner</th>
                  <th className="py-3 px-4 font-medium">Stan & Cabang</th>
                  <th className="py-3 px-4 font-medium">Kategori</th>
                  <th className="py-3 px-4 font-medium">Harga</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f5]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#10b981]" />
                        <span>Memuat seluruh katalog menu...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMenus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      Tidak ada menu kuliner yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredMenus.map((item) => {
                    const isAvailable =
                      item.status === 'AVAILABLE' || item.isAvailable === true
                    const tenantInfo =
                      item.tenant || tenants.find((t) => t.id === item.tenantId)
                    const foodCourtInfo = foodCourts.find(
                      (fc) => fc.id === tenantInfo?.foodCourtId
                    )

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#fafafa] transition-colors group"
                      >
                        {/* Name and Image */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#16a34a] font-bold text-sm shrink-0 overflow-hidden">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <UtensilsCrossed className="w-4 h-4 text-[#16a34a]" />
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <div className="font-bold text-[#0a0a0a] text-xs truncate">
                                {item.name}
                              </div>
                              {item.description && (
                                <div className="text-[10px] text-[#737373] line-clamp-1 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tenant and Food Court */}
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

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-[#f5f5f5] border border-[#e5e5e5] text-[10px] font-medium text-[#0a0a0a]">
                            {item.category?.name || 'Tanpa Kategori'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#0a0a0a]">
                          {formatRupiah(item.price)}
                        </td>

                        {/* Status & Availability Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer"
                            style={{
                              backgroundColor: isAvailable ? '#dcfce7' : '#fee2e2',
                              color: isAvailable ? '#166534' : '#991b1b',
                            }}
                            title="Klik untuk ubah status ketersediaan"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAvailable ? 'bg-[#16a34a]' : 'bg-[#dc2626]'
                              }`}
                            />
                            <span>{isAvailable ? 'Tersedia' : 'Habis'}</span>
                          </button>
                        </td>

                        {/* Actions: Edit & Delete */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDialog(item)}
                              className="p-1.5 rounded-[10px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors cursor-pointer"
                              title="Edit rincian menu"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuToDelete(item)
                                setDeleteDialogOpen(true)
                              }}
                              className="p-1.5 rounded-[10px] text-[#737373] hover:text-[#e7000b] hover:bg-[#fee2e2] transition-colors cursor-pointer"
                              title="Hapus menu dari sistem"
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

      {/* Create & Edit Menu Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen} size="3xl">
        <DialogClose onClick={() => setFormDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>
            {editingMenu ? 'Edit Menu Kuliner' : 'Tambah Menu Kuliner Baru'}
          </DialogTitle>
          <DialogDescription>
            {editingMenu
              ? `Perbarui rincian harga, stok porsi, atau kategori menu "${editingMenu.name}".`
              : 'Daftarkan sajian makanan atau minuman baru ke stan tenant pilihan Anda.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitMenu} className="space-y-4">
          {/* Cabang & Tenant Selection (Only for Create or viewable in Edit) */}
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
                disabled={isFoodCourtManager || !!editingMenu}
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
                disabled={!!editingMenu}
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

          {/* Menu Name */}
          <div>
            <Label htmlFor="form-name" required>
              Nama Menu Makanan / Minuman
            </Label>
            <Input
              id="form-name"
              placeholder="Contoh: Nasi Goreng Spesial, Es Teh Manis"
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

          {/* Category with Quick Add Option */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="form-category" className="!mb-0">
                Kategori Sajian
              </Label>
              {formTenantId && !showQuickCategoryInput && (
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryInput(true)}
                  className="text-[11px] font-semibold text-[#16a34a] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>+ Kategori Baru</span>
                </button>
              )}
            </div>

            {showQuickCategoryInput ? (
              <div className="flex items-center gap-2 p-2.5 rounded-[16px] bg-[#f0fdf4] border border-[#bbf7d0]">
                <Input
                  placeholder="Nama kategori baru (min 2 huruf)..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="text-xs bg-white h-8"
                  disabled={isCreatingCategory}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                  className="h-8 text-xs bg-[#16a34a] hover:bg-[#15803d] text-white shrink-0"
                >
                  {isCreatingCategory ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowQuickCategoryInput(false)
                    setNewCategoryName('')
                  }}
                  className="h-8 text-xs shrink-0"
                >
                  Batal
                </Button>
              </div>
            ) : (
              <Select
                id="form-category"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                disabled={!formTenantId || isFormCategoryLoading}
                className="text-xs"
              >
                {!formTenantId ? (
                  <option value="">Pilih Stan Tenant terlebih dahulu</option>
                ) : isFormCategoryLoading ? (
                  <option value="">Memuat kategori tenant...</option>
                ) : (
                  <>
                    <option value="">Tanpa Kategori (Umum)</option>
                    {formCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </>
                )}
              </Select>
            )}
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="form-price" required>
                Harga Satuan (Rp)
              </Label>
              <Input
                id="form-price"
                type="number"
                placeholder="25000"
                min="0"
                step="500"
                value={formPrice}
                onChange={(e) => {
                  setFormPrice(e.target.value)
                  if (formErrors.price) setFormErrors((prev) => ({ ...prev, price: '' }))
                }}
                error={!!formErrors.price}
                helperText={formErrors.price}
                className="font-mono text-sm"
                required
              />
            </div>

            <div>
              <Label htmlFor="form-stock">Stok Porsi Dapur</Label>
              <Input
                id="form-stock"
                type="number"
                placeholder="50"
                min="0"
                value={formStock}
                onChange={(e) => {
                  setFormStock(e.target.value)
                  if (formErrors.stock) setFormErrors((prev) => ({ ...prev, stock: '' }))
                }}
                error={!!formErrors.stock}
                helperText={formErrors.stock}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="form-desc">Deskripsi Menu (Opsional)</Label>
            <textarea
              id="form-desc"
              rows={2}
              placeholder="Jelaskan cita rasa, bumbu rahasia, atau porsi hidangan..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded-[16px] bg-[#f5f5f5] text-[#0a0a0a] text-xs p-3 border border-[#e5e5e5] focus:border-[#0a0a0a] focus:bg-white outline-none transition-all resize-none"
            />
          </div>

          {/* Image Upload with live preview & 1MB validation */}
          <div>
            <ImageUploadInput
              label="Foto Sajian Menu (Opsional)"
              folder="menus"
              value={formImageUrl}
              onChange={setFormImageUrl}
              aspectRatio="video"
              helperText="Format gambar JPG, PNG, atau WebP (Maksimal 1 MB)"
            />
          </div>

          {/* Availability Switch */}
          <div className="pt-2 border-t border-[#f0f0f0]">
            <Switch
              id="form-availability"
              checked={formIsAvailable}
              onChange={setFormIsAvailable}
              label="Menu Siap Dipesan (Available)"
              description="Jika dinonaktifkan, menu akan tampil berstatus Habis di meja pemesanan pembeli."
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
              <span>{editingMenu ? 'Simpan Perubahan' : 'Daftarkan Menu'}</span>
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogClose onClick={() => setDeleteDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Konfirmasi Hapus Menu</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus menu &quot;{menuToDelete?.name}&quot; dari katalog?
            Tindakan ini tidak dapat dibatalkan dan menu akan hilang dari aplikasi pemesanan meja.
          </DialogDescription>
        </DialogHeader>
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
            onClick={handleDeleteMenu}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {isDeleting && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>Hapus Menu</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </InternalLayout>
  )
}
