import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Receipt,
  Clock,
  ShieldCheck,
  QrCode,
  Store,
  CreditCard,
  Banknote,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { formatRupiah } from '../../lib/utils'

export interface SuperAdminDashboardStats {
  summary: {
    totalGmv: number
    gmvGrowthPercentage: number
    platformFeeEarned: number
    totalCompletedOrders: number
    ordersGrowthPercentage: number
    pendingWithdrawalAmount: number
    pendingWithdrawalCount: number
  }
  branchLeaderboard: Array<{
    foodCourtId: string
    name: string
    totalGmv: number
    totalOrders: number
    platformFeeContributed: number
    aov: number
    activeTenantsCount: number
  }>
  operational: {
    channelDistribution: {
      tableQr: { count: number; percentage: number }
      kiosk: { count: number; percentage: number }
      cashierPos: { count: number; percentage: number }
    }
    kitchenSla: {
      averageCookingTimeMinutes: number
      targetMinutes: number
      onTimePercentage: number
    }
    paymentComposition: {
      qrisMidtrans: { amount: number; percentage: number }
      cash: { amount: number; percentage: number }
    }
  }
  trends: Array<{
    date: string
    gmv: number
    platformFee: number
    orderCount: number
  }>
}

interface SuperAdminAnalyticsWidgetsProps {
  stats: SuperAdminDashboardStats | null
  isLoading: boolean
  range: string
  onRangeChange: (range: string) => void
  foodCourts: any[]
  selectedBranchId: string
  onBranchChange: (branchId: string) => void
  recentOrders?: any[]
  pendingWithdrawalsList?: any[]
  onProcessWithdrawal?: (item: any) => void
}

const CHANNEL_COLORS = ['#10b981', '#3b82f6', '#f59e0b']

export function SuperAdminAnalyticsWidgets({
  stats,
  isLoading,
  range,
  onRangeChange,
  foodCourts,
  selectedBranchId,
  onBranchChange,
  recentOrders = [],
  pendingWithdrawalsList = [],
  onProcessWithdrawal,
}: SuperAdminAnalyticsWidgetsProps) {
  const summary = stats?.summary || {
    totalGmv: 0,
    gmvGrowthPercentage: 0,
    platformFeeEarned: 0,
    totalCompletedOrders: 0,
    ordersGrowthPercentage: 0,
    pendingWithdrawalAmount: 0,
    pendingWithdrawalCount: 0,
  }

  const operational = stats?.operational || {
    channelDistribution: {
      tableQr: { count: 0, percentage: 0 },
      kiosk: { count: 0, percentage: 0 },
      cashierPos: { count: 0, percentage: 0 },
    },
    kitchenSla: {
      averageCookingTimeMinutes: 0,
      targetMinutes: 20.0,
      onTimePercentage: 100,
    },
    paymentComposition: {
      qrisMidtrans: { amount: 0, percentage: 0 },
      cash: { amount: 0, percentage: 0 },
    },
  }

  const trends = stats?.trends || []
  const leaderboard = stats?.branchLeaderboard || []

  const channelPieData = [
    { name: 'QR Meja', value: operational.channelDistribution.tableQr.count, pct: operational.channelDistribution.tableQr.percentage },
    { name: 'Kiosk Mandiri', value: operational.channelDistribution.kiosk.count, pct: operational.channelDistribution.kiosk.percentage },
    { name: 'Kasir POS', value: operational.channelDistribution.cashierPos.count, pct: operational.channelDistribution.cashierPos.percentage },
  ].filter((d) => d.value > 0 || d.pct > 0)

  return (
    <div className="space-y-6">
      {/* TOOLBAR HEADER: Branch filter & Time Range Selector */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Filter Cabang:
            </span>
          </div>
          <select
            value={selectedBranchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="text-xs sm:text-sm font-semibold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl px-3.5 py-2 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
          >
            <option value="all">Semua Cabang Food Court ({foodCourts.length})</option>
            {foodCourts.map((fc) => (
              <option key={fc.id} value={fc.id}>
                {fc.name}
              </option>
            ))}
          </select>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Operasional Normal</span>
          </div>
        </div>

        {/* Time Selector Pills */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200/60 self-start md:self-auto">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7d', label: '7 Hari' },
            { id: '30d', label: '30 Hari' },
            { id: 'year', label: '1 Tahun' },
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

      {/* LAYER 1: Top Executive KPI Strip (Grid 4 Kolom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Gross Merchandise Value (GMV) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-100 tracking-wide uppercase">
              Total GMV Platform
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Banknote className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-white/20 rounded-lg animate-pulse w-3/4" />
              ) : (
                formatRupiah(summary.totalGmv)
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-100">
              {summary.gmvGrowthPercentage >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="text-emerald-200 font-bold">+{summary.gmvGrowthPercentage}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-200" />
                  <span className="text-rose-200 font-bold">{summary.gmvGrowthPercentage}%</span>
                </>
              )}
              <span>vs periode lalu</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Platform Fee 1% */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Komisi Platform (1%)
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-neutral-200 rounded-lg animate-pulse w-3/4" />
              ) : (
                formatRupiah(summary.platformFeeEarned)
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
              <span>Potongan otomatis sistem platform</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Total Completed Orders */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Pesanan Sukses
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
                summary.totalCompletedOrders.toLocaleString()
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
              {summary.ordersGrowthPercentage >= 0 ? (
                <span className="text-emerald-600 font-bold">+{summary.ordersGrowthPercentage}%</span>
              ) : (
                <span className="text-rose-600 font-bold">{summary.ordersGrowthPercentage}%</span>
              )}
              <span>volume transaksi</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pending Withdrawals */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Pencairan Cabang Pending
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
                formatRupiah(summary.pendingWithdrawalAmount)
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-amber-700 font-medium">
                {summary.pendingWithdrawalCount} antrean butuh approval
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
      </div>

      {/* LAYER 2: Financial Dynamics & Branch Benchmark (Grid 7:5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Recharts Area Chart Tren GMV & Komisi (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">
                  Dinamika Tren Omzet GMV & Komisi
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Visualisasi performa penjualan harian dan serapan fee sistem
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-600 font-medium">GMV</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-neutral-600 font-medium">Fee 1%</span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="h-64 rounded-2xl bg-neutral-100 animate-pulse flex items-center justify-center text-xs text-neutral-400">
                Memuat grafik tren...
              </div>
            ) : trends.length === 0 ? (
              <div className="h-64 rounded-2xl border border-dashed border-neutral-200 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-xs font-semibold text-neutral-700">Belum ada transaksi</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Tidak ada data penjualan pada rentang waktu yang dipilih
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}k`}`}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        formatRupiah(Number(val)),
                        name === 'gmv' ? 'Total GMV' : 'Komisi Platform',
                      ]}
                      labelFormatter={(label) => `Tanggal: ${label}`}
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gmv"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#gmvGradient)"
                      name="gmv"
                    />
                    <Area
                      type="monotone"
                      dataKey="platformFee"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#feeGradient)"
                      name="platformFee"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right: Leaderboard Antar-Cabang (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">
                  Leaderboard Cabang
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Peringkat omzet dan kontribusi cabang
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-neutral-100 rounded-md text-neutral-600 font-bold">
                {leaderboard.length} Cabang
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-neutral-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <Store className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-xs font-semibold text-neutral-700">Belum ada cabang terdaftar</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {leaderboard.map((branch, index) => {
                  const medalColors =
                    index === 0
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : index === 1
                      ? 'bg-slate-200 text-slate-700 border-slate-300'
                      : index === 2
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-neutral-100 text-neutral-600 border-neutral-200'

                  return (
                    <div
                      key={branch.foodCourtId}
                      className="p-3 rounded-2xl bg-neutral-50/70 hover:bg-neutral-100/80 border border-neutral-200/60 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${medalColors}`}
                        >
                          #{index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-neutral-900 truncate">
                            {branch.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            {branch.totalOrders} order • AOV {formatRupiah(branch.aov)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold font-mono text-xs text-neutral-900">
                          {formatRupiah(branch.totalGmv)}
                        </p>
                        <p className="text-[10px] font-mono text-emerald-600 font-semibold">
                          +{formatRupiah(branch.platformFeeContributed)} (fee)
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LAYER 3: Kinerja Operasional & Kanal (Grid 3 Kolom) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Rasio Kanal Pemesanan */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-bold text-sm text-neutral-900">
                Adopsi Kanal Pesan
              </h4>
              <QrCode className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Sebaran order via QR Meja, Kiosk, vs Kasir
            </p>

            {channelPieData.length === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4">
                <AlertCircle className="w-7 h-7 text-neutral-300 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-600">Belum ada data kanal</p>
                <p className="text-[10px] text-neutral-400">Tidak ada transaksi pada periode ini</p>
              </div>
            ) : (
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {channelPieData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} pesanan`, name]}
                      contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-neutral-100 text-center">
              <div>
                <p className="text-[10px] text-neutral-500 font-medium">QR Meja</p>
                <p className="text-xs font-bold text-emerald-600 font-mono mt-0.5">
                  {operational.channelDistribution.tableQr.percentage}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-medium">Kiosk</p>
                <p className="text-xs font-bold text-blue-600 font-mono mt-0.5">
                  {operational.channelDistribution.kiosk.percentage}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-medium">Kasir POS</p>
                <p className="text-xs font-bold text-amber-600 font-mono mt-0.5">
                  {operational.channelDistribution.cashierPos.percentage}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SLA Kecepatan Dapur */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-bold text-sm text-neutral-900">
                SLA Kecepatan Dapur
              </h4>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Kepatuhan durasi masak terhadap standar platform
            </p>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between my-2">
              <div>
                <span className="text-[11px] text-neutral-500 font-medium">Rata-rata Waktu Masak</span>
                <div className="text-2xl font-extrabold font-heading text-neutral-900 mt-0.5">
                  {operational.kitchenSla.averageCookingTimeMinutes}{' '}
                  <span className="text-xs font-normal text-neutral-500">menit</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-neutral-500 font-medium">Target SLA</span>
                <div className="text-base font-bold font-mono text-neutral-700 mt-0.5">
                  ≤ {operational.kitchenSla.targetMinutes} menit
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 font-medium">Tingkat Ketepatan Waktu</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {operational.kitchenSla.onTimePercentage}% On-Time
                </span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(operational.kitchenSla.onTimePercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Komposisi Metode Pembayaran */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-bold text-sm text-neutral-900">
                Komposisi Pembayaran
              </h4>
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Porsi Digital QRIS vs Tunai di Kasir
            </p>

            <div className="space-y-3.5 my-2">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    QRIS & Digital
                  </span>
                  <span className="font-bold font-mono text-neutral-900">
                    {formatRupiah(operational.paymentComposition.qrisMidtrans.amount)} (
                    {operational.paymentComposition.qrisMidtrans.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.min(operational.paymentComposition.qrisMidtrans.percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Tunai / Kasir
                  </span>
                  <span className="font-bold font-mono text-neutral-900">
                    {formatRupiah(operational.paymentComposition.cash.amount)} (
                    {operational.paymentComposition.cash.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${Math.min(operational.paymentComposition.cash.percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
              Arus kas digital langsung terserap ke escrow bank platform Amici.
            </div>
          </div>
        </div>
      </div>

      {/* LAYER 4: Actionable & Activity Feed (Grid 2 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Quick Action Approval Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-neutral-900">
                Pencairan Butuh Review
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Permohonan penarikan dana cabang yang mendesak
              </p>
            </div>
            <Link
              to="/app/admin/withdrawals"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingWithdrawalsList.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-center">
              <ShieldCheck className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-emerald-900">Semua Pencairan Bersih</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Tidak ada permohonan dana yang menunggu persetujuan
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingWithdrawalsList.slice(0, 3).map((w: any) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block truncate">
                      {w.foodCourt?.name || 'Cabang Food Court'}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Bank {w.bankName || 'BCA'} • Rek: {w.bankAccountNumber || '-'}
                    </span>
                    <span className="font-mono font-bold text-xs text-emerald-700 block mt-1">
                      {formatRupiah(w.amount)}
                    </span>
                  </div>

                  {onProcessWithdrawal ? (
                    <button
                      type="button"
                      onClick={() => onProcessWithdrawal(w)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                    >
                      Proses
                    </button>
                  ) : (
                    <Link
                      to="/app/admin/withdrawals"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                    >
                      Proses
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Live Order Activity Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-neutral-900">
                Aktivitas Pesanan Real-Time
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Aliran transaksi terkini se-sistem
              </p>
            </div>
            <Link
              to="/app/admin/orders"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Lihat KDS <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-2.5">No. Order</th>
                  <th className="pb-2.5">Cabang / Stan</th>
                  <th className="pb-2.5">Nominal</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-400 text-xs">
                      Belum ada transaksi terekam
                    </td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 5).map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-neutral-50/50">
                      <td className="py-3 font-mono font-medium text-neutral-900 text-xs">
                        {ord.orderNumber || ord.id}
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-neutral-900 truncate max-w-[150px]">
                          {ord.tenantOrders?.[0]?.tenant?.name || 'Stan Kuliner'}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {ord.session?.foodCourt?.name || 'Cabang Sentra'}
                        </div>
                      </td>
                      <td className="py-3 font-mono font-bold text-neutral-900">
                        {formatRupiah(ord.totalAmount || 0)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
    </div>
  )
}
