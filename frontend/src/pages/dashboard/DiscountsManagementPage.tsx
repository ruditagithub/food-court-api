import { useState, useEffect, useCallback, useMemo } from 'react'
import { Ticket, Search, Plus, TrendingUp, AlertTriangle, RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
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
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')

  // Role Context Info
  const [tenantInfo, setTenantInfo] = useState<any>(null)
  const [managedFoodCourt, setManagedFoodCourt] = useState<any>(null)

  // Food Court & Tenant options for dropdowns
  const [foodCourtsList, setFoodCourtsList] = useState<FoodCourt[]>([])
  const [tenantsList, setTenantsList] = useState<Tenant[]>([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [discountToEdit, setDiscountToEdit] = useState<Discount | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const currentRole = user?.role || 'tenant'

  // Load role context (Tenant details or Managed Food Court)
  useEffect(() => {
    const token = getToken()
    const headers = { token: token || undefined }

    if (currentRole === 'tenant') {
      apiFetch<{ data: any }>('/api/tenants/mine', headers)
        .then((res) => {
          if (res.data) {
            setTenantInfo(res.data)
            if (res.data.id) setSelectedTenantId(res.data.id)
            if (res.data.foodCourtId) setSelectedFoodCourtId(res.data.foodCourtId)
          }
        })
        .catch(() => {})
    } else if (currentRole === 'admin-food-court') {
      apiFetch<{ data: any[] }>('/api/food-courts', headers)
        .then((res) => {
          if (res.data && res.data.length > 0) {
            const fc = res.data[0]
            setManagedFoodCourt(fc)
            setSelectedFoodCourtId(fc.id)
          }
        })
        .catch(() => {})
    } else if (currentRole === 'admin') {
      apiFetch<{ data: FoodCourt[] }>('/api/food-courts', headers)
        .then((res) => {
          if (res.data) setFoodCourtsList(res.data)
        })
        .catch(() => {})
    }
  }, [currentRole])

  // Load tenant list for branch filtering
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

  // Filtered by status and type
  const filteredDiscounts = useMemo(() => {
    const now = new Date()
    return discountsList.filter((d) => {
      const isExp = new Date(d.endDate) < now
      if (statusFilter === 'ACTIVE' && !(d.status === 'ACTIVE' && !isExp)) return false
      if (statusFilter === 'EXPIRED' && !(isExp || d.status === 'EXPIRED')) return false
      if (statusFilter === 'INACTIVE' && d.status !== 'INACTIVE') return false
      if (typeFilter !== 'ALL' && d.type !== typeFilter) return false
      return true
    })
  }, [discountsList, statusFilter, typeFilter])

  // Toggle active/inactive
  const handleToggleStatus = async (discount: Discount) => {
    setUpdatingId(discount.id)
    try {
      const token = getToken()
      if (discount.status === 'ACTIVE') {
        await apiFetch(`/api/discounts/${discount.id}`, {
          method: 'DELETE',
          token: token || undefined,
        })
        toastSuccess('Promo Dinonaktifkan', `Promo "${discount.name}" berhasil dinonaktifkan.`)
      } else {
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
      'Perubahan konfigurasi voucher promo berhasil disimpan.'
    )
    fetchDiscounts()
  }

  // Role Template Customizations
  const pageTitle =
    currentRole === 'tenant'
      ? 'Promo & Diskon Stan'
      : currentRole === 'admin-food-court'
      ? 'Promo & Voucher Cabang'
      : 'Manajemen Promo & Diskon Global'

  const pageSubtitle =
    currentRole === 'tenant'
      ? 'Kelola voucher potongan harga dan kode promo khusus untuk stan kuliner Anda'
      : currentRole === 'admin-food-court'
      ? 'Kelola diskon seluruh cabang food court dan pantau promosi aktif stan mitra'
      : 'Pusat kendali voucher platform, promo cabang food court, dan diskon stan tenant se-Indonesia'

  const actionButtonText =
    currentRole === 'tenant'
      ? 'Buat Promo Stan'
      : currentRole === 'admin-food-court'
      ? 'Buat Promo Cabang'
      : 'Buat Promo Global'

  const foodCourtName =
    currentRole === 'tenant'
      ? tenantInfo?.foodCourt?.name
      : currentRole === 'admin-food-court'
      ? managedFoodCourt?.name
      : undefined

  const stallNumber = currentRole === 'tenant' ? tenantInfo?.stallNumber : undefined

  return (
    <InternalLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      foodCourtName={foodCourtName}
      stallNumber={stallNumber}
      actions={
        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          className="rounded-[18px] px-5 h-10 text-xs font-bold gap-2 shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{actionButtonText}</span>
        </Button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* 1. Four Bento Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Promo Aktif</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#0a0a0a]">
              {metrics.totalActive}
            </div>
            <p className="text-[11px] text-[#737373]">Siap dipakai customer saat checkout</p>
          </Card>

          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Terpakai</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#0a0a0a]">
              {metrics.totalUsage} <span className="text-xs font-normal text-[#737373]">kali</span>
            </div>
            <p className="text-[11px] text-[#737373]">Akumulasi pemakaian seluruh voucher</p>
          </Card>

          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Segera Berakhir</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700">
              {metrics.expiringSoon}
            </div>
            <p className="text-[11px] text-[#737373]">Masa aktif tersisa kurang dari 7 hari</p>
          </Card>

          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Distribusi Kupon</span>
              <Ticket className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-[#0a0a0a] pt-1">
              <span className="text-emerald-700">{metrics.publicCount} Publik</span> •{' '}
              <span className="text-neutral-600">{metrics.privateCount} Privat</span>
            </div>
            <p className="text-[11px] text-[#737373]">Publik checkout vs Kupon rahasia</p>
          </Card>
        </div>

        {/* 2. Filter Bar */}
        <Card surface="paper" className="!p-4 rounded-[24px] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center bg-[#f5f5f5] p-1 rounded-[16px] text-xs font-semibold">
              {(
                [
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'ACTIVE', label: 'Aktif' },
                  { id: 'EXPIRED', label: 'Kedaluwarsa' },
                  { id: 'INACTIVE', label: 'Nonaktif' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-[12px] transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-[#0a0a0a] shadow-xs font-bold'
                      : 'text-[#737373] hover:text-[#0a0a0a]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box & Type Filter */}
            <div className="flex items-center gap-2 flex-1 lg:max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#737373] absolute left-3 top-2.5 pointer-events-none" />
                <Input
                  placeholder="Cari nama atau kode promo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="w-36 shrink-0">
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option value="ALL">Semua Tipe</option>
                  <option value="PERCENTAGE">Persen (%)</option>
                  <option value="FIXED_AMOUNT">Nominal (Rp)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Role-Specific Branch / Stall Filter Bar */}
          {(currentRole === 'admin' || currentRole === 'admin-food-court') && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#f0f0f0] text-xs">
              {currentRole === 'admin' && (
                <div className="flex items-center gap-2">
                  <span className="text-[#737373] shrink-0 font-medium">Cabang:</span>
                  <select
                    value={selectedFoodCourtId}
                    onChange={(e) => {
                      setSelectedFoodCourtId(e.target.value)
                      setSelectedTenantId('')
                    }}
                    className="h-8.5 px-3 rounded-[12px] bg-[#fafafa] border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none font-medium"
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
                <span className="text-[#737373] shrink-0 font-medium">Stan Gerai:</span>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="h-8.5 px-3 rounded-[12px] bg-[#fafafa] border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none font-medium"
                >
                  <option value="">
                    {currentRole === 'admin-food-court'
                      ? 'Semua Promo (Cabang & Stan)'
                      : 'Semua Stan Gerai'}
                  </option>
                  {tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Kios {t.stallNumber})
                    </option>
                  ))}
                </select>
              </div>

              {(selectedFoodCourtId || selectedTenantId || searchQuery || typeFilter !== 'ALL') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentRole === 'admin') setSelectedFoodCourtId('')
                    setSelectedTenantId('')
                    setSearchQuery('')
                    setTypeFilter('ALL')
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 ml-auto text-neutral-600 rounded-[12px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* 3. Promo Cards Grid or Empty State */}
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <Icons.Refresh className="w-6 h-6 animate-spin text-[#737373] mx-auto" />
            <p className="text-xs text-[#737373]">Memuat data promo & diskon...</p>
          </div>
        ) : errorMsg ? (
          <Card surface="paper" className="p-8 text-center space-y-3 bg-rose-50/50 border-rose-200">
            <p className="text-sm font-bold text-rose-800">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={fetchDiscounts} className="rounded-[14px]">
              Coba Lagi
            </Button>
          </Card>
        ) : filteredDiscounts.length === 0 ? (
          <Card
            surface="paper"
            className="py-16 px-4 rounded-[28px] border-dashed border-[#d4d4d4] text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-[#f5f5f5] text-[#737373] flex items-center justify-center mx-auto">
              <Ticket className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="text-sm font-bold text-[#0a0a0a]">Belum Ada Promo yang Sesuai</h3>
              <p className="text-xs text-[#737373] mt-1">
                {statusFilter !== 'ALL' || searchQuery || typeFilter !== 'ALL'
                  ? 'Tidak ada promo yang cocok dengan kriteria filter saat ini.'
                  : currentRole === 'tenant'
                  ? 'Buat promo diskon pertama untuk stan Anda guna meningkatkan volume pesanan pelanggan.'
                  : 'Buat promo diskon cabang atau stan untuk memikat pelanggan.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              className="text-xs font-bold rounded-[14px] h-9 px-4 gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionButtonText}</span>
            </Button>
          </Card>
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

        {/* 4. Create / Edit Modal Dialog */}
        <DiscountFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
          discountToEdit={discountToEdit}
          currentRole={currentRole}
          defaultFoodCourtId={
            currentRole === 'tenant'
              ? tenantInfo?.foodCourtId
              : selectedFoodCourtId || managedFoodCourt?.id
          }
          defaultTenantId={
            currentRole === 'tenant' ? tenantInfo?.id : selectedTenantId
          }
        />
      </div>
    </InternalLayout>
  )
}
