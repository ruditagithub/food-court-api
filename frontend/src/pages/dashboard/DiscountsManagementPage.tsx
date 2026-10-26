import { useState, useEffect, useCallback, useMemo } from 'react'
import { Ticket, Search, Plus, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Icons } from '../../components/ui/Icons'
import { DiscountCard } from '../../components/discount/DiscountCard'
import { DiscountFormModal } from '../../components/discount/DiscountFormModal'
import type { Discount, FoodCourt, Tenant } from '../../types'

export function DiscountsManagementPage() {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()

  const [discountsList, setDiscountsList] = useState<Discount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')

  // Food Court & Tenant options for dropdowns
  const [foodCourtsList, setFoodCourtsList] = useState<FoodCourt[]>([])
  const [tenantsList, setTenantsList] = useState<Tenant[]>([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [discountToEdit, setDiscountToEdit] = useState<Discount | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const currentRole = user?.role || 'tenant'

  // Load branch list for Super Admin
  useEffect(() => {
    if (currentRole === 'admin') {
      const token = getToken()
      apiFetch<{ data: FoodCourt[] }>('/api/food-courts', { token: token || undefined })
        .then((res) => {
          if (res.data) setFoodCourtsList(res.data)
        })
        .catch(() => {})
    }
  }, [currentRole])

  // Load tenant list for branch
  useEffect(() => {
    if (currentRole === 'admin' || currentRole === 'admin-food-court') {
      const token = getToken()
      const query = selectedFoodCourtId ? `?foodCourtId=${selectedFoodCourtId}` : ''
      apiFetch<{ data: Tenant[] }>(`/api/tenants${query}`, { token: token || undefined })
        .then((res) => {
          if (res.data) setTenantsList(res.data)
        })
        .catch(() => {})
    }
  }, [currentRole, selectedFoodCourtId])

  // Fetch Discounts
  const fetchDiscounts = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const token = getToken()
      const queryParams = new URLSearchParams()
      if (selectedFoodCourtId) queryParams.set('foodCourtId', selectedFoodCourtId)
      if (selectedTenantId) queryParams.set('tenantId', selectedTenantId)
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim())

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
      const res = await apiFetch<{ data: Discount[] }>(`/api/discounts${queryString}`, {
        token: token || undefined,
      })

      setDiscountsList(res.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar promo'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }, [selectedFoodCourtId, selectedTenantId, searchQuery])

  useEffect(() => {
    fetchDiscounts()
  }, [fetchDiscounts])

  // Metrics calculation
  const metrics = useMemo(() => {
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    let totalActive = 0
    let totalUsage = 0
    let expiringSoon = 0
    let publicCount = 0
    let privateCount = 0

    discountsList.forEach((d) => {
      totalUsage += d.usageCount || 0
      const isExp = new Date(d.endDate) < now
      const isAct = d.status === 'ACTIVE' && !isExp

      if (isAct) totalActive++
      if (d.isPublic) publicCount++
      else privateCount++

      if (isAct) {
        const endD = new Date(d.endDate)
        if (endD <= sevenDaysLater) {
          expiringSoon++
        }
      }
    })

    return { totalActive, totalUsage, expiringSoon, publicCount, privateCount }
  }, [discountsList])

  // Filtered by status tab
  const filteredDiscounts = useMemo(() => {
    const now = new Date()
    return discountsList.filter((d) => {
      const isExp = new Date(d.endDate) < now
      if (statusFilter === 'ACTIVE') {
        return d.status === 'ACTIVE' && !isExp
      }
      if (statusFilter === 'EXPIRED') {
        return isExp || d.status === 'EXPIRED'
      }
      if (statusFilter === 'INACTIVE') {
        return d.status === 'INACTIVE'
      }
      return true
    })
  }, [discountsList, statusFilter])

  // Toggle active/inactive
  const handleToggleStatus = async (discount: Discount) => {
    setUpdatingId(discount.id)
    try {
      const token = getToken()
      if (discount.status === 'ACTIVE') {
        // Deactivate via DELETE /api/discounts/:id
        await apiFetch(`/api/discounts/${discount.id}`, {
          method: 'DELETE',
          token: token || undefined,
        })
        toastSuccess('Promo Dinonaktifkan', `Promo "${discount.name}" berhasil dinonaktifkan.`)
      } else {
        // Activate via PUT /api/discounts/:id
        await apiFetch(`/api/discounts/${discount.id}`, {
          method: 'PUT',
          token: token || undefined,
          body: { status: 'ACTIVE' },
        })
        toastSuccess('Promo Diaktifkan', `Promo "${discount.name}" sekarang aktif kembali.`)
      }
      fetchDiscounts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status promo'
      toastError('Gagal Memperbarui', msg)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleOpenCreateModal = () => {
    setDiscountToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (discount: Discount) => {
    setDiscountToEdit(discount)
    setIsModalOpen(true)
  }

  const handleSaved = () => {
    toastSuccess(
      discountToEdit ? 'Promo Diperbarui' : 'Promo Dibuat',
      'Perubahan konfigurasi voucher berhasil disimpan.'
    )
    fetchDiscounts()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0a0a0a] tracking-tight">
            {currentRole === 'tenant'
              ? 'Kelola Promo & Diskon Stan'
              : currentRole === 'admin-food-court'
              ? 'Kelola Promo & Voucher Cabang'
              : 'Manajemen Promo & Diskon Global'}
          </h1>
          <p className="text-xs sm:text-sm text-[#737373] mt-1">
            Tingkatkan omzet penjualan dengan kupon voucher potongan harga dan promo spesial.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          className="text-xs font-bold h-10 rounded-[14px] px-4 gap-2 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Promo Baru</span>
        </Button>
      </div>

      {/* 2. Four Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-[20px] bg-white border border-[#e5e5e5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#737373]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Promo Aktif</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#0a0a0a]">
            {metrics.totalActive}
          </div>
          <p className="text-[11px] text-[#737373]">Siap digunakan oleh customer</p>
        </div>

        <div className="p-4 rounded-[20px] bg-white border border-[#e5e5e5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#737373]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Terpakai</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#0a0a0a]">
            {metrics.totalUsage} <span className="text-xs font-normal text-[#737373]">kali</span>
          </div>
          <p className="text-[11px] text-[#737373]">Akumulasi pemakaian kuota</p>
        </div>

        <div className="p-4 rounded-[20px] bg-white border border-[#e5e5e5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#737373]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Segera Berakhir</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#0a0a0a]">
            {metrics.expiringSoon}
          </div>
          <p className="text-[11px] text-[#737373]">Dalam 7 hari ke depan</p>
        </div>

        <div className="p-4 rounded-[20px] bg-white border border-[#e5e5e5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#737373]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Jenis Kupon</span>
            <Ticket className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-[#0a0a0a] pt-1">
            <span className="text-emerald-700">{metrics.publicCount} Publik</span> •{' '}
            <span className="text-amber-700">{metrics.privateCount} Privat</span>
          </div>
          <p className="text-[11px] text-[#737373]">Publik vs Kode Kupon Rahasia</p>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search Bar */}
      <div className="p-4 rounded-[22px] bg-white border border-[#e5e5e5] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center bg-[#f5f5f5] p-1 rounded-[14px] text-xs font-semibold">
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'ACTIVE', label: 'Aktif' },
                { id: 'EXPIRED', label: 'Kedaluwarsa' },
                { id: 'INACTIVE', label: 'Nonaktif' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-[10px] transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#0a0a0a] shadow-xs font-bold'
                    : 'text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-2.5 pointer-events-none" />
            <Input
              placeholder="Cari nama atau kode promo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Dropdown Filters for Multi-Branch / Multi-Stall */}
        {(currentRole === 'admin' || currentRole === 'admin-food-court') && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#f0f0f0] text-xs">
            {currentRole === 'admin' && (
              <div className="flex items-center gap-2">
                <span className="text-[#737373] shrink-0">Cabang:</span>
                <select
                  value={selectedFoodCourtId}
                  onChange={(e) => {
                    setSelectedFoodCourtId(e.target.value)
                    setSelectedTenantId('')
                  }}
                  className="h-8 px-2.5 rounded-[10px] bg-[#fafafa] border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none"
                >
                  <option value="">Semua Cabang Food Court</option>
                  {foodCourtsList.map((fc) => (
                    <option key={fc.id} value={fc.id}>
                      {fc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[#737373] shrink-0">Stan Gerai:</span>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="h-8 px-2.5 rounded-[10px] bg-[#fafafa] border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none"
              >
                <option value="">Semua Stan Gerai</option>
                {tenantsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Kios {t.stallNumber})
                  </option>
                ))}
              </select>
            </div>

            {(selectedFoodCourtId || selectedTenantId || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFoodCourtId('')
                  setSelectedTenantId('')
                  setSearchQuery('')
                }}
                className="text-xs text-rose-600 hover:underline cursor-pointer ml-auto"
              >
                Reset Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Discounts Grid / Empty State */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Icons.Refresh className="w-6 h-6 animate-spin text-[#737373] mx-auto" />
          <p className="text-xs text-[#737373]">Memuat data promo & diskon...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-6 rounded-[20px] bg-rose-50 border border-rose-200 text-center space-y-3">
          <p className="text-sm font-bold text-rose-800">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={fetchDiscounts}>
            Coba Lagi
          </Button>
        </div>
      ) : filteredDiscounts.length === 0 ? (
        <div className="py-16 px-4 rounded-[24px] bg-white border border-dashed border-[#d4d4d4] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f5f5f5] text-[#737373] flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-[#0a0a0a]">Belum Ada Promo yang Sesuai</h3>
            <p className="text-xs text-[#737373] mt-1">
              {statusFilter !== 'ALL' || searchQuery
                ? 'Tidak ada promo yang cocok dengan kriteria filter saat ini.'
                : 'Buat promo diskon pertama Anda untuk memikat lebih banyak pesanan customer.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreateModal}
            className="text-xs font-bold rounded-[12px] h-8.5 gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Promo Baru</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDiscounts.map((discount) => (
            <DiscountCard
              key={discount.id}
              discount={discount}
              currentRole={currentRole}
              onEdit={handleOpenEditModal}
              onToggleStatus={handleToggleStatus}
              isUpdating={updatingId === discount.id}
            />
          ))}
        </div>
      )}

      {/* 5. Create / Edit Modal */}
      <DiscountFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        discountToEdit={discountToEdit}
        currentRole={currentRole}
        defaultFoodCourtId={selectedFoodCourtId}
        defaultTenantId={selectedTenantId}
      />
    </div>
  )
}
