import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { WithdrawalModal } from '../../components/tenant/WithdrawalModal'
import { ReceiptViewerModal } from '../../components/tenant/ReceiptViewerModal'
import { formatDate, formatRupiah } from '../../lib/utils'

interface WalletSummary {
  tenantId: string
  tenantName: string
  stallNumber: string
  balance: number
  grossTotal: number
  feeTotal: number
  disbursedTotal: number
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountHolder?: string | null
  logs: any[]
}

export function TenantWalletPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [wallet, setWallet] = useState<WalletSummary | null>(null)
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
        apiFetch<any>('/api/tenants/wallet'),
        apiFetch<any>('/api/tenants/withdrawals'),
      ])

      if (walletRes?.data) {
        setWallet(walletRes.data)
      }
      if (withdrawalsRes?.data) {
        setWithdrawals(withdrawalsRes.data)
      }
    } catch (err: any) {
      toastError(err?.message || 'Gagal memuat data dompet stan')
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleWithdrawSubmit = async (data: any) => {
    try {
      await apiFetch('/api/tenants/withdrawals', {
        method: 'POST',
        body: data,
      })
      toastSuccess('Pengajuan penarikan dana berhasil dikirim')
      fetchData()
    } catch (err: any) {
      throw new Error(err?.message || 'Gagal mengirim pengajuan penarikan')
    }
  }

  const handleConfirmReceipt = async (withdrawalId: string) => {
    setConfirmingId(withdrawalId)
    try {
      await apiFetch(`/api/tenants/withdrawals/${withdrawalId}/confirm`, {
        method: 'PATCH',
      })
      toastSuccess('Penerimaan dana berhasil dikonfirmasi!')
      fetchData()
    } catch (err: any) {
      toastError(err?.message || 'Gagal mengonfirmasi penerimaan dana')
    } finally {
      setConfirmingId(null)
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="soft" className="bg-amber-50 text-amber-800 border-amber-200">
            Menunggu Admin
          </Badge>
        )
      case 'PROCESSED':
        return (
          <Badge variant="soft" className="bg-blue-50 text-blue-700 border-blue-200">
            Sudah Ditransfer
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge variant="soft" className="bg-emerald-50 text-emerald-800 border-emerald-200">
            Selesai (Diterima)
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="soft" className="bg-red-50 text-red-700 border-red-200">
            Ditolak
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const renderMutationTypeBadge = (type: string) => {
    switch (type) {
      case 'ORDER_REVENUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Icons.Plus className="w-3 h-3" /> Pemasukan Pesanan
          </span>
        )
      case 'WITHDRAWAL_HOLD':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Icons.Minus className="w-3 h-3" /> Penarikan (Hold)
          </span>
        )
      case 'WITHDRAWAL_REFUND':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Icons.Refresh className="w-3 h-3" /> Pengembalian Saldo
          </span>
        )
      case 'WITHDRAWAL_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300">
            <Icons.Check className="w-3 h-3" /> Penarikan Selesai
          </span>
        )
      default:
        return <span className="text-xs text-[#737373]">{type}</span>
    }
  }

  return (
    <InternalLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a0a0a]">
                Dompet & Saldo Stan
              </h1>
              {wallet && (
                <Badge variant="outline" className="text-xs font-mono">
                  No. Stan: {wallet.stallNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#737373] mt-1">
              Pantau riwayat pendapatan kotor, potongan biaya aplikasi 1%, dan pencairan saldo Anda.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => setWithdrawalModalOpen(true)}
            disabled={isLoading || !wallet || wallet.balance < 10000}
            className="rounded-[18px] px-5 h-11 text-xs font-bold gap-2 shrink-0 shadow-xs"
          >
            <Icons.CreditCard className="w-4 h-4" />
            <span>Ajukan Penarikan Dana</span>
          </Button>
        </div>

        {/* Hero Balance & Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main Active Balance Hero */}
          <div className="md:col-span-5 p-6 rounded-[28px] bg-[#0a0a0a] text-white shadow-xl flex flex-col justify-between border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono tracking-wider uppercase text-white/60">
                  Saldo Tersedia untuk Ditarik
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="mt-3">
                <span className="font-mono text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {wallet ? formatRupiah(wallet.balance) : 'Rp 0'}
                </span>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/60">Nama Stan:</span>
              <span className="font-bold text-white">{wallet?.tenantName || '-'}</span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Gross Revenue */}
            <Card surface="paper" className="p-5 rounded-[24px] space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#737373]">
                <span className="text-xs font-semibold">Penjualan Kotor</span>
                <Icons.Chart className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="font-mono text-xl sm:text-2xl font-bold text-[#0a0a0a]">
                  {wallet ? formatRupiah(wallet.grossTotal) : 'Rp 0'}
                </p>
                <p className="text-[11px] text-[#737373] mt-1">
                  Akumulasi subtotal pesanan lunas
                </p>
              </div>
            </Card>

            {/* Platform Fee 1% */}
            <Card surface="paper" className="p-5 rounded-[24px] space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#737373]">
                <span className="text-xs font-semibold">Biaya Aplikasi (1%)</span>
                <Icons.Shield className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="font-mono text-xl sm:text-2xl font-bold text-neutral-600">
                  {wallet ? formatRupiah(wallet.feeTotal) : 'Rp 0'}
                </p>
                <p className="text-[11px] text-[#737373] mt-1">
                  Potongan 1% pemilik aplikasi
                </p>
              </div>
            </Card>

            {/* Disbursed Total */}
            <Card surface="paper" className="p-5 rounded-[24px] space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#737373]">
                <span className="text-xs font-semibold">Telah Dicairkan</span>
                <Icons.Check className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-700">
                  {wallet ? formatRupiah(wallet.disbursedTotal) : 'Rp 0'}
                </p>
                <p className="text-[11px] text-[#737373] mt-1">
                  Total dana yang telah diterima
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Default Bank Details Banner */}
        {wallet && (wallet.bankName || wallet.bankAccountNumber) && (
          <div className="p-4 rounded-[20px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                <Icons.CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[#737373] block text-[11px]">Rekening Pencairan Utama:</span>
                <span className="font-bold text-[#0a0a0a]">
                  {wallet.bankName} - {wallet.bankAccountNumber} (a.n. {wallet.bankAccountHolder || '-'})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWithdrawalModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors underline cursor-pointer self-start sm:self-auto"
            >
              Ubah saat ajukan penarikan
            </button>
          </div>
        )}

        {/* Content Navigation Tabs */}
        <div className="border-b border-[#e5e5e5] flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'text-[#0a0a0a]'
                : 'text-[#737373] hover:text-[#0a0a0a]'
            }`}
          >
            <span>Riwayat Pengajuan Penarikan</span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-neutral-200 text-[#0a0a0a] font-mono">
              {withdrawals.length}
            </span>
            {activeTab === 'withdrawals' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0a0a0a]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'ledger'
                ? 'text-[#0a0a0a]'
                : 'text-[#737373] hover:text-[#0a0a0a]'
            }`}
          >
            <span>Buku Kas & Mutasi Saldo</span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-neutral-200 text-[#0a0a0a] font-mono">
              {wallet?.logs?.length || 0}
            </span>
            {activeTab === 'ledger' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0a0a0a]" />
            )}
          </button>
        </div>

        {/* TAB 1: WITHDRAWALS TABLE */}
        {activeTab === 'withdrawals' && (
          <Card surface="paper" className="p-0 rounded-[24px] overflow-hidden border border-[#e5e5e5]">
            {withdrawals.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#737373]">
                Belum ada pengajuan penarikan dana yang dibuat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] uppercase text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4">Tanggal Pengajuan</th>
                      <th className="py-3 px-4">Nominal</th>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4">Tujuan Rekening</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[#737373]">
                          {formatDate(w.requestedAt || w.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0a0a0a] text-sm">
                          {formatRupiah(w.amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-[#0a0a0a]">
                            {w.paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Tunai (Cash)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#737373]">
                          {w.paymentMethod === 'TRANSFER' ? (
                            <div>
                              <span className="font-semibold text-[#0a0a0a] block">
                                {w.bankName} - {w.bankAccountNumber}
                              </span>
                              <span className="text-[11px]">a.n. {w.bankAccountHolder}</span>
                            </div>
                          ) : (
                            <span>Kasir / Pengelola Food Court</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(w.status)}
                          {w.status === 'REJECTED' && w.adminNotes && (
                            <p className="text-[11px] text-red-600 mt-1">
                              Alasan: {w.adminNotes}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Receipt Button */}
                            {(w.status === 'PROCESSED' || w.status === 'COMPLETED') && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedWithdrawal(w)
                                  setReceiptModalOpen(true)
                                }}
                                className="h-8 text-xs rounded-[12px] gap-1 font-semibold"
                              >
                                <Icons.Eye className="w-3.5 h-3.5" />
                                <span>Lihat Bukti</span>
                              </Button>
                            )}

                            {/* Confirm Received Button */}
                            {w.status === 'PROCESSED' && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleConfirmReceipt(w.id)}
                                disabled={confirmingId === w.id}
                                className="h-8 text-xs rounded-[12px] gap-1 font-bold bg-emerald-600 hover:bg-emerald-700"
                              >
                                {confirmingId === w.id ? (
                                  <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Icons.Check className="w-3.5 h-3.5" />
                                )}
                                <span>Sudah Terima Dana</span>
                              </Button>
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

        {/* TAB 2: LEDGER / MUTASI TABLE */}
        {activeTab === 'ledger' && (
          <Card surface="paper" className="p-0 rounded-[24px] overflow-hidden border border-[#e5e5e5]">
            {!wallet?.logs || wallet.logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#737373]">
                Belum ada rekaman mutasi pendapatan atau penarikan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] uppercase text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Tipe Mutasi</th>
                      <th className="py-3 px-4">Penjualan Kotor</th>
                      <th className="py-3 px-4">Fee 1%</th>
                      <th className="py-3 px-4">Mutasi Saldo</th>
                      <th className="py-3 px-4">Saldo Akhir</th>
                      <th className="py-3 px-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {wallet.logs.map((log) => {
                      const isPositive = log.netAmount > 0
                      const isZero = log.netAmount === 0
                      return (
                        <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[#737373]">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            {renderMutationTypeBadge(log.type)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#737373]">
                            {log.grossAmount > 0 ? formatRupiah(log.grossAmount) : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-500">
                            {log.platformFee > 0 ? formatRupiah(log.platformFee) : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-sm">
                            <span
                              className={
                                isPositive
                                  ? 'text-emerald-600'
                                  : isZero
                                    ? 'text-[#737373]'
                                    : 'text-red-600'
                              }
                            >
                              {isPositive ? `+${formatRupiah(log.netAmount)}` : formatRupiah(log.netAmount)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0a0a0a]">
                            {formatRupiah(log.balanceAfter)}
                          </td>
                          <td className="py-3.5 px-4 text-[#737373] max-w-[280px] truncate">
                            {log.description}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Withdrawal Request Modal */}
        <WithdrawalModal
          isOpen={withdrawalModalOpen}
          onClose={() => setWithdrawalModalOpen(false)}
          currentBalance={wallet?.balance || 0}
          defaultBank={{
            bankName: wallet?.bankName,
            bankAccountNumber: wallet?.bankAccountNumber,
            bankAccountHolder: wallet?.bankAccountHolder,
          }}
          onSubmit={handleWithdrawSubmit}
        />

        {/* Receipt Viewer Modal */}
        <ReceiptViewerModal
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
