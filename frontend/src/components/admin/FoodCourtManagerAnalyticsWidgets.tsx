import { Link } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Store,
  Wallet,
  Clock,
  Receipt,
  QrCode,
  TrendingUp,
  TrendingDown,
  ChefHat,
  ChevronRight,
  Flame,
  AlertCircle,
} from 'lucide-react'
import { formatRupiah } from '../../lib/utils'

export interface FoodCourtManagerDashboardStats {
  foodCourtInfo: {
    id: string
    name: string
  }
  financialSummary: {
    totalBranchRevenue: number
    revenueGrowthPercentage: number
    branchWalletBalance: number
    pendingTenantWithdrawals: {
      count: number
      totalAmount: number
    }
    completedOrdersCount: number
  }
  floorAndTables: {
    totalTables: number
    occupiedTables: number
    availableTables: number
    occupancyRatePercentage: number
    averageDiningDurationMinutes: number
  }
  tenantAndKitchen: {
    totalTenants: number
    activeTenantsCount: number
    topTenants: Array<{
      tenantId: string
      name: string
      stallNumber: string
      gmv: number
      ordersCount: number
      activeCookingOrders: number
    }>
    kitchenQueueOverview: {
      totalActiveCooking: number
      busiestTenantName: string
    }
  }
  channelBreakdown: {
    tableQr: { count: number; percentage: number }
    kiosk: { count: number; percentage: number }
    cashierPos: { count: number; percentage: number }
  }
  trends: Array<{
    timeLabel: string
    hourlyRevenue: number
    orderCount: number
  }>
}

interface FoodCourtManagerAnalyticsWidgetsProps {
  stats: FoodCourtManagerDashboardStats | null
  isLoading: boolean
  range: string
  onRangeChange: (range: string) => void
  recentOrders?: any[]
}

const CHANNEL_COLORS = ['#10b981', '#3b82f6', '#f59e0b']

export function FoodCourtManagerAnalyticsWidgets({
  stats,
  isLoading,
  range,
  onRangeChange,
  recentOrders = [],
}: FoodCourtManagerAnalyticsWidgetsProps) {
  const fcInfo = stats?.foodCourtInfo || { id: '', name: 'Amici Food Court' }
  const financial = stats?.financialSummary || {
    totalBranchRevenue: 0,
    revenueGrowthPercentage: 0,
    branchWalletBalance: 0,
    pendingTenantWithdrawals: { count: 0, totalAmount: 0 },
    completedOrdersCount: 0,
  }
  const floor = stats?.floorAndTables || {
    totalTables: 0,
    occupiedTables: 0,
    availableTables: 0,
    occupancyRatePercentage: 0,
    averageDiningDurationMinutes: 0,
  }
  const tenantKitchen = stats?.tenantAndKitchen || {
    totalTenants: 0,
    activeTenantsCount: 0,
    topTenants: [],
    kitchenQueueOverview: { totalActiveCooking: 0, busiestTenantName: 'Semua dapur lancar' },
  }
  const channels = stats?.channelBreakdown || {
    tableQr: { count: 0, percentage: 0 },
    kiosk: { count: 0, percentage: 0 },
    cashierPos: { count: 0, percentage: 0 },
  }

  const channelPieData = [
    { name: 'QR Meja', value: channels.tableQr.count, pct: channels.tableQr.percentage },
    { name: 'Kiosk Mandiri', value: channels.kiosk.count, pct: channels.kiosk.percentage },
    { name: 'Kasir POS', value: channels.cashierPos.count, pct: channels.cashierPos.percentage },
  ].filter((d) => d.value > 0 || d.pct > 0)

  return (
    <div className="space-y-6">
      {/* TOOLBAR HEADER */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-900">
            <Store className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs sm:text-sm">
              {fcInfo.name}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operasional Cabang Aktif</span>
          </div>
        </div>

        {/* Time Selector Pills */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200/60 self-start md:self-auto">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7d', label: '7 Hari' },
            { id: '30d', label: '30 Hari' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => onRangeChange(pill.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                range === pill.id
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* LAYER 1: Branch Financial Strip (Grid 4 Kolom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Branch Revenue */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-100 uppercase tracking-wide">
              Total Omzet Cabang
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Store className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-white/20 rounded-lg animate-pulse w-3/4" />
              ) : (
                formatRupiah(financial.totalBranchRevenue)
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-100">
              {financial.revenueGrowthPercentage >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="text-emerald-200 font-bold">+{financial.revenueGrowthPercentage}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-200" />
                  <span className="text-rose-200 font-bold">{financial.revenueGrowthPercentage}%</span>
                </>
              )}
              <span>vs periode lalu</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Branch Wallet Balance */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Saldo Dompet Cabang
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-neutral-200 rounded-lg animate-pulse w-3/4" />
              ) : (
                formatRupiah(financial.branchWalletBalance)
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-500">Siap ditarik manajer</span>
              <Link
                to="/app/admin/wallet"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                Dompet <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* KPI 3: Pending Tenant Withdrawals */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Pending Penarikan Tenant
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-neutral-200 rounded-lg animate-pulse w-3/4" />
              ) : (
                formatRupiah(financial.pendingTenantWithdrawals.totalAmount)
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-amber-700 font-medium">
                {financial.pendingTenantWithdrawals.count} stan menunggu
              </span>
              <Link
                to="/app/admin/withdrawals"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                Review <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* KPI 4: Total Orders */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Pesanan Sukses Cabang
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-neutral-200 rounded-lg animate-pulse w-1/2" />
              ) : (
                financial.completedOrdersCount.toLocaleString()
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Total pesanan selesai di cabang ini
            </p>
          </div>
        </div>
      </div>

      {/* LAYER 2: Floor Health & Channel Adoption (Grid 2 Kolom: 6:6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Compact Floor Occupancy Gauge (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">
                  Kesehatan Lantai & Meja
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Okupansi kapasitas makan dan sirkulasi pelanggan
                </p>
              </div>
              <Link
                to="/app/admin/tables"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Denah QR <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 text-center my-3">
              <div>
                <p className="text-[11px] text-neutral-500">Tingkat Terisi</p>
                <p className="text-2xl font-extrabold font-heading text-neutral-900 mt-0.5">
                  {floor.occupancyRatePercentage}%
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">Meja Terpakai</p>
                <p className="text-2xl font-extrabold font-heading text-emerald-600 mt-0.5">
                  {floor.occupiedTables}{' '}
                  <span className="text-xs font-normal text-neutral-400">/ {floor.totalTables}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">Rata-rata Durasi</p>
                <p className="text-2xl font-extrabold font-heading text-neutral-900 mt-0.5">
                  {floor.averageDiningDurationMinutes}{' '}
                  <span className="text-xs font-normal text-neutral-400">mnt</span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5 mt-4">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-neutral-600">
                  {floor.availableTables} Meja Kosong Tersedia
                </span>
                <span className="text-emerald-600 font-bold font-mono">
                  {floor.occupancyRatePercentage}% Kapasitas Terisi
                </span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(floor.occupancyRatePercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Channel Breakdown (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">
                  Adopsi Kanal Pemesanan Cabang
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Metode pelanggan membuat pesanan di cabang
                </p>
              </div>
              <QrCode className="w-5 h-5 text-emerald-600" />
            </div>

            {channelPieData.length === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-dashed border-neutral-200">
                <AlertCircle className="w-7 h-7 text-neutral-300 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-600">Belum ada data adopsi kanal</p>
                <p className="text-[10px] text-neutral-400">Tidak ada pesanan pada cabang ini di periode yang dipilih</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {channelPieData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => [`${val} order`, name]}
                        contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>QR Meja</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-neutral-900">
                      {channels.tableQr.percentage}% ({channels.tableQr.count})
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>Kiosk Mandiri</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-neutral-900">
                      {channels.kiosk.percentage}% ({channels.kiosk.count})
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Kasir POS</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-neutral-900">
                      {channels.cashierPos.percentage}% ({channels.cashierPos.count})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LAYER 3: Tenant Performance & Kitchen Workload (Grid 7:5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Leaderboard Stan Terlaris Cabang (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-neutral-900">
                Stan Terlaris Cabang
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Peringkat omzet stan kios mitra di {fcInfo.name}
              </p>
            </div>
            <Link
              to="/app/admin/tenants"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Semua Stan <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-2.5">Stan / Mitra</th>
                  <th className="pb-2.5">Omzet Penjualan</th>
                  <th className="pb-2.5">Total Order</th>
                  <th className="pb-2.5 text-right">Antrean Masak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {tenantKitchen.topTenants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-400 text-xs">
                      Belum ada penjualan stan pada rentang waktu ini
                    </td>
                  </tr>
                ) : (
                  tenantKitchen.topTenants.slice(0, 5).map((t, idx) => (
                    <tr key={t.tenantId} className="hover:bg-neutral-50/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-[10px]">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-neutral-900 block truncate max-w-[150px]">
                              {t.name}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500">
                              {t.stallNumber}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-mono font-bold text-neutral-900">
                        {formatRupiah(t.gmv)}
                      </td>
                      <td className="py-3 font-mono text-neutral-600">
                        {t.ordersCount} pesanan
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            t.activeCookingOrders > 3
                              ? 'bg-rose-100 text-rose-800'
                              : t.activeCookingOrders > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {t.activeCookingOrders} tiket
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Beban Antrean Dapur Cabang (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">
                  Beban Antrean Dapur
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Beban masak langsung seluruh gerai saat ini
                </p>
              </div>
              <ChefHat className="w-5 h-5 text-amber-600" />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 my-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900">
                  Total Tiket Dimasak di Cabang
                </span>
                <span className="text-xl font-extrabold font-mono text-amber-900">
                  {tenantKitchen.kitchenQueueOverview.totalActiveCooking}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200/60 text-xs text-amber-800">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Busiest Kitchen:{' '}
                  <strong className="text-amber-950 font-semibold">
                    {tenantKitchen.kitchenQueueOverview.busiestTenantName}
                  </strong>
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 font-medium">Stan Aktif Beroperasi</span>
                <span className="font-bold font-mono text-emerald-600">
                  {tenantKitchen.activeTenantsCount} / {tenantKitchen.totalTenants} Stan Buka
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${
                      tenantKitchen.totalTenants > 0
                        ? (tenantKitchen.activeTenantsCount / tenantKitchen.totalTenants) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Pantau tiket KDS real-time</span>
            <Link
              to="/app/admin/orders"
              className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Buka Layar KDS <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* LAYER 4: Feed Aktivitas Pesanan Cabang Terkini */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-bold text-base text-neutral-900">
              Transaksi Terkini di {fcInfo.name}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Aliran order langsung pelanggan di meja & kios cabang
            </p>
          </div>
          <Link
            to="/app/admin/orders"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
          >
            Lihat Semua Pesanan <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <th className="pb-2.5">No. Order</th>
                <th className="pb-2.5">Lokasi / Meja</th>
                <th className="pb-2.5">Menu / Stan</th>
                <th className="pb-2.5">Total Belanja</th>
                <th className="pb-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-400 text-xs">
                    Belum ada aktivitas pesanan di cabang ini
                  </td>
                </tr>
              ) : (
                recentOrders.slice(0, 6).map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 font-mono font-medium text-neutral-900 text-xs">
                      {ord.orderNumber || ord.id}
                    </td>
                    <td className="py-3 text-neutral-700">
                      {ord.session?.table?.tableNumber
                        ? `Meja ${ord.session.table.tableNumber}`
                        : ord.session?.kiosk?.kioskName || 'Takeaway'}
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-neutral-900 block truncate max-w-[200px]">
                        {ord.tenantOrders?.[0]?.tenant?.name || 'Stan Kuliner'}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-neutral-900">
                      {formatRupiah(ord.totalAmount || 0)}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.orderStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.orderStatus === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.orderStatus || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
