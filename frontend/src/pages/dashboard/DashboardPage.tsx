import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Search,
  ArrowRightLeft,
  Wallet,
  SlidersHorizontal,
  MoreVertical,
  TrendingUp,
  CreditCard,
  Wifi,
  Store,
  QrCode,
  UtensilsCrossed,
  ChefHat,
  CheckCircle2,
  Building,
  Banknote,
  ArrowUpRight,
  Clock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch, getToken } from '../../api/client'
import { formatRupiah, formatDate } from '../../lib/utils'
import { SuperAdminRailAside } from '../../components/layout/SuperAdminRailAside'
import { SuperAdminHeader } from '../../components/layout/SuperAdminHeader'
import { WithdrawalModal } from '../../components/tenant/WithdrawalModal'
import { ProcessWithdrawalModal } from '../../components/admin/ProcessWithdrawalModal'
import { useToast } from '../../components/ui/Toast'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const isFoodCourtManager = user?.role === 'admin-food-court'
  const isTenant = user?.role === 'tenant'

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [orders, setOrders] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [tenantStall, setTenantStall] = useState<any>(null)
  const [tenantMenus, setTenantMenus] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Tenant Wallet & Withdrawal States
  const [walletSummary, setWalletSummary] = useState<any>(null)
  const [latestWithdrawal, setLatestWithdrawal] = useState<any>(null)
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false)
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false)

  // Admin Withdrawal Management States
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([])
  const [selectedWithdrawalToProcess, setSelectedWithdrawalToProcess] = useState<any | null>(null)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)

  // Food Court Wallet & Platform Revenue States
  const [foodCourtWallet, setFoodCourtWallet] = useState<any>(null)
  const [platformRevenue, setPlatformRevenue] = useState<any>(null)

  // Fetch real data from backend
  async function loadDashboardData() {
    setIsLoading(true)
    const token = getToken()
    const headers = { token: token || undefined }

    if (isTenant) {
      try {
        const [mineRes, ordersRes, menusRes, walletRes, withdrawalsRes] = await Promise.allSettled([
          apiFetch<{ data: any }>('/api/tenants/mine', headers),
          apiFetch<{ data: any[] }>('/api/orders', headers),
          apiFetch<{ data: any[] }>('/api/menus', headers),
          apiFetch<{ data: any }>('/api/tenants/wallet', headers),
          apiFetch<{ data: any[] }>('/api/tenants/withdrawals', headers),
        ])

        if (mineRes.status === 'fulfilled' && mineRes.value?.data) {
          setTenantStall(mineRes.value.data)
        }
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
          setOrders(ordersRes.value.data)
        }
        if (menusRes.status === 'fulfilled' && menusRes.value?.data) {
          setTenantMenus(menusRes.value.data)
        }
        if (walletRes.status === 'fulfilled' && walletRes.value?.data) {
          setWalletSummary(walletRes.value.data)
        }
        if (withdrawalsRes.status === 'fulfilled' && withdrawalsRes.value?.data && withdrawalsRes.value.data.length > 0) {
          const active = withdrawalsRes.value.data.find(
            (w: any) => w.status === 'PENDING' || w.status === 'PROCESSED'
          )
          setLatestWithdrawal(active || withdrawalsRes.value.data[0])
        }
      } catch (err) {
        console.warn('Tenant dashboard data fetch fallback active:', err)
      } finally {
        setIsLoading(false)
      }
    } else {
      try {
        const [ordersRes, tenantsRes, tablesRes, fcRes, withdrawalsRes, fcWalletRes, platformRevRes] = await Promise.allSettled([
          apiFetch<{ data: any[] }>('/api/orders', headers),
          apiFetch<{ data: any[] }>('/api/tenants', headers),
          apiFetch<{ data: any[] }>('/api/tables', headers),
          apiFetch<{ data: any[] }>('/api/food-courts', headers),
          apiFetch<{ data: any[] }>('/api/admin/withdrawals', headers),
          isFoodCourtManager ? apiFetch<{ data: any }>('/api/admin/food-court/wallet', headers) : Promise.resolve(null as any),
          !isFoodCourtManager ? apiFetch<{ data: any }>('/api/super-admin/platform-revenue', headers) : Promise.resolve(null as any),
        ])

        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
          setOrders(ordersRes.value.data)
        }
        if (tenantsRes.status === 'fulfilled' && tenantsRes.value?.data) {
          setTenants(tenantsRes.value.data)
        }
        if (tablesRes.status === 'fulfilled' && tablesRes.value?.data) {
          setTables(tablesRes.value.data)
        }
        if (fcRes.status === 'fulfilled' && fcRes.value?.data) {
          setFoodCourts(fcRes.value.data)
          if (isFoodCourtManager && fcRes.value.data.length > 0) {
            setSelectedBranchId(fcRes.value.data[0].id)
          }
        }
        if (withdrawalsRes.status === 'fulfilled' && withdrawalsRes.value?.data) {
          setAdminWithdrawals(withdrawalsRes.value.data)
        }
        if (fcWalletRes.status === 'fulfilled' && fcWalletRes.value?.data) {
          setFoodCourtWallet(fcWalletRes.value.data)
        }
        if (platformRevRes.status === 'fulfilled' && platformRevRes.value?.data) {
          setPlatformRevenue(platformRevRes.value.data)
        }
      } catch (err) {
        console.warn('Dashboard data fetch fallback active:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [isFoodCourtManager, isTenant])

  const handleWithdrawalSubmit = async (data: any) => {
    try {
      await apiFetch('/api/tenants/withdrawals', {
        method: 'POST',
        body: data,
      })
      toastSuccess('Pengajuan Terkirim', 'Pengajuan penarikan dana berhasil dikirim ke pengelola.')
      setIsWithdrawalModalOpen(false)
      loadDashboardData()
    } catch (err: any) {
      toastError('Gagal Mengajukan Penarikan', err?.message || 'Terjadi kesalahan saat mengajukan penarikan dana')
    }
  }

  const handleConfirmReceipt = async (withdrawalId: string) => {
    setIsConfirmingReceipt(true)
    try {
      await apiFetch(`/api/tenants/withdrawals/${withdrawalId}/confirm`, {
        method: 'PATCH',
      })
      toastSuccess('Konfirmasi Berhasil', 'Penerimaan dana pencairan telah berhasil dikonfirmasi.')
      loadDashboardData()
    } catch (err: any) {
      toastError('Gagal Konfirmasi', err?.message || 'Gagal mengonfirmasi penerimaan dana')
    } finally {
      setIsConfirmingReceipt(false)
    }
  }

  const handleProcessAdminWithdrawal = async (id: string, data: any) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/process`, {
        method: 'PATCH',
        body: data,
      })
      toastSuccess('Pencairan Berhasil Diproses', 'Pencairan dana tenant berhasil disetujui.')
      setIsProcessModalOpen(false)
      setSelectedWithdrawalToProcess(null)
      loadDashboardData()
    } catch (err: any) {
      toastError('Gagal Memproses Pencairan', err?.message || 'Terjadi kesalahan saat memproses')
    }
  }

  const handleRejectAdminWithdrawal = async (id: string, reason: string) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'PATCH',
        body: { reason },
      })
      toastSuccess('Pengajuan Ditolak', 'Pengajuan ditolak dan saldo dikembalikan ke tenant.')
      setIsProcessModalOpen(false)
      setSelectedWithdrawalToProcess(null)
      loadDashboardData()
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
      loadDashboardData()
    } catch (err: any) {
      toastError('Gagal Menyelesaikan Pencairan', err?.message || 'Terjadi kesalahan')
    }
  }

  const pendingAdminWithdrawals = adminWithdrawals.filter((w) => w.status === 'PENDING')
  const totalPendingWithdrawalAmount = pendingAdminWithdrawals.reduce(
    (sum, w) => sum + (w.amount || 0),
    0
  )

  // Calculate stats from real orders
  const totalRevenue = isTenant
    ? orders.reduce((acc, curr) => acc + (curr.subtotal || 0), 0)
    : orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
  const displayRevenue = totalRevenue > 0 ? totalRevenue : isTenant ? 0 : 4850000

  const completedOrdersCount = orders.filter(
    (o) => o.orderStatus === 'COMPLETED' || o.status === 'COMPLETED'
  ).length

  // Tenant-specific metrics
  const tenantCompletedCount = completedOrdersCount
  const tenantActiveOrders = isTenant
    ? orders.filter((o) => o.status === 'QUEUED' || o.status === 'PREPARING')
    : []
  const tenantQueuedCount = isTenant
    ? orders.filter((o) => o.status === 'QUEUED').length
    : 0
  const tenantPreparingCount = isTenant
    ? orders.filter((o) => o.status === 'PREPARING').length
    : 0
  const tenantReadyCount = isTenant
    ? orders.filter((o) => o.status === 'READY').length
    : 0
  const tenantAvailableMenusCount = tenantMenus.filter(
    (m) => m.isAvailable && m.status !== 'OUT_OF_STOCK'
  ).length

  // Food Court Monthly Sales Chart Data (in Million IDR)
  const chartData = [
    { month: 'Jan', komisi: 4200, tenant: 16800 },
    { month: 'Feb', komisi: 5400, tenant: 21600 },
    { month: 'Mar', komisi: 6100, tenant: 24400 },
    { month: 'Apr', komisi: 7800, tenant: 31200 },
    { month: 'Mei', komisi: 8500, tenant: 34000 },
    { month: 'Jun', komisi: 9200, tenant: 36800 },
    { month: 'Jul', komisi: 8900, tenant: 35600 },
    { month: 'Agu', komisi: 9700, tenant: 38800 },
  ]

  // Real or Seeded Tenant Stalls
  const defaultTenants = [
    {
      id: 'tnt-rawon-siti-001',
      name: 'Warung Rawon Bu Siti',
      stallNumber: 'STAN-A01',
      revenue: 2850000,
      ordersCount: 48,
      isOpen: true,
      category: 'Kuliner Tradisional',
    },
    {
      id: 'tnt-kopi-sentra-002',
      name: 'Kopi Kenangan Sentra',
      stallNumber: 'STAN-B02',
      revenue: 1420000,
      ordersCount: 36,
      isOpen: true,
      category: 'Kopi & Minuman',
    },
    {
      id: 'tnt-bakmi-jawa-003',
      name: 'Bakmi Nusantara Amici',
      stallNumber: 'STAN-C03',
      revenue: 580000,
      ordersCount: 16,
      isOpen: false,
      category: 'Mie & Bakso',
    },
  ]

  const displayTenants =
    tenants.length > 0
      ? tenants.map((t, idx) => {
          const tenantFc = foodCourts.find((fc) => fc.id === t.foodCourtId)
          return {
            id: t.id,
            foodCourtId: t.foodCourtId,
            foodCourtName: tenantFc?.name || 'Grand City Sentra',
            name: t.name,
            stallNumber: t.stallNumber || `STAN-0${idx + 1}`,
            revenue: (3 - idx) * 950000 + 400000,
            ordersCount: (3 - idx) * 16 + 12,
            isOpen: t.isOpen !== false,
            category: t.description || 'Tenant Kuliner',
          }
        })
      : defaultTenants.map((dt) => ({
          ...dt,
          foodCourtId: 'fc-default',
          foodCourtName: 'Grand City Sentra',
        }))

  const branchFilteredTenants =
    selectedBranchId === 'all'
      ? displayTenants
      : displayTenants.filter((t) => t.foodCourtId === selectedBranchId)

  // Table Occupancy
  const totalTablesCount = tables.length > 0 ? tables.length : 12
  const occupiedTablesCount =
    tables.filter((t) => t.status === 'occupied').length || 4
  const occupancyPercentage = Math.round((occupiedTablesCount / totalTablesCount) * 100)

  // Recent Orders / Activities
  const fallbackActivities = [
    {
      id: 'ORD-7601',
      invoice: 'INV-2026-001',
      activity: 'Rawon Daging Spesial + Es Teh',
      tenantName: 'Warung Rawon Bu Siti',
      tableInfo: 'Meja T-01',
      price: 37000,
      status: 'Completed',
      date: '17 Apr, 15:45 WIB',
      color: 'bg-emerald-600',
    },
    {
      id: 'ORD-7598',
      invoice: 'INV-2026-002',
      activity: 'Rawon Daging Spesial (2 porsi)',
      tenantName: 'Warung Rawon Bu Siti',
      tableInfo: 'Meja T-02',
      price: 64000,
      status: 'Pending',
      date: '17 Apr, 15:30 WIB',
      color: 'bg-amber-600',
    },
    {
      id: 'ORD-7592',
      invoice: 'INV-2026-003',
      activity: 'Es Teh Manis Segar (4 gelas)',
      tenantName: 'Warung Rawon Bu Siti',
      tableInfo: 'Bawa Pulang (Takeaway)',
      price: 20000,
      status: 'Completed',
      date: '17 Apr, 14:15 WIB',
      color: 'bg-blue-600',
    },
    {
      id: 'ORD-7589',
      invoice: 'INV-2026-004',
      activity: 'Paket Makan Siang Meja Bersama',
      tenantName: 'Sentra Multi-Cart',
      tableInfo: 'Meja T-01',
      price: 74000,
      status: 'In Progress',
      date: '17 Apr, 13:40 WIB',
      color: 'bg-purple-600',
    },
    {
      id: 'ORD-7581',
      invoice: 'INV-2026-005',
      activity: 'Rawon Daging Kuah Kluwek',
      tenantName: 'Warung Rawon Bu Siti',
      tableInfo: 'Meja T-02',
      price: 32000,
      status: 'Completed',
      date: '17 Apr, 12:20 WIB',
      color: 'bg-emerald-600',
    },
  ]

  const displayActivities =
    orders.length > 0
      ? orders.slice(0, 5).map((ord, idx) => ({
          id: ord.orderNumber || `ORD-00${idx + 1}`,
          invoice: `INV-2026-${String(idx + 1).padStart(3, '0')}`,
          activity: ord.items?.[0]?.menuNameSnapshot
            ? `${ord.items[0].menuNameSnapshot} ${ord.items.length > 1 ? `(+${ord.items.length - 1} menu)` : ''}`
            : 'Paket Kuliner Food Court',
          tenantName: ord.tenantOrders?.[0]?.tenant?.name || 'Warung Rawon Bu Siti',
          tableInfo: ord.table?.tableNumber ? `Meja ${ord.table.tableNumber}` : 'Dine-In',
          price: ord.totalAmount || 32000,
          status:
            ord.orderStatus === 'COMPLETED'
              ? 'Completed'
              : ord.orderStatus === 'CANCELLED'
              ? 'Pending'
              : 'In Progress',
          date: ord.createdAt ? formatDate(ord.createdAt) : '17 Apr, 15:45 WIB',
          color: 'bg-emerald-600',
        }))
      : fallbackActivities

  const filteredActivities = displayActivities.filter((item) =>
    searchQuery.trim()
      ? item.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tenantName.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  const activeFoodCourt =
    selectedBranchId === 'all'
      ? null
      : foodCourts.find((fc) => fc.id === selectedBranchId)

  const activeFoodCourtName =
    activeFoodCourt?.name ||
    (foodCourts?.[0]?.name ?? 'Amici Food Court Grand City')

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
                  ? `Halo, ${tenantStall?.name || user?.name || 'Mitra Gerai'}`
                  : isFoodCourtManager
                    ? `Selamat Datang, ${user?.name || 'Manajer Food Court'}`
                    : `Selamat Pagi, ${user?.name || 'Administrator Food Court'}`}
              </h1>
              <p className="text-xs sm:text-sm text-[#737373] mt-1">
                {isTenant
                  ? `Kelola operasional gerai ${tenantStall?.stallNumber ? `[${tenantStall.stallNumber}]` : ''}, pantau antrean pesanan dapur langsung, dan rekap omzet harian Anda.`
                  : isFoodCourtManager
                    ? `Pantau arus transaksi, performa stan kios, dan okupansi meja di ${activeFoodCourtName}.`
                    : `Pantau arus kas masuk, performa kios mitra, dan kontrol sentral ${selectedBranchId === 'all' ? 'seluruh cabang food court' : activeFoodCourtName}.`}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#0a0a0a] text-[#ffffff] font-semibold">
                {isTenant
                  ? 'TENANT PARTNER'
                  : isFoodCourtManager
                    ? 'FOOD COURT MANAGER'
                    : 'SUPER ADMIN'}
              </span>
            </div>
          </div>
        </section>

        {/* Active Withdrawal Banner for Tenant */}
        {isTenant && latestWithdrawal && (latestWithdrawal.status === 'PENDING' || latestWithdrawal.status === 'PROCESSED') && (
          <div
            className={`p-4 sm:p-5 rounded-[24px] border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              latestWithdrawal.status === 'PROCESSED'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  latestWithdrawal.status === 'PROCESSED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {latestWithdrawal.status === 'PROCESSED' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5 animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {latestWithdrawal.status === 'PROCESSED'
                      ? 'Pencairan Dana Telah Diproses Admin!'
                      : 'Pengajuan Penarikan Saldo Sedang Diproses'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      latestWithdrawal.status === 'PROCESSED'
                        ? 'bg-emerald-200/80 text-emerald-800'
                        : 'bg-amber-200/80 text-amber-800'
                    }`}
                  >
                    {latestWithdrawal.status === 'PROCESSED' ? 'Siap Dikonfirmasi' : 'Menunggu Admin'}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Nominal: <strong className="font-mono text-neutral-900">{formatRupiah(latestWithdrawal.amount)}</strong> • Metode:{' '}
                  {(latestWithdrawal.paymentMethod || latestWithdrawal.method) === 'TRANSFER' ? 'Transfer Bank' : 'Tunai Langsung di Sentra'}
                  {latestWithdrawal.status === 'PROCESSED'
                    ? ' — Silakan periksa rekening/kasir Anda dan konfirmasi penerimaan dana.'
                    : ' — Tim admin food court sedang memverifikasi pengajuan Anda.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {latestWithdrawal.status === 'PROCESSED' && (
                <button
                  type="button"
                  disabled={isConfirmingReceipt}
                  onClick={() => handleConfirmReceipt(latestWithdrawal.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isConfirmingReceipt ? 'Memproses...' : 'Konfirmasi Sudah Terima'}</span>
                </button>
              )}
              <Link
                to="/app/tenant/wallet"
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold transition-all"
              >
                Lihat Dompet
              </Link>
            </div>
          </div>
        )}

        {/* Bento Grid: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Financial Cards & Wallets (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Card 1: Total Balance Card */}
            <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#737373]">
                  {isTenant
                    ? 'Total Omzet Stan Saya'
                    : selectedBranchId === 'all'
                      ? 'Total Omzet Penjualan Global'
                      : `Total Omzet ${activeFoodCourtName}`}
                </span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f5f5] border border-[#e5e5e5] text-xs font-semibold text-[#0a0a0a]">
                  <Banknote className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>{isTenant && tenantStall?.stallNumber ? tenantStall.stallNumber : 'IDR (Rupiah)'}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0a0a0a]">
                  {formatRupiah(displayRevenue)}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#10b981] mt-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {isTenant
                      ? `${orders.length} pesanan masuk ke kios ini`
                      : '14.5% lebih tinggi dibanding bulan lalu'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Tarik Dana / Rekap & Catat Pesanan Baru */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => navigate(isTenant ? '/app/tenant/kds' : '/app/admin/payments')}
                  className="h-11 rounded-[18px] bg-[#9ef01a] hover:bg-[#8ee015] active:scale-[0.99] text-[#0a0a0a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  {isTenant ? (
                    <>
                      <ChefHat className="w-4 h-4" />
                      <span>Layar Dapur KDS</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Rekap Pembayaran</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isTenant) {
                      setIsWithdrawalModalOpen(true)
                    } else {
                      navigate('/app/admin/withdrawals')
                    }
                  }}
                  className="h-11 rounded-[18px] bg-[#0a0a0a] hover:bg-[#262626] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-[#9ef01a]" />
                  <span>
                    {isTenant
                      ? 'Tarik Saldo'
                      : `Pencairan Tenant ${pendingAdminWithdrawals.length > 0 ? `(${pendingAdminWithdrawals.length})` : ''}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      isTenant
                        ? '/app/tenant/menus'
                        : isFoodCourtManager
                          ? '/app/admin/food-court'
                          : '/app/super-admin/food-courts'
                    )
                  }
                  className="h-11 rounded-[18px] bg-[#ffffff] hover:bg-[#f5f5f5] active:scale-[0.99] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[#0a0a0a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  {isTenant ? (
                    <>
                      <UtensilsCrossed className="w-4 h-4 text-[#737373]" />
                      <span>Katalog Menu</span>
                    </>
                  ) : (
                    <>
                      <Building className="w-4 h-4 text-[#737373]" />
                      <span>{isFoodCourtManager ? 'Kelola Cabang' : 'Master Cabang'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tenant Kios Mitra Terlaris Sub-strip / Tenant Gerai Status */}
              <div className="mt-7 pt-6 border-t border-[#f0f0f0]">
                {isTenant ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-[#0a0a0a] text-white flex items-center justify-center shadow-xs">
                        <Store className="w-5 h-5 text-[#a3e635]" />
                      </div>
                      <div>
                        <div className="font-bold text-[#0a0a0a] text-sm">
                          {tenantStall?.name || 'Gerai Kuliner Anda'}
                        </div>
                        <div className="text-[11px] font-mono text-[#737373]">
                          Jam Operasional: {tenantStall?.openingTime?.slice(0, 5) || '09:00'} - {tenantStall?.closingTime?.slice(0, 5) || '21:00'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          tenantStall?.isOpen !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tenantStall?.isOpen !== false ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                          }`}
                        />
                        {tenantStall?.isOpen !== false ? 'Gerai Sedang Buka' : 'Gerai Sedang Tutup'}
                      </span>
                      <Link
                        to="/app/tenant/profile"
                        className="px-3 py-1 rounded-full bg-[#f5f5f5] hover:bg-[#e5e5e5] text-xs font-medium text-[#0a0a0a] transition-colors"
                      >
                        Atur Kios
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs mb-3.5">
                      <span className="font-semibold text-[#0a0a0a]">
                        Stan Tenant Mitra {selectedBranchId !== 'all' ? `(${activeFoodCourtName})` : 'Lintas Cabang'}
                      </span>
                      <Link
                        to={isFoodCourtManager ? '/app/admin/tenants' : '/app/super-admin/tenants'}
                        className="text-[#737373] hover:text-[#0a0a0a] font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>Total {branchFilteredTenants.length} Tenant</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {branchFilteredTenants.slice(0, 3).map((tenant) => (
                        <div
                          key={tenant.id}
                          className="p-3.5 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] shadow-2xs hover:border-[#0a0a0a] transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Store className="w-3.5 h-3.5 text-[#0a0a0a] shrink-0" />
                              <span className="text-xs font-bold text-[#0a0a0a] truncate">
                                {tenant.stallNumber}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                tenant.isOpen
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {tenant.isOpen ? 'Buka' : 'Tutup'}
                            </span>
                          </div>
                          <div className="mt-2 font-bold text-xs text-[#0a0a0a] truncate">
                            {tenant.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#737373] truncate">
                            {tenant.foodCourtName}
                          </div>
                          <div className="font-mono text-xs font-semibold text-[#10b981] mt-1.5">
                            {formatRupiah(tenant.revenue)}
                          </div>
                          <div className="text-[10px] text-[#737373] mt-0.5">
                            {tenant.ordersCount} pesanan selesai
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {isTenant ? (
              <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-[#0a0a0a]" />
                    <span className="text-xs font-bold text-[#0a0a0a]">
                      Antrean Pesanan Dapur Masuk Terkini
                    </span>
                  </div>
                  <Link
                    to="/app/admin/orders"
                    className="text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors inline-flex items-center gap-1"
                  >
                    <span>Rekap Semua Pesanan</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#737373]">
                    Belum ada pesanan aktif yang masuk ke stan Anda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#f0f0f0] text-[#737373] font-mono text-[10px] uppercase">
                          <th className="pb-2.5 font-medium">Nomor Order</th>
                          <th className="pb-2.5 font-medium">Tujuan</th>
                          <th className="pb-2.5 font-medium">Menu</th>
                          <th className="pb-2.5 font-medium text-right">Subtotal</th>
                          <th className="pb-2.5 font-medium text-right">Status Dapur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f5f5f5]">
                        {orders.slice(0, 5).map((to: any) => (
                          <tr key={to.id} className="hover:bg-[#fafafa] transition-colors">
                            <td className="py-3 font-mono font-bold text-[#0a0a0a]">
                              {to.order?.orderNumber || to.id.slice(0, 8)}
                            </td>
                            <td className="py-3 font-medium text-[#737373]">
                              {to.order?.session?.table?.tableNumber
                                ? `Meja ${to.order.session.table.tableNumber}`
                                : 'Bawa Pulang'}
                            </td>
                            <td className="py-3 text-[#0a0a0a]">
                              {to.items && to.items.length > 0 ? (
                                <span className="truncate max-w-[140px] inline-block">
                                  {to.items[0].menuNameSnapshot || to.items[0].name || 'Menu'}
                                  {to.items.length > 1 ? ` +${to.items.length - 1}` : ''}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 font-mono font-bold text-right text-[#0a0a0a]">
                              {formatRupiah(to.subtotal || 0)}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  to.status === 'READY'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : to.status === 'PREPARING'
                                      ? 'bg-amber-100 text-amber-800'
                                      : to.status === 'COMPLETED'
                                        ? 'bg-neutral-100 text-neutral-700'
                                        : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {to.status || 'QUEUED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Kapasitas Keterisian Meja Food Court */}
                <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#0a0a0a]" />
                      <span className="text-xs font-bold text-[#0a0a0a]">
                        Kapasitas Keterisian Meja Makan
                      </span>
                    </div>
                    <Link
                      to="/app/admin/tables"
                      className="text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors inline-flex items-center gap-1"
                    >
                      <span>Kelola Meja</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="w-full h-3 rounded-full bg-[#f0f0f0] overflow-hidden flex">
                    <div
                      className="h-full bg-[#047857] transition-all duration-500"
                      style={{ width: `${occupancyPercentage}%` }}
                    />
                    <div
                      className="h-full flex-1 opacity-25"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #047857, #047857 6px, transparent 6px, transparent 12px)',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#737373] mt-3 font-mono">
                    <span className="text-[#0a0a0a] font-bold">
                      {occupiedTablesCount} Meja Terisi dari {totalTablesCount} Total Meja ({occupancyPercentage}%)
                    </span>
                    <span>{totalTablesCount - occupiedTablesCount} Meja Siap Pakai</span>
                  </div>
                </div>

                {/* Metode Settlement & Penerimaan Kasir */}
                <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#0a0a0a]" />
                      <span className="text-xs font-bold text-[#0a0a0a]">
                        Kanal Pembayaran & Settlement Sentra
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Rekening terhubung secara otomatis ke Midtrans Snap gateway.')}
                      className="text-xs font-semibold text-[#0a0a0a] hover:text-[#737373] transition-colors"
                    >
                      Detail Saldo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Black BCA Escrow Card */}
                    <div className="h-44 rounded-[24px] bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] text-white p-5 flex flex-col justify-between shadow-md relative overflow-hidden select-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 rotate-90 opacity-80" />
                          <span className="text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-xs">
                            BCA Escrow
                          </span>
                        </div>
                        {/* Dual circles badge */}
                        <div className="flex items-center -space-x-2">
                          <div className="w-5 h-5 rounded-full bg-[#ea4335] opacity-90" />
                          <div className="w-5 h-5 rounded-full bg-[#fbbc05] opacity-90" />
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-white/60 mb-0.5 font-mono uppercase">
                          Rekening Penampung Food Court
                        </div>
                        <div className="text-xs font-mono font-bold tracking-wider">
                          8830 •••• 6782
                        </div>
                        <div className="text-[10px] text-white/50 mt-1">
                          PT Sentra Kuliner Amici
                        </div>
                      </div>
                    </div>

                    {/* Deep Green QRIS Card */}
                    <div className="h-44 rounded-[24px] bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#011c16] text-white p-5 flex flex-col justify-between shadow-md relative overflow-hidden select-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 rotate-90 opacity-80" />
                          <span className="text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-xs">
                            QRIS Dinamis
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400">
                          Midtrans
                        </span>
                      </div>

                      <div>
                        <div className="text-[10px] text-white/60 mb-0.5 font-mono uppercase">
                          ID Merchant Sentral
                        </div>
                        <div className="text-xs font-mono font-bold tracking-wider">
                          MID-AMICI-SBY-001
                        </div>
                        <div className="text-[10px] text-emerald-300/70 mt-1">
                          Multi-Cart 1x Bayar Seluruh Kios
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Antrean Pencairan Dana Tenant Quick Widget */}
                <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#0a0a0a]" />
                      <span className="text-xs font-bold text-[#0a0a0a]">
                        Antrean Pencairan Dana Tenant
                      </span>
                      {pendingAdminWithdrawals.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          {pendingAdminWithdrawals.length} Perlu Diproses
                        </span>
                      )}
                    </div>
                    <Link
                      to="/app/admin/withdrawals"
                      className="text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors inline-flex items-center gap-1"
                    >
                      <span>Lihat Semua Antrean</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {pendingAdminWithdrawals.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#737373]">
                      Tidak ada antrean pencairan dana tenant yang tertunda.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#f0f0f0] text-[#737373] font-mono text-[10px] uppercase">
                            <th className="pb-2.5 font-medium">Tenant</th>
                            <th className="pb-2.5 font-medium">Metode</th>
                            <th className="pb-2.5 font-medium text-right">Nominal</th>
                            <th className="pb-2.5 font-medium text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f5f5f5]">
                          {pendingAdminWithdrawals.slice(0, 4).map((w: any) => (
                            <tr key={w.id} className="hover:bg-[#fafafa] transition-colors">
                              <td className="py-3">
                                <div className="font-bold text-[#0a0a0a]">{w.tenant?.name || 'Tenant'}</div>
                                <div className="text-[10px] font-mono text-[#737373]">{w.tenant?.stallNumber || '-'}</div>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    (w.paymentMethod || w.method) === 'TRANSFER'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {(w.paymentMethod || w.method) === 'TRANSFER' ? 'Transfer Bank' : 'Tunai Langsung'}
                                </span>
                              </td>
                              <td className="py-3 font-mono font-bold text-right text-[#0a0a0a]">
                                {formatRupiah(w.amount || 0)}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedWithdrawalToProcess(w)
                                    setIsProcessModalOpen(true)
                                  }}
                                  className="px-3 py-1 rounded-full bg-[#0a0a0a] hover:bg-[#262626] text-white text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  Proses
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: 4 Metric Cards + Stacked Bar Chart + Activities (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 2x2 Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              {isTenant ? (
                <>
                  {/* Card 1: Antrean Dapur Aktif */}
                  <div className="p-5 rounded-[26px] bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#15803d] text-white shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/90">
                        Antrean Dapur Aktif
                      </span>
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                        <ChefHat className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-xl sm:text-2xl font-black tracking-tight text-white">
                        {tenantActiveOrders.length} Antrean
                      </div>
                      <div className="text-[11px] text-white/90 mt-1 font-medium">
                        {tenantQueuedCount} Menunggu • {tenantPreparingCount} Dimasak • {tenantReadyCount} Siap
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Pesanan Selesai */}
                  <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#737373]">Pesanan Selesai</span>
                      <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a]">
                        {tenantCompletedCount} Pesanan
                      </div>
                      <div className="text-[11px] text-[#737373] mt-1 font-medium">
                        Pesanan sukses disajikan
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Menu Siap Jual */}
                  <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#737373]">Menu Siap Jual</span>
                      <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a]">
                        {tenantAvailableMenusCount} / {tenantMenus.length || 0} Menu
                      </div>
                      <div className="text-[11px] text-[#10b981] mt-1 font-medium">
                        Aktif di katalog pembeli
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Saldo Bersih Dompet */}
                  <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-[#737373]">Saldo Bersih Dompet</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a]">
                        {formatRupiah(walletSummary?.balance || 0)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-[#737373] font-medium">
                          {walletSummary?.pendingWithdrawal && walletSummary.pendingWithdrawal > 0
                            ? `${formatRupiah(walletSummary.pendingWithdrawal)} tertahan`
                            : 'Siap ditarik'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsWithdrawalModalOpen(true)}
                          className="text-[11px] font-bold text-[#047857] hover:underline cursor-pointer"
                        >
                          Tarik Saldo &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Card 1: Total Omzet Global Sistem (Green Highlighted Card) */}
                  <div className="p-5 rounded-[26px] bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#15803d] text-white shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/90">
                        {isFoodCourtManager ? 'Total Omzet Cabang' : 'Total Omzet Sistem'}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                        <Wallet className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-xl sm:text-2xl font-black tracking-tight text-white">
                        {formatRupiah(displayRevenue)}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-white/90 mt-1 font-medium">
                        <TrendingUp className="w-3 h-3" />
                        <span>+14.5% dari bulan lalu</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Antrean Pencairan Dana */}
                  <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#737373]">
                        Antrean Pencairan Dana
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                        <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a]">
                        {formatRupiah(totalPendingWithdrawalAmount)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-amber-700 font-medium">
                          {pendingAdminWithdrawals.length} pengajuan menunggu
                        </span>
                        <Link
                          to="/app/admin/withdrawals"
                          className="text-[11px] font-bold text-[#0a0a0a] hover:underline"
                        >
                          Kelola &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Total Tenant Mitra Terdaftar */}
                  <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#737373]">
                        {isFoodCourtManager ? 'Stan Kios Cabang' : 'Tenant Mitra Global'}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a]">
                        {isFoodCourtManager
                          ? `${branchFilteredTenants.length} Stan Kios`
                          : `${displayTenants.length} Stan Kios`}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#10b981] mt-1 font-medium">
                        <TrendingUp className="w-3 h-3" />
                        <span>Terverifikasi aktif berjualan</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Saldo Kas Cabang (Manager) / Fee Platform Sentra (Admin) */}
                  <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-[#737373]">
                          {isFoodCourtManager
                            ? 'Saldo Kas Cabang'
                            : 'Fee Platform Sentra (1%)'}
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#0a0a0a]">
                        {formatRupiah(
                          isFoodCourtManager
                            ? foodCourtWallet?.balance || 0
                            : platformRevenue?.totalEarnedPlatformFee || 0,
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#f0f0f0]">
                        <span className="text-[11px] text-[#737373] font-medium">
                          {isFoodCourtManager
                            ? foodCourtWallet?.pendingWithdrawal && foodCourtWallet.pendingWithdrawal > 0
                              ? `${formatRupiah(foodCourtWallet.pendingWithdrawal)} tertahan`
                              : 'Siap ditarik'
                            : `${platformRevenue?.totalOrdersCount || 0} pesanan selesai`}
                        </span>
                        <Link
                          to={isFoodCourtManager ? '/app/admin/wallet' : '/app/super-admin/platform-revenue'}
                          className="text-[11px] font-bold text-[#047857] hover:underline"
                        >
                          {isFoodCourtManager ? 'Dompet Cabang →' : 'Laporan →'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Total Income Chart (Recharts Stacked Bar Chart) */}
            <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a]">
                    Omzet & Alokasi Bagi Hasil Bulanan
                  </h3>
                  <p className="text-[11px] text-[#737373] mt-0.5">
                    Perbandingan porsi omzet tenant vs komisi sentra (dalam ribuan IDR)
                  </p>
                </div>
              </div>

              {/* Legend Strip */}
              <div className="flex items-center justify-between mt-4 text-xs">
                <span className="font-semibold text-[#0a0a0a]">Alokasi Omzet</span>
                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#a3e635]" />
                    <span className="text-[#737373]">Porsi Tenant (80%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#0a0a0a]" />
                    <span className="text-[#737373]">Komisi Sentra (20%)</span>
                  </div>
                </div>
              </div>

              {/* Stacked Bars Component */}
              <div className="h-56 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#737373', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#737373', fontSize: 10 }}
                      tickFormatter={(val) => `${val / 1000}jt`}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const tenantVal = Number(payload[1]?.value || 0) * 1000
                          const komisiVal = Number(payload[0]?.value || 0) * 1000
                          return (
                            <div className="p-3 rounded-[14px] bg-[#0a0a0a] text-white text-xs shadow-xl space-y-1">
                              <p className="font-bold text-white mb-1.5 border-b border-white/20 pb-1">
                                Bulan {payload[0]?.payload?.month}
                              </p>
                              <p className="text-[#a3e635] font-mono">
                                Porsi Tenant: {formatRupiah(tenantVal)}
                              </p>
                              <p className="text-[#e5e5e5] font-mono">
                                Komisi Sentra: {formatRupiah(komisiVal)}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="komisi"
                      stackId="a"
                      fill="#0a0a0a"
                      radius={[0, 0, 4, 4]}
                      barSize={18}
                    />
                    <Bar
                      dataKey="tenant"
                      stackId="a"
                      fill="#a3e635"
                      radius={[6, 6, 0, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activities Table */}
            <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a]">Pesanan Kios Terbaru</h3>
                  <p className="text-[11px] text-[#737373] mt-0.5">
                    Transaksi pemesanan meja dan koki dapur
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari pesanan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-7 pr-3 rounded-full bg-[#f5f5f5] text-[11px] focus:outline-none focus:ring-1 focus:ring-[#0a0a0a] w-28 sm:w-36"
                    />
                    <Search className="w-3 h-3 text-[#737373] absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                  <Link
                    to="/app/admin/orders"
                    className="h-8 px-2.5 rounded-full border border-[#e5e5e5] hover:border-[#0a0a0a] text-[11px] font-medium flex items-center gap-1 text-[#0a0a0a] transition-colors"
                  >
                    <span>Semua</span>
                    <SlidersHorizontal className="w-3 h-3 text-[#737373]" />
                  </Link>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#f0f0f0] text-[10px] font-medium text-[#737373]">
                      <th className="pb-2.5 pl-1 font-normal w-6">
                        <input
                          type="checkbox"
                          className="rounded-[4px] accent-[#0a0a0a] cursor-pointer"
                        />
                      </th>
                      <th className="pb-2.5 font-normal">Order ID</th>
                      <th className="pb-2.5 font-normal">Menu & Tenant</th>
                      <th className="pb-2.5 font-normal">Total</th>
                      <th className="pb-2.5 font-normal">Status</th>
                      <th className="pb-2.5 font-normal hidden sm:table-cell">Waktu</th>
                      <th className="pb-2.5 font-normal w-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f5]">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#737373] text-xs">
                          Memuat data aktivitas...
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map((act) => (
                        <tr
                          key={act.id}
                          className="hover:bg-[#fafafa] transition-colors group cursor-pointer"
                          onClick={() => navigate('/app/admin/orders')}
                        >
                          <td className="py-3 pl-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded-[4px] accent-[#0a0a0a] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 font-mono font-medium text-[11px] text-[#0a0a0a]">
                            <div>{act.id}</div>
                            <div className="text-[10px] text-[#737373]">{act.tableInfo}</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-[8px] ${act.color} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}
                              >
                                {act.activity.slice(0, 1)}
                              </div>
                              <div className="truncate max-w-[140px] sm:max-w-[180px]">
                                <div className="font-medium text-[#0a0a0a] truncate">
                                  {act.activity}
                                </div>
                                <div className="text-[10px] text-[#737373] truncate">
                                  {act.tenantName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-mono font-bold text-[#0a0a0a]">
                            {formatRupiah(act.price)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  act.status === 'Completed'
                                    ? 'bg-[#10b981]'
                                    : act.status === 'Pending'
                                    ? 'bg-[#e7000b]'
                                    : 'bg-[#f59e0b]'
                                }`}
                              />
                              <span
                                className={`text-[11px] font-medium ${
                                  act.status === 'Completed'
                                    ? 'text-[#10b981]'
                                    : act.status === 'Pending'
                                    ? 'text-[#e7000b]'
                                    : 'text-[#f59e0b]'
                                }`}
                              >
                                {act.status === 'Completed'
                                  ? 'Selesai'
                                  : act.status === 'Pending'
                                  ? 'Menunggu'
                                  : 'Dimasak'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-[10px] text-[#737373] hidden sm:table-cell whitespace-nowrap font-mono">
                            {act.date}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              className="text-[#a3a3a3] hover:text-[#0a0a0a] p-1 transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modals for Tenant and Admin */}
        {isTenant && (
          <WithdrawalModal
            isOpen={isWithdrawalModalOpen}
            onClose={() => setIsWithdrawalModalOpen(false)}
            currentBalance={walletSummary?.balance || 0}
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
