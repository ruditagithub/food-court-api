import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'
import { formatRupiah } from '../../lib/utils'

interface RevenueData {
  totalEarnedPlatformFee: number
  totalSubtotalVolume: number
  totalOrdersCount: number
  branchBreakdown: Array<{
    foodCourtId: string
    name: string
    slug: string
    balance: number
    totalOrders: number
    totalSubtotal: number
    platformFeeContributed: number
  }>
  monthlyTrends: Array<{
    month: string
    platformFee: number
    subtotal: number
    orderCount: number
  }>
  recentLogs: any[]
}

export function PlatformRevenuePage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReconciling, setIsReconciling] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<any | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch<any>('/api/super-admin/platform-revenue')
      if (res?.data) {
        setRevenue(res.data)
      }
    } catch (err: any) {
      toastError(err?.message || 'Gagal memuat laporan pendapatan platform')
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleReconcile = async () => {
    if (
      !confirm(
        'Jalankan proses rekonsiliasi biaya platform historis? Potongan 1% pada data lama akan dikembalikan ke saldo masing-masing tenant.',
      )
    ) {
      return
    }

    setIsReconciling(true)
    setReconcileResult(null)
    try {
      const res = await apiFetch<any>('/api/admin/system/reconcile-tenant-fees', {
        method: 'POST',
      })
      toastSuccess(res?.message || 'Rekonsiliasi biaya historis berhasil diselesaikan')
      setReconcileResult(res)
      fetchData()
    } catch (err: any) {
      toastError(err?.message || 'Gagal menjalankan rekonsiliasi fee historis')
    } finally {
      setIsReconciling(false)
    }
  }

  return (
    <InternalLayout>
      <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[#0a0a0a]">
              Pendapatan Fee Aplikasi Platform
            </h1>
            <p className="text-xs sm:text-sm text-[#737373] mt-1">
              Rekapitulasi fee aplikasi 1% dari total pesanan sentra yang diserap oleh cabang food court.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={isLoading}
              className="rounded-full px-4 text-xs font-semibold"
            >
              <Icons.Refresh className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Total Akumulasi Fee Platform (1%)</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
                <Icons.Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[#0a0a0a]">
                {formatRupiah(revenue?.totalEarnedPlatformFee || 0)}
              </div>
              <div className="text-[11px] text-[#737373] mt-1">
                Net income platform dari seluruh pesanan selesai
              </div>
            </div>
          </Card>

          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Total Volume GMV Transaksi</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                <Icons.ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[#0a0a0a]">
                {formatRupiah(revenue?.totalSubtotalVolume || 0)}
              </div>
              <div className="text-[11px] text-[#737373] mt-1">
                Akumulasi subtotal pesanan lintas seluruh cabang
              </div>
            </div>
          </Card>

          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Total Pesanan Selesai</span>
              <div className="w-8 h-8 rounded-full bg-[#fafafa] flex items-center justify-center text-[#737373]">
                <Icons.Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[#0a0a0a]">
                {revenue?.totalOrdersCount || 0}
              </div>
              <div className="text-[11px] text-[#737373] mt-1">
                Transaksi berhasil diselesaikan
              </div>
            </div>
          </Card>
        </div>

        {/* Branch Contribution Breakdown Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0a0a0a] uppercase tracking-wider">
              Kontribusi Fee per Cabang Food Court
            </h2>
            <span className="text-xs text-[#737373]">
              {revenue?.branchBreakdown?.length || 0} Cabang Terdaftar
            </span>
          </div>

          <Card className="rounded-[24px] border border-[#e5e5e5] bg-white overflow-hidden shadow-xs">
            {(!revenue?.branchBreakdown || revenue.branchBreakdown.length === 0) ? (
              <div className="p-10 text-center text-xs text-[#737373]">
                Belum ada data kontribusi cabang.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Nama Cabang Food Court</th>
                      <th className="py-3.5 px-4 font-mono text-center">Pesanan Selesai</th>
                      <th className="py-3.5 px-4 font-mono text-right">Volume Subtotal GMV</th>
                      <th className="py-3.5 px-4 font-mono text-right">Fee Terkumpul (1%)</th>
                      <th className="py-3.5 px-4 font-mono text-right">Saldo Kas Cabang Saat Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {revenue.branchBreakdown.map((branch) => (
                      <tr key={branch.foodCourtId} className="hover:bg-[#fafafa] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#0a0a0a] block">{branch.name}</span>
                          <span className="text-[10px] font-mono text-[#737373]">/{branch.slug}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-center font-medium text-[#0a0a0a]">
                          {branch.totalOrders}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-right text-[#0a0a0a]">
                          {formatRupiah(branch.totalSubtotal)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-right text-emerald-700">
                          {formatRupiah(branch.platformFeeContributed)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-right text-[#0a0a0a]">
                          {formatRupiah(branch.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Monthly Trend Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#0a0a0a] uppercase tracking-wider">
            Tren Pendapatan Bulanan
          </h2>

          <Card className="rounded-[24px] border border-[#e5e5e5] bg-white overflow-hidden shadow-xs">
            {(!revenue?.monthlyTrends || revenue.monthlyTrends.length === 0) ? (
              <div className="p-8 text-center text-xs text-[#737373]">
                Belum ada data transaksi bulanan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Bulan</th>
                      <th className="py-3.5 px-4 font-mono text-center">Jumlah Pesanan</th>
                      <th className="py-3.5 px-4 font-mono text-right">Volume GMV</th>
                      <th className="py-3.5 px-4 font-mono text-right">Fee Platform (1%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {revenue.monthlyTrends.map((t) => (
                      <tr key={t.month} className="hover:bg-[#fafafa] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0a0a0a]">
                          {t.month}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-center text-[#737373]">
                          {t.orderCount}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-right text-[#0a0a0a]">
                          {formatRupiah(t.subtotal)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-right text-emerald-700">
                          {formatRupiah(t.platformFee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Reconcile Tool Card */}
        <Card className="p-6 rounded-[26px] bg-[#fafafa] border border-[#e5e5e5] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Icons.Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="font-heading text-base font-bold text-[#0a0a0a]">
                  Rekonsiliasi Fee Historis Tenant (Model Penyerapan Cabang)
                </h3>
              </div>
              <p className="text-xs text-[#737373] mt-1.5 max-w-2xl leading-relaxed">
                Pada model sistem sebelumnya, fee 1% sempat dipotong dari penjualan kotor stan tenant. Gunakan alat ini untuk memindai seluruh data transaksi lama, mengembalikan 100% potongan fee kembali ke saldo masing-masing tenant (FEE_REIMBURSEMENT / ADJUSTMENT), dan menyelaraskan buku besar akuntansi.
              </p>
              {reconcileResult && (
                <div className="mt-3 p-3 rounded-[16px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {reconcileResult.message}
                </div>
              )}
            </div>

            <Button
              onClick={handleReconcile}
              disabled={isReconciling}
              className="rounded-full px-5 py-2.5 bg-[#0a0a0a] text-white hover:bg-[#262626] text-xs font-semibold shrink-0"
            >
              {isReconciling ? 'Menjalankan Rekonsiliasi...' : 'Jalankan Rekonsiliasi'}
            </Button>
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
}
