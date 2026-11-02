import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  Store,
  Wallet,
  UtensilsCrossed,
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Flame,
} from 'lucide-react'
import { formatRupiah, formatDate } from '../../lib/utils'

export interface TenantDashboardStats {
  tenantInfo: {
    id: string
    name: string
    stallNumber: string
    foodCourtName: string
  }
  summary: {
    totalRevenue: number
    revenueGrowthPercentage: number
    walletBalance: number
    pendingWithdrawal: number
    totalPortionsSold: number
    averageOrderValue: number
    totalCompletedOrders: number
  }
  menuIntelligence: {
    topSellingMenus: Array<{
      menuId: string
      name: string
      categoryName: string
      portionsSold: number
      revenue: number
      contributionPercentage: number
      popularOption: string
    }>
    categoryDistribution: Array<{
      categoryName: string
      revenue: number
      percentage: number
    }>
    stockAlerts: Array<{
      menuId: string
      name: string
      categoryName: string
      status: string
    }>
  }
  peakHoursAndTrends: {
    peakHour: string
    hourlyBreakdown: Array<{
      hourLabel: string
      orderCount: number
      revenue: number
    }>
    dailyTrends: Array<{
      date: string
      revenue: number
      orderCount: number
    }>
  }
  recentWithdrawals: Array<{
    id: string
    amount: number
    status: string
    requestedAt: string
  }>
}

interface TenantAnalyticsWidgetsProps {
  stats: TenantDashboardStats | null
  isLoading: boolean
  range: string
  onRangeChange: (range: string) => void
  onOpenWithdrawalModal: () => void
}

const CATEGORY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

export function TenantAnalyticsWidgets({
  stats,
  isLoading,
  range,
  onRangeChange,
  onOpenWithdrawalModal,
}: TenantAnalyticsWidgetsProps) {
  const tenantInfo = stats?.tenantInfo || {
    id: '',
    name: 'Stan Kios Mitra',
    stallNumber: 'STAN-01',
    foodCourtName: 'Amici Food Court',
  }

  const summary = stats?.summary || {
    totalRevenue: 0,
    revenueGrowthPercentage: 0,
    walletBalance: 0,
    pendingWithdrawal: 0,
    totalPortionsSold: 0,
    averageOrderValue: 0,
    totalCompletedOrders: 0,
  }

  const menuIntel = stats?.menuIntelligence || {
    topSellingMenus: [],
    categoryDistribution: [],
    stockAlerts: [],
  }

  const peakAndTrends = stats?.peakHoursAndTrends || {
    peakHour: '12:00 - 13:00',
    hourlyBreakdown: [],
    dailyTrends: [],
  }

  const recentWithdrawals = stats?.recentWithdrawals || []

  return (
    <div className="space-y-6">
      {/* TOOLBAR HEADER */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-950">
            <Store className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs sm:text-sm">
              {tenantInfo.name}
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900 font-bold">
              {tenantInfo.stallNumber}
            </span>
          </div>

          <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
            • {tenantInfo.foodCourtName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Time Selector Pills */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200/60">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  range === pill.id
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <button
            type="button"
            onClick={onOpenWithdrawalModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Tarik Saldo</span>
          </button>

          <Link
            to="/app/tenant/orders"
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center gap-1"
          >
            <span>Dapur KDS</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* LAYER 1: Merchant KPI Strip (Grid 4 Kolom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Omzet Penjualan Stan */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-100 uppercase tracking-wide">
              Omzet Penjualan Stan
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-white/20 rounded-lg animate-pulse w-3/4" />
              ) : (
                formatRupiah(summary.totalRevenue)
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-100">
              {summary.revenueGrowthPercentage >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="text-emerald-200 font-bold">+{summary.revenueGrowthPercentage}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-200" />
                  <span className="text-rose-200 font-bold">{summary.revenueGrowthPercentage}%</span>
                </>
              )}
              <span>vs periode lalu</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Saldo Dompet Siap Tarik */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Saldo Dompet Siap Tarik
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
                formatRupiah(summary.walletBalance)
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-500 font-medium">
                {summary.pendingWithdrawal > 0
                  ? `Hold: ${formatRupiah(summary.pendingWithdrawal)}`
                  : 'Bebas penarikan'}
              </span>
              <button
                type="button"
                onClick={onOpenWithdrawalModal}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
              >
                Tarik <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI 3: Total Porsi Terjual */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Porsi Menu Terjual
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-neutral-200 rounded-lg animate-pulse w-1/2" />
              ) : (
                summary.totalPortionsSold.toLocaleString()
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Dari {summary.totalCompletedOrders.toLocaleString()} tiket pesanan selesai
            </p>
          </div>
        </div>

        {/* KPI 4: Average Order Value (AOV) */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Rata-rata Nilai Belanja (AOV)
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              {isLoading ? (
                <div className="h-8 bg-neutral-200 rounded-lg animate-pulse w-3/4" />
              ) : (
                formatRupiah(summary.averageOrderValue)
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Basket size per transaksi pelanggan
            </p>
          </div>
        </div>
      </div>

      {/* LAYER 2: Tren Omzet & Jam Sibuk (Grid 7:5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recharts Area Chart Tren Omzet (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">
                  Tren Dinamika Penjualan Stan
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pergerakan omzet harian stan Anda
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="h-64 rounded-2xl bg-neutral-100 animate-pulse flex items-center justify-center text-xs text-neutral-400">
                Memuat grafik tren...
              </div>
            ) : peakAndTrends.dailyTrends.length === 0 ? (
              <div className="h-64 rounded-2xl border border-dashed border-neutral-200 flex flex-col items-center justify-center p-6 text-center">
                <UtensilsCrossed className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-xs font-semibold text-neutral-700">Belum ada penjualan</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Data grafik akan muncul setelah pesanan diselesaikan
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={peakAndTrends.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tenantRevGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                      formatter={(val: any) => [formatRupiah(Number(val)), 'Omzet']}
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
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#tenantRevGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recharts Bar Chart Jam Sibuk (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">
                  Pola Jam Sibuk (Peak Hours)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Optimalisasi persiapan bahan dapur stan
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Paling Ramai: {peakAndTrends.peakHour}</span>
              </div>
            </div>

            {isLoading ? (
              <div className="h-64 rounded-2xl bg-neutral-100 animate-pulse flex items-center justify-center text-xs text-neutral-400">
                Memuat jam sibuk...
              </div>
            ) : peakAndTrends.hourlyBreakdown.length === 0 ? (
              <div className="h-64 rounded-2xl border border-dashed border-neutral-200 flex flex-col items-center justify-center p-6 text-center">
                <Clock className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-xs font-semibold text-neutral-700">Belum ada pola jam sibuk</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakAndTrends.hourlyBreakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="hourLabel"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        name === 'orderCount' ? `${val} pesanan` : formatRupiah(Number(val)),
                        name === 'orderCount' ? 'Jumlah Order' : 'Omzet',
                      ]}
                      labelFormatter={(label) => `Jam: ${label}`}
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="orderCount" fill="#10b981" radius={[6, 6, 0, 0]} name="orderCount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LAYER 3: Product Intelligence & Stok (Grid 7:5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Top 5 Menu Terlaris (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-neutral-900">
                Top 5 Menu Terlaris & Varian Favorit
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Produk dengan kontribusi omzet tertinggi
              </p>
            </div>
            <Link
              to="/app/tenant/menus"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Kelola Menu <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-2.5">Menu</th>
                  <th className="pb-2.5">Kategori</th>
                  <th className="pb-2.5">Porsi Laku</th>
                  <th className="pb-2.5">Omzet</th>
                  <th className="pb-2.5 text-right">Kontribusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {menuIntel.topSellingMenus.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-400 text-xs">
                      Belum ada penjualan menu pada rentang waktu ini
                    </td>
                  </tr>
                ) : (
                  menuIntel.topSellingMenus.map((menu, idx) => (
                    <tr key={menu.menuId || idx} className="hover:bg-neutral-50/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-[10px]">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-neutral-900 block truncate max-w-[160px]">
                              {menu.name}
                            </span>
                            <span className="text-[10px] text-neutral-500 block truncate max-w-[160px]">
                              Opsi: {menu.popularOption}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-neutral-600">
                        {menu.categoryName}
                      </td>
                      <td className="py-3 font-mono font-bold text-neutral-900">
                        {menu.portionsSold} porsi
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-700">
                        {formatRupiah(menu.revenue)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-mono font-bold text-xs text-neutral-800">
                          {menu.contributionPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Sebaran Kategori & Peringatan Stok (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Sebaran Kategori Donut */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs">
            <h4 className="font-heading font-bold text-sm text-neutral-900 mb-1">
              Sebaran Kategori Penjualan
            </h4>
            <p className="text-xs text-neutral-500 mb-3">
              Komposisi omzet per jenis hidangan
            </p>

            {menuIntel.categoryDistribution.length === 0 ? (
              <div className="h-40 w-full flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-dashed border-neutral-200">
                <AlertCircle className="w-7 h-7 text-neutral-300 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-600">Belum ada sebaran kategori</p>
                <p className="text-[10px] text-neutral-400">Belum ada transaksi menu pada periode ini</p>
              </div>
            ) : (
              <>
                <div className="h-40 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={menuIntel.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={4}
                        dataKey="revenue"
                        nameKey="categoryName"
                      >
                        {menuIntel.categoryDistribution.map((_, i) => (
                          <Cell key={`cat-${i}`} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatRupiah(Number(val)), 'Omzet']}
                        contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 mt-2">
                  {menuIntel.categoryDistribution.map((cat, i) => (
                    <div key={cat.categoryName} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-neutral-700">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                        />
                        {cat.categoryName}
                      </span>
                      <span className="font-mono font-bold text-neutral-900">
                        {cat.percentage}% ({formatRupiah(cat.revenue)})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Stock Alerts Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h4 className="font-heading font-bold text-sm text-neutral-900">
                  Peringatan Stok Habis
                </h4>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold">
                {menuIntel.stockAlerts.length} Menu
              </span>
            </div>

            {menuIntel.stockAlerts.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-center">
                <p className="text-xs font-bold text-emerald-900">Semua Menu Tersedia</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Tidak ada menu berstatus habis saat ini
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {menuIntel.stockAlerts.slice(0, 3).map((item) => (
                  <div
                    key={item.menuId}
                    className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-neutral-900 block truncate max-w-[170px]">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-neutral-500">{item.categoryName}</span>
                    </div>
                    <Link
                      to="/app/tenant/menus"
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                    >
                      Buka Stok
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LAYER 4: Transparansi Dompet & Riwayat Penarikan Dana */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-bold text-base text-neutral-900">
              Riwayat Pengajuan Penarikan Saldo Dompet
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Transparansi status pencairan dana stan ke rekening bank Anda
            </p>
          </div>
          <Link
            to="/app/tenant/wallet"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
          >
            Lihat Rekap Dompet <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <th className="pb-2.5">ID Pengajuan</th>
                <th className="pb-2.5">Nominal Pencairan</th>
                <th className="pb-2.5">Waktu Pengajuan</th>
                <th className="pb-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {recentWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-neutral-400 text-xs">
                    Belum ada riwayat pengajuan penarikan dana
                  </td>
                </tr>
              ) : (
                recentWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 font-mono font-medium text-neutral-900 text-xs">
                      {w.id}
                    </td>
                    <td className="py-3 font-mono font-bold text-neutral-900">
                      {formatRupiah(w.amount)}
                    </td>
                    <td className="py-3 text-neutral-500 font-mono text-xs">
                      {w.requestedAt ? formatDate(w.requestedAt) : '-'}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : w.status === 'PROCESSED'
                            ? 'bg-blue-100 text-blue-800'
                            : w.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.status}
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
