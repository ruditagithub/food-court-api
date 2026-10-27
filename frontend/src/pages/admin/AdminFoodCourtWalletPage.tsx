import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { FoodCourtWithdrawalModal } from '../../components/foodcourt/FoodCourtWithdrawalModal'
import { FoodCourtReceiptModal } from '../../components/foodcourt/FoodCourtReceiptModal'
import { formatDate, formatRupiah } from '../../lib/utils'

interface FoodCourtWalletSummary {
  foodCourt: {
    id: string
    name: string
    slug: string
  }
  balance: number
  bankInfo: {
    bankName?: string | null
    bankAccountNumber?: string | null
    bankAccountHolder?: string | null
  }
  totalWithdrawn: number
  pendingWithdrawal: number
  totalPlatformFeePaid: number
  recentLogs: any[]
}

export function AdminFoodCourtWalletPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [wallet, setWallet] = useState<FoodCourtWalletSummary | null>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'ledger'>('withdrawals')

  // Modals
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([
        apiFetch<any>('/api/admin/food-court/wallet'),
        apiFetch<any>('/api/admin/food-court/withdrawals'),
      ])

      if (walletRes?.data) {
        setWallet(walletRes.data)
      }
      if (withdrawalsRes?.data) {
        setWithdrawals(withdrawalsRes.data)
      }
    } catch (err: any) {
      toastError(err?.message || 'Gagal memuat data dompet cabang food court')
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleWithdrawSubmit = async (data: any) => {
    try {
      await apiFetch('/api/admin/food-court/withdrawals', {
        method: 'POST',
        body: data,
      })
      toastSuccess('Pengajuan penarikan dana cabang berhasil dikirim ke Super Admin')
      fetchData()
    } catch (err: any) {
      throw new Error(err?.message || 'Gagal mengajukan penarikan dana cabang')
    }
  }

  const handleConfirmReceipt = async (withdrawalId: string) => {
    setConfirmingId(withdrawalId)
    try {
      await apiFetch(`/api/admin/food-court/withdrawals/${withdrawalId}/confirm`, {
        method: 'POST',
      })
      toastSuccess('Penerimaan transfer dana berhasil dikonfirmasi!')
      fetchData()
    } catch (err: any) {
      toastError(err?.message || 'Gagal mengonfirmasi penerimaan transfer')
    } finally {
      setConfirmingId(null)
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="soft" className="bg-amber-50 text-amber-800 border-amber-200">
            Menunggu Super Admin
          </Badge>
        )
      case 'PROCESSED':
        return (
          <Badge variant="soft" className="bg-blue-50 text-blue-800 border-blue-200">
            Transfer Diproses
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge variant="soft" className="bg-emerald-50 text-emerald-800 border-emerald-200">
            Selesai Dicairkan
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="soft" className="bg-red-50 text-red-800 border-red-200">
            Ditolak (Saldo Dikembalikan)
          </Badge>
        )
      default:
        return <Badge variant="soft">{status}</Badge>
    }
  }

  const renderMutationTypeBadge = (type: string) => {
    switch (type) {
      case 'ORDER_SETTLEMENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            + Settlement Pesanan
          </span>
        )
      case 'WITHDRAWAL_HOLD':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            - Hold Pencairan
          </span>
        )
      case 'WITHDRAWAL_REFUND':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            + Refund Penolakan
          </span>
        )
      case 'WITHDRAWAL_COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Pencairan Selesai
          </span>
        )
      case 'ADJUSTMENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300">
            Penyesuaian Sistem
          </span>
        )
      default:
        return <span className="text-[11px] font-mono text-[#737373]">{type}</span>
    }
  }

  const latestPendingOrProcessed = withdrawals.find(
    (w) => w.status === 'PENDING' || w.status === 'PROCESSED',
  )

  return (
    <InternalLayout>
      <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[#0a0a0a]">
                Dompet Cabang Food Court
              </h1>
              {wallet?.foodCourt && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f0f0f0] text-[#0a0a0a] border border-[#e5e5e5]">
                  {wallet.foodCourt.name}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#737373] mt-1">
              Pusat kas operasional cabang, penerimaan biaya layanan & pajak, pemotongan fee sentra 1%, dan penarikan dana ke rekening bank manajemen.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={isLoading}
              className="rounded-full px-4 text-xs font-semibold"
            >
              <Icons.Refresh className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              onClick={() => setWithdrawalModalOpen(true)}
              className="rounded-full px-5 py-2.5 bg-[#0a0a0a] text-white hover:bg-[#262626] shadow-xs text-xs sm:text-sm font-semibold flex items-center gap-2"
            >
              <Icons.Plus className="w-4 h-4" />
              <span>Tarik Saldo Cabang</span>
            </Button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Bersih */}
          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-[#737373]">Saldo Bersih Kas Cabang</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
                <Icons.CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(wallet?.balance || 0)}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f0f0f0]">
                <span className="text-[11px] text-[#737373]">
                  {wallet?.pendingWithdrawal && wallet.pendingWithdrawal > 0
                    ? `${formatRupiah(wallet.pendingWithdrawal)} tertahan`
                    : 'Siap ditarik'}
                </span>
                <button
                  type="button"
                  onClick={() => setWithdrawalModalOpen(true)}
                  className="text-[11px] font-bold text-[#047857] hover:underline"
                >
                  Tarik Dana &rarr;
                </button>
              </div>
            </div>
          </Card>

          {/* Card 2: 1% Fee Aplikasi Sentra */}
          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Total Fee Aplikasi Sentra (1%)</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                <Icons.Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(wallet?.totalPlatformFeePaid || 0)}
              </div>
              <div className="text-[11px] text-[#737373] mt-2 pt-2 border-t border-[#f0f0f0]">
                Diserap cabang dari subtotal pesanan
              </div>
            </div>
          </Card>

          {/* Card 3: Antrean Pencairan Aktif */}
          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Antrean Pencairan Aktif</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
                <Icons.AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(wallet?.pendingWithdrawal || 0)}
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-2 pt-2 border-t border-[#f0f0f0]">
                {withdrawals.filter((w) => w.status === 'PENDING' || w.status === 'PROCESSED').length} pengajuan menunggu pencairan
              </div>
            </div>
          </Card>

          {/* Card 4: Total Telah Dicairkan */}
          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Total Telah Dicairkan</span>
              <div className="w-8 h-8 rounded-full bg-[#fafafa] flex items-center justify-center text-[#737373]">
                <Icons.Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(wallet?.totalWithdrawn || 0)}
              </div>
              <div className="text-[11px] text-[#737373] mt-2 pt-2 border-t border-[#f0f0f0]">
                {withdrawals.filter((w) => w.status === 'COMPLETED').length} kali transfer berhasil
              </div>
            </div>
          </Card>
        </div>

        {/* Live Active Withdrawal Banner */}
        {latestPendingOrProcessed && (
          <div className="p-5 rounded-[24px] bg-blue-50/70 border border-blue-200 text-[#0a0a0a] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <Icons.CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Status Pengajuan Pencairan Aktif
                  </span>
                  {renderStatusBadge(latestPendingOrProcessed.status)}
                </div>
                <div className="text-sm font-semibold text-[#0a0a0a] mt-0.5">
                  {formatRupiah(latestPendingOrProcessed.amount)} &bull; Rekening {latestPendingOrProcessed.bankName} {latestPendingOrProcessed.bankAccountNumber} a/n {latestPendingOrProcessed.bankAccountHolder}
                </div>
                <div className="text-[11px] text-[#737373] font-mono mt-0.5">
                  Diajukan pada {formatDate(latestPendingOrProcessed.requestedAt)}
                  {latestPendingOrProcessed.transferReference && ` | Ref: ${latestPendingOrProcessed.transferReference}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {latestPendingOrProcessed.proofReceiptUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedWithdrawal(latestPendingOrProcessed)
                    setReceiptModalOpen(true)
                  }}
                  className="rounded-full text-xs"
                >
                  <Icons.Eye className="w-3.5 h-3.5 mr-1" />
                  Lihat Bukti Transfer
                </Button>
              )}

              {latestPendingOrProcessed.status === 'PROCESSED' && (
                <Button
                  size="sm"
                  disabled={confirmingId === latestPendingOrProcessed.id}
                  onClick={() => handleConfirmReceipt(latestPendingOrProcessed.id)}
                  className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {confirmingId === latestPendingOrProcessed.id ? (
                    'Memproses...'
                  ) : (
                    <>
                      <Icons.Check className="w-3.5 h-3.5 mr-1" />
                      Konfirmasi Terima Dana
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 2 Tabs: Mutasi Buku Kas & Riwayat Penarikan */}
        <div className="space-y-4">
          <div className="flex items-center border-b border-[#e5e5e5] gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('withdrawals')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === 'withdrawals'
                  ? 'text-[#0a0a0a]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Riwayat Penarikan Dana ({withdrawals.length})
              {activeTab === 'withdrawals' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a0a0a] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === 'ledger'
                  ? 'text-[#0a0a0a]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Mutasi Buku Kas & Fee ({wallet?.recentLogs?.length || 0})
              {activeTab === 'ledger' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a0a0a] rounded-full" />
              )}
            </button>
          </div>

          {/* TAB 1: Riwayat Penarikan Dana */}
          {activeTab === 'withdrawals' && (
            <Card className="rounded-[24px] border border-[#e5e5e5] bg-white overflow-hidden shadow-xs">
              {withdrawals.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#737373]">
                  <Icons.CreditCard className="w-8 h-8 text-[#a3a3a3] mx-auto mb-2" />
                  <p className="font-semibold text-sm text-[#0a0a0a]">Belum Ada Riwayat Penarikan</p>
                  <p className="mt-1">
                    Ajukan penarikan dana saldo kas cabang food court Anda kapan saja dengan tombol "Tarik Saldo Cabang".
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Tanggal Pengajuan</th>
                        <th className="py-3.5 px-4">Nominal</th>
                        <th className="py-3.5 px-4">Rekening Tujuan</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Referensi / Catatan</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f0f0]">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-[#fafafa] transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[#737373]">
                            {formatDate(w.requestedAt)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#0a0a0a]">
                            {formatRupiah(w.amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-[#0a0a0a] block">
                              {w.bankName} - {w.bankAccountNumber}
                            </span>
                            <span className="text-[11px] text-[#737373] block">
                              a/n {w.bankAccountHolder}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">{renderStatusBadge(w.status)}</td>
                          <td className="py-3.5 px-4">
                            {w.transferReference ? (
                              <span className="font-mono text-blue-600 font-bold block">
                                Ref: {w.transferReference}
                              </span>
                            ) : null}
                            {w.adminNotes ? (
                              <span className="text-[11px] text-[#737373] line-clamp-1 block">
                                {w.adminNotes}
                              </span>
                            ) : null}
                            {!w.transferReference && !w.adminNotes && (
                              <span className="text-[#a3a3a3]">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {w.proofReceiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedWithdrawal(w)
                                    setReceiptModalOpen(true)
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-[#f0f0f0] hover:bg-[#e5e5e5] text-[#0a0a0a] text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  Bukti Struk
                                </button>
                              )}

                              {w.status === 'PROCESSED' && (
                                <button
                                  type="button"
                                  disabled={confirmingId === w.id}
                                  onClick={() => handleConfirmReceipt(w.id)}
                                  className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  {confirmingId === w.id ? 'Memproses...' : 'Konfirmasi'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: Mutasi Buku Kas & Fee */}
          {activeTab === 'ledger' && (
            <Card className="rounded-[24px] border border-[#e5e5e5] bg-white overflow-hidden shadow-xs">
              {(!wallet?.recentLogs || wallet.recentLogs.length === 0) ? (
                <div className="p-12 text-center text-xs text-[#737373]">
                  <Icons.Layers className="w-8 h-8 text-[#a3a3a3] mx-auto mb-2" />
                  <p className="font-semibold text-sm text-[#0a0a0a]">Belum Ada Catatan Mutasi Kas</p>
                  <p className="mt-1">
                    Setiap transaksi pesanan selesai akan mencatat pendapatan biaya layanan, pajak, dan fee aplikasi sentra 1% di sini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Waktu</th>
                        <th className="py-3.5 px-4">Tipe Mutasi</th>
                        <th className="py-3.5 px-4">Deskripsi / Ref</th>
                        <th className="py-3.5 px-4 text-right">Service (3%)</th>
                        <th className="py-3.5 px-4 text-right">PB1 (10%)</th>
                        <th className="py-3.5 px-4 text-right">Fee 1%</th>
                        <th className="py-3.5 px-4 text-right">Mutasi Bersih</th>
                        <th className="py-3.5 px-4 text-right">Saldo Kas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f0f0]">
                      {wallet.recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#fafafa] transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[#737373]">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            {renderMutationTypeBadge(log.type)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-[#0a0a0a] block">
                              {log.description || '-'}
                            </span>
                            {log.order && (
                              <span className="text-[10px] font-mono text-[#737373]">
                                Pesanan #{log.order.orderNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right text-emerald-700">
                            {log.serviceFee > 0 ? `+${formatRupiah(log.serviceFee)}` : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right text-emerald-700">
                            {log.taxAmount > 0 ? `+${formatRupiah(log.taxAmount)}` : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right text-red-600">
                            {log.platformFee > 0 ? `-${formatRupiah(log.platformFee)}` : '-'}
                          </td>
                          <td
                            className={`py-3.5 px-4 font-mono font-bold text-right ${
                              log.netAmount >= 0 ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {log.netAmount >= 0 ? `+${formatRupiah(log.netAmount)}` : formatRupiah(log.netAmount)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-[#0a0a0a]">
                            {formatRupiah(log.balanceAfter)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Modals */}
        <FoodCourtWithdrawalModal
          isOpen={withdrawalModalOpen}
          onClose={() => setWithdrawalModalOpen(false)}
          currentBalance={wallet?.balance || 0}
          defaultBank={wallet?.bankInfo}
          onSubmit={handleWithdrawSubmit}
        />

        <FoodCourtReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false)
            setSelectedWithdrawal(null)
          }}
          withdrawal={selectedWithdrawal}
        />
      </div>
    </InternalLayout>
  )
}
