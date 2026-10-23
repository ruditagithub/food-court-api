import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
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
} from 'lucide-react'

interface MenuItem {
  id: string
  tenantId: string
  categoryId?: string
  name: string
  description?: string
  price: number
  stock: number
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'HIDDEN'
  isAvailable?: boolean
  image?: string
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

export function SuperAdminMenusPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [menus, setMenus] = useState<MenuItem[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')

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
      }
    } catch (err: any) {
      console.warn('Error fetching global menu catalog:', err)
      toastError(err?.message || 'Gagal memuat katalog menu global')
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered tenants by selected food court
  const availableTenants = useMemo(() => {
    if (!selectedFoodCourtId) return tenants
    return tenants.filter((t) => t.foodCourtId === selectedFoodCourtId)
  }, [tenants, selectedFoodCourtId])

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

      // 4. Filter by Availability
      if (availabilityFilter === 'available') {
        if (m.status !== 'AVAILABLE' && m.isAvailable !== true) return false
      } else if (availabilityFilter === 'out_of_stock') {
        if (m.status === 'AVAILABLE' || m.isAvailable === true) return false
      }

      return true
    })
  }, [menus, search, selectedFoodCourtId, selectedTenantId, availabilityFilter, tenants])

  // Metrics
  const totalMenusCount = menus.length
  const availableCount = menus.filter(
    (m) => m.status === 'AVAILABLE' || m.isAvailable === true
  ).length
  const outOfStockCount = totalMenusCount - availableCount
  const totalTenantsCount = new Set(menus.map((m) => m.tenantId)).size

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
        body: JSON.stringify({
          status: newStatus,
          isAvailable: !isCurrentlyAvailable,
        }),
      })

      setMenus((prev) =>
        prev.map((item) =>
          item.id === menuItem.id
            ? { ...item, status: newStatus, isAvailable: !isCurrentlyAvailable }
            : item
        )
      )
      toastSuccess(
        `Status menu "${menuItem.name}" diperbarui menjadi ${
          !isCurrentlyAvailable ? 'Tersedia' : 'Habis'
        }`
      )
    } catch (err: any) {
      toastError(err?.message || 'Gagal memperbarui status ketersediaan menu')
    }
  }

  return (
    <InternalLayout
      title="Katalog Menu Global"
      subtitle="Pengawasan seluruh produk kuliner, harga porsi, dan ketersediaan menu lintas stan & cabang food court"
      actions={
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
      }
    >
      <div className="space-y-5">
        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Stat 1 */}
          <div className="p-5 rounded-[26px] bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#15803d] text-white shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/90">Total Menu Global</span>
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

        {/* Filter Toolbar Card */}
        <Card surface="paper" className="!p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Cari nama menu / deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
              <Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            {/* Cabang Filter */}
            <div>
              <Select
                value={selectedFoodCourtId}
                onChange={(e) => {
                  setSelectedFoodCourtId(e.target.value)
                  setSelectedTenantId('') // reset tenant when food court changes
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

            {/* Tenant Filter */}
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

            {/* Availability Filter */}
            <div>
              <Select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="text-xs"
              >
                <option value="">Semua Status Ketersediaan</option>
                <option value="available">Tersedia (Ready)</option>
                <option value="out_of_stock">Habis (Out of Stock)</option>
              </Select>
            </div>
          </div>
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
                              {item.image ? (
                                <img
                                  src={item.image}
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
                            {item.category?.name || 'Makanan & Minuman'}
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

                        {/* Action: Delete */}
                        <td className="py-3.5 px-4 text-right">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogClose onClick={() => setDeleteDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Konfirmasi Hapus Menu</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus menu &quot;{menuToDelete?.name}&quot; dari katalog global?
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
