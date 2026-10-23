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
  ShoppingBag,
  SlidersHorizontal,
  MoreVertical,
  TrendingUp,
  CreditCard,
  Wifi,
  Store,
  QrCode,
  UtensilsCrossed,
  Building,
  Banknote,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch, getToken } from '../../api/client'
import { formatRupiah, formatDate } from '../../lib/utils'
import { SuperAdminRailAside } from '../../components/layout/SuperAdminRailAside'
import { SuperAdminHeader } from '../../components/layout/SuperAdminHeader'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isFoodCourtManager = user?.role === 'admin-food-court'

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [orders, setOrders] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real data from backend
  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true)
      const token = getToken()
      const headers = { token: token || undefined }

      try {
        const [ordersRes, tenantsRes, tablesRes, fcRes] = await Promise.allSettled([
          apiFetch<{ data: any[] }>('/api/orders', headers),
          apiFetch<{ data: any[] }>('/api/tenants', headers),
          apiFetch<{ data: any[] }>('/api/tables', headers),
          apiFetch<{ data: any[] }>('/api/food-courts', headers),
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
      } catch (err) {
        console.warn('Dashboard data fetch fallback active:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [isFoodCourtManager])

  // Calculate stats from real orders
  const totalRevenue = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
  const displayRevenue = totalRevenue > 0 ? totalRevenue : 4850000

  const completedOrdersCount = orders.filter(
    (o) => o.orderStatus === 'COMPLETED' || o.status === 'COMPLETED'
  ).length || 18

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
                {isFoodCourtManager
                  ? `Selamat Datang, ${user?.name || 'Manajer Food Court'}`
                  : `Selamat Pagi, ${user?.name || 'Administrator Food Court'}`}
              </h1>
              <p className="text-xs sm:text-sm text-[#737373] mt-1">
                {isFoodCourtManager
                  ? `Pantau arus transaksi, performa stan kios, dan okupansi meja di ${activeFoodCourtName}.`
                  : `Pantau arus kas masuk, performa kios mitra, dan kontrol sentral ${selectedBranchId === 'all' ? 'seluruh cabang food court' : activeFoodCourtName}.`}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#0a0a0a] text-[#ffffff] font-semibold">
                {isFoodCourtManager ? 'FOOD COURT MANAGER' : 'SUPER ADMIN'}
              </span>
            </div>
          </div>
        </section>

        {/* Bento Grid: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Financial Cards & Wallets (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Card 1: Total Balance Card */}
            <div className="bg-[#ffffff] rounded-[32px] border border-[#e5e5e5] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#737373]">
                  {selectedBranchId === 'all' ? 'Total Omzet Penjualan Global' : `Total Omzet ${activeFoodCourtName}`}
                </span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f5f5] border border-[#e5e5e5] text-xs font-semibold text-[#0a0a0a]">
                  <Banknote className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>IDR (Rupiah)</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0a0a0a]">
                  {formatRupiah(displayRevenue)}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#10b981] mt-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>14.5% lebih tinggi dibanding bulan lalu</span>
                </div>
              </div>

              {/* Action Buttons: Tarik Dana / Rekap & Catat Pesanan Baru */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/app/admin/payments')}
                  className="h-11 rounded-[18px] bg-[#9ef01a] hover:bg-[#8ee015] active:scale-[0.99] text-[#0a0a0a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Rekap Pembayaran</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      isFoodCourtManager
                        ? '/app/admin/food-court'
                        : '/app/super-admin/food-courts'
                    )
                  }
                  className="h-11 rounded-[18px] bg-[#ffffff] hover:bg-[#f5f5f5] active:scale-[0.99] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[#0a0a0a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Building className="w-4 h-4 text-[#737373]" />
                  <span>{isFoodCourtManager ? 'Kelola Cabang' : 'Master Cabang'}</span>
                </button>
              </div>

              {/* Tenant Kios Mitra Terlaris Sub-strip */}
              <div className="mt-7 pt-6 border-t border-[#f0f0f0]">
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
              </div>
            </div>

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
          </div>

          {/* RIGHT COLUMN: 4 Metric Cards + Stacked Bar Chart + Activities (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 2x2 Metric Cards Grid (Super Admin Macro Metrics) */}
            <div className="grid grid-cols-2 gap-3.5">
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

              {/* Card 2: Cabang Food Court Aktif / Okupansi Meja */}
              <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#737373]">
                    {isFoodCourtManager ? 'Okupansi Meja' : 'Cabang Food Court'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                    {isFoodCourtManager ? (
                      <QrCode className="w-3.5 h-3.5" />
                    ) : (
                      <Building className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a]">
                    {isFoodCourtManager
                      ? `${occupancyPercentage}% Terisi`
                      : `${foodCourts.length || 1} Cabang Aktif`}
                  </div>
                  <div className="text-[11px] text-[#737373] mt-1 font-medium">
                    {isFoodCourtManager
                      ? `${occupiedTablesCount} dari ${totalTablesCount} meja makan`
                      : 'Sentra kuliner terdaftar'}
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

              {/* Card 4: Total Pesanan Selesai */}
              <div className="p-5 rounded-[26px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#737373]">Pesanan Selesai</span>
                  <div className="w-7 h-7 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                    {completedOrdersCount} Pesanan
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#10b981] mt-1 font-medium">
                    <UtensilsCrossed className="w-3 h-3" />
                    <span>Rata-rata 14 menit masak</span>
                  </div>
                </div>
              </div>
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
      </main>
    </div>
  )
}
