import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch, getToken } from '../../api/client'
import { SuperAdminRailAside } from '../../components/layout/SuperAdminRailAside'
import { SuperAdminHeader } from '../../components/layout/SuperAdminHeader'
import { WithdrawalModal } from '../../components/tenant/WithdrawalModal'
import { ProcessWithdrawalModal } from '../../components/admin/ProcessWithdrawalModal'
import { useToast } from '../../components/ui/Toast'
import {
  SuperAdminAnalyticsWidgets,
  type SuperAdminDashboardStats,
} from '../../components/admin/SuperAdminAnalyticsWidgets'
import {
  FoodCourtManagerAnalyticsWidgets,
  type FoodCourtManagerDashboardStats,
} from '../../components/admin/FoodCourtManagerAnalyticsWidgets'
import {
  TenantAnalyticsWidgets,
  type TenantDashboardStats,
} from '../../components/tenant/TenantAnalyticsWidgets'

export function DashboardPage() {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()

  const isFoodCourtManager = user?.role === 'admin-food-court'
  const isTenant = user?.role === 'tenant'
  const isSuperAdmin = user?.role === 'admin' || (!isFoodCourtManager && !isTenant)

  // Filters & Range State
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [adminRange, setAdminRange] = useState<string>('30d')
  const [managerRange, setManagerRange] = useState<string>('today')
  const [tenantRange, setTenantRange] = useState<string>('7d')

  // Domain Entity States
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([])
  const [tenantStall, setTenantStall] = useState<any>(null)
  const [tenantWallet, setTenantWallet] = useState<any>(null)

  // Statistical Insights States
  const [superAdminStats, setSuperAdminStats] = useState<SuperAdminDashboardStats | null>(null)
  const [managerStats, setManagerStats] = useState<FoodCourtManagerDashboardStats | null>(null)
  const [tenantStats, setTenantStats] = useState<TenantDashboardStats | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true)

  // Modal States
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false)
  const [selectedWithdrawalToProcess, setSelectedWithdrawalToProcess] = useState<any | null>(null)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)

  // 1. Initial Load: Food Courts list, entity data
  useEffect(() => {
    async function loadEntityData() {
      const token = getToken()
      const headers = { token: token || undefined }

      try {
        const [fcRes, ordersRes, withdrawalsRes] = await Promise.allSettled([
          apiFetch<{ data: any[] }>('/api/food-courts', headers),
          apiFetch<{ data: any[] }>('/api/orders', headers),
          !isTenant
            ? apiFetch<{ data: any[] }>('/api/admin/withdrawals', headers)
            : Promise.resolve({ data: [] } as any),
        ])

        if (fcRes.status === 'fulfilled' && fcRes.value?.data) {
          setFoodCourts(fcRes.value.data)
          if (isFoodCourtManager && fcRes.value.data.length > 0) {
            setSelectedBranchId(fcRes.value.data[0].id)
          }
        }
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
          setRecentOrders(ordersRes.value.data)
        }
        if (withdrawalsRes.status === 'fulfilled' && withdrawalsRes.value?.data) {
          setAdminWithdrawals(withdrawalsRes.value.data)
        }

        if (isTenant) {
          const [mineRes, walletRes] = await Promise.allSettled([
            apiFetch<{ data: any }>('/api/tenants/mine', headers),
            apiFetch<{ data: any }>('/api/tenants/wallet', headers),
          ])
          if (mineRes.status === 'fulfilled' && mineRes.value?.data) {
            setTenantStall(mineRes.value.data)
          }
          if (walletRes.status === 'fulfilled' && walletRes.value?.data) {
            setTenantWallet(walletRes.value.data)
          }
        }
      } catch (err) {
        console.warn('Entity data fetch error:', err)
      }
    }

    loadEntityData()
  }, [isFoodCourtManager, isTenant])

  // 2. Fetch Role-Specific Dashboard Statistical Insights
  useEffect(() => {
    async function fetchDashboardStats() {
      setIsStatsLoading(true)
      const token = getToken()
      const headers = { token: token || undefined }

      try {
        if (isSuperAdmin) {
          const url = `/api/super-admin/dashboard-stats?range=${adminRange}&foodCourtId=${selectedBranchId}`
          const res = await apiFetch<{ data: SuperAdminDashboardStats }>(url, headers)
          if (res?.data) {
            setSuperAdminStats(res.data)
          }
        } else if (isFoodCourtManager) {
          const url = `/api/admin/food-court/dashboard-stats?range=${managerRange}`
          const res = await apiFetch<{ data: FoodCourtManagerDashboardStats }>(url, headers)
          if (res?.data) {
            setManagerStats(res.data)
          }
        } else if (isTenant) {
          const url = `/api/tenants/dashboard-stats?range=${tenantRange}`
          const res = await apiFetch<{ data: TenantDashboardStats }>(url, headers)
          if (res?.data) {
            setTenantStats(res.data)
          }
        }
      } catch (err: any) {
        console.error('Failed to load role dashboard stats:', err)
      } finally {
        setIsStatsLoading(false)
      }
    }

    fetchDashboardStats()
  }, [isSuperAdmin, isFoodCourtManager, isTenant, adminRange, managerRange, tenantRange, selectedBranchId])

  // Withdrawal Handlers
  const handleWithdrawalSubmit = async (data: any) => {
    try {
      await apiFetch('/api/tenants/withdrawals', {
        method: 'POST',
        body: data,
      })
      toastSuccess('Pengajuan Terkirim', 'Pengajuan penarikan dana berhasil dibuat.')
      setIsWithdrawalModalOpen(false)
      // Refresh stats
      const token = getToken()
      const res = await apiFetch<{ data: TenantDashboardStats }>(
        `/api/tenants/dashboard-stats?range=${tenantRange}`,
        { token: token || undefined }
      )
      if (res?.data) setTenantStats(res.data)
    } catch (err: any) {
      toastError('Gagal Mengajukan Penarikan', err?.message || 'Terjadi kesalahan')
    }
  }

  const handleProcessAdminWithdrawal = async (id: string, data: any) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/process`, {
        method: 'PATCH',
        body: data,
      })
      toastSuccess('Pencairan Berhasil Diproses', 'Pencairan dana tenant berhasil diproses.')
      setIsProcessModalOpen(false)
      setSelectedWithdrawalToProcess(null)
    } catch (err: any) {
      toastError('Gagal Memproses Pencairan', err?.message || 'Terjadi kesalahan')
    }
  }

  const handleRejectAdminWithdrawal = async (id: string, reason: string) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'PATCH',
        body: { reason },
      })
      toastSuccess('Pengajuan Ditolak', 'Pengajuan ditolak dan saldo dikembalikan.')
      setIsProcessModalOpen(false)
      setSelectedWithdrawalToProcess(null)
    } catch (err: any) {
      toastError('Gagal Menolak Pengajuan', err?.message || 'Terjadi kesalahan')
    }
  }

  const handleCompleteDirectAdminWithdrawal = async (id: string) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/complete`, {
        method: 'PATCH',
      })
      toastSuccess('Pencairan Tunai Selesai', 'Penyerahan uang tunai telah dicatat selesai.')
      setIsProcessModalOpen(false)
      setSelectedWithdrawalToProcess(null)
    } catch (err: any) {
      toastError('Gagal Menyelesaikan Pencairan', err?.message || 'Terjadi kesalahan')
    }
  }

  const activeFoodCourt =
    selectedBranchId === 'all'
      ? null
      : foodCourts.find((fc) => fc.id === selectedBranchId)

  const activeFoodCourtName =
    activeFoodCourt?.name ||
    (foodCourts?.[0]?.name ?? 'Amici Food Court Grand City')

  const pendingWithdrawalsList = adminWithdrawals.filter((w) => w.status === 'PENDING')

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#0a0a0a] flex flex-col xl:flex-row p-3 sm:p-5 lg:p-6 gap-5">
      {/* 1. Left Vertical Rail Sidebar */}
      <SuperAdminRailAside />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 space-y-6">
        {/* Top Floating App Bar */}
        <SuperAdminHeader
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          foodCourtName={isFoodCourtManager ? activeFoodCourtName : undefined}
        />

        {/* Greeting Section */}
        <section className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">
                {isTenant
                  ? `Halo, ${tenantStats?.tenantInfo?.name || tenantStall?.name || user?.name || 'Mitra Gerai'}`
                  : isFoodCourtManager
                  ? `Selamat Datang, ${user?.name || 'Manajer Cabang'}`
                  : `Selamat Pagi, ${user?.name || 'Platform Owner'}`}
              </h1>
              <p className="text-xs sm:text-sm text-[#737373] mt-1">
                {isTenant
                  ? `Pusat analitik bisnis & performa menu stan ${tenantStats?.tenantInfo?.stallNumber ? `[${tenantStats.tenantInfo.stallNumber}]` : ''} di ${tenantStats?.tenantInfo?.foodCourtName || 'Amici Food Court'}.`
                  : isFoodCourtManager
                  ? `Pantau finansial cabang, kesehatan lantai makan, dan beban antrean dapur di ${managerStats?.foodCourtInfo?.name || activeFoodCourtName}.`
                  : `Executive governance & monitoring seluruh omzet GMV, fee platform 1%, dan performa cabang se-sistem.`}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-mono px-3 py-1.5 rounded-full bg-[#0a0a0a] text-[#ffffff] font-bold tracking-wide">
                {isTenant
                  ? 'TENANT MERCHANT'
                  : isFoodCourtManager
                  ? 'BRANCH MANAGER'
                  : 'SUPER ADMIN'}
              </span>
            </div>
          </div>
        </section>

        {/* 3. DYNAMIC 4-LAYER DASHBOARD INSIGHTS PER ROLE */}
        {isSuperAdmin && (
          <SuperAdminAnalyticsWidgets
            stats={superAdminStats}
            isLoading={isStatsLoading}
            range={adminRange}
            onRangeChange={setAdminRange}
            foodCourts={foodCourts}
            selectedBranchId={selectedBranchId}
            onBranchChange={setSelectedBranchId}
            recentOrders={recentOrders}
            pendingWithdrawalsList={pendingWithdrawalsList}
            onProcessWithdrawal={(w) => {
              setSelectedWithdrawalToProcess(w)
              setIsProcessModalOpen(true)
            }}
          />
        )}

        {isFoodCourtManager && (
          <FoodCourtManagerAnalyticsWidgets
            stats={managerStats}
            isLoading={isStatsLoading}
            range={managerRange}
            onRangeChange={setManagerRange}
            recentOrders={recentOrders}
          />
        )}

        {isTenant && (
          <TenantAnalyticsWidgets
            stats={tenantStats}
            isLoading={isStatsLoading}
            range={tenantRange}
            onRangeChange={setTenantRange}
            onOpenWithdrawalModal={() => setIsWithdrawalModalOpen(true)}
          />
        )}

        {/* 4. MODALS */}
        {isTenant && (
          <WithdrawalModal
            isOpen={isWithdrawalModalOpen}
            onClose={() => setIsWithdrawalModalOpen(false)}
            currentBalance={tenantStats?.summary?.walletBalance || tenantWallet?.balance || 0}
            onSubmit={handleWithdrawalSubmit}
          />
        )}

        {!isTenant && (
          <ProcessWithdrawalModal
            isOpen={isProcessModalOpen}
            onClose={() => {
              setIsProcessModalOpen(false)
              setSelectedWithdrawalToProcess(null)
            }}
            withdrawal={selectedWithdrawalToProcess}
            onProcess={handleProcessAdminWithdrawal}
            onReject={handleRejectAdminWithdrawal}
            onCompleteDirect={handleCompleteDirectAdminWithdrawal}
          />
        )}
      </main>
    </div>
  )
}
