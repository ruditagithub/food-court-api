import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { ProcessFoodCourtWithdrawalModal } from '../../components/superadmin/ProcessFoodCourtWithdrawalModal'
import { FoodCourtReceiptModal } from '../../components/foodcourt/FoodCourtReceiptModal'
import { formatDate, formatRupiah } from '../../lib/utils'

export function SuperAdminWithdrawalsPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)

  // Modals
  const [processModalOpen, setProcessModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (selectedFoodCourtId !== 'ALL') params.append('foodCourtId', selectedFoodCourtId)

      const [withdrawalsRes, courtsRes] = await Promise.all([
        apiFetch<any>(`/api/super-admin/withdrawals?${params.toString()}`),
        apiFetch<any>('/api/food-courts'),
      ])

      if (withdrawalsRes?.data) {
        setWithdrawals(withdrawalsRes.data)
      }
      if (courtsRes?.data) {
        setFoodCourts(courtsRes.data)
      }
    } catch (err: any) {
      toastError(err?.message || 'Gagal memuat antrean pencairan cabang food court')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, selectedFoodCourtId, toastError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleProcess = async (id: string, data: any) => {
    try {
      await apiFetch(`/api/super-admin/withdrawals/${id}/process`, {
        method: 'POST',
        body: data,
      })
      toastSuccess('Pengajuan pencairan berhasil diproses dan bukti tersimpan')
      fetchData()
    } catch (err: any) {
      throw new Error(err?.message || 'Gagal memproses penarikan')
    }
  }

  const handleReject = async (id: string, reason: string) => {
    try {
      await apiFetch(`/api/super-admin/withdrawals/${id}/reject`, {
        method: 'POST',
        body: { reason },
      })
      toastSuccess('Pengajuan berhasil ditolak dan saldo otomatis dikembalikan ke cabang')
      fetchData()
    } catch (err: any) {
      throw new Error(err?.message || 'Gagal menolak pengajuan')
    }
  }

  const handleCompleteDirect = async (id: string) => {
    try {
      await apiFetch(`/api/super-admin/withdrawals/${id}/complete`, {
        method: 'POST',
      })
      toastSuccess('Pencairan dana berhasil diselesaikan')
      setProcessModalOpen(false)
      fetchData()
    } catch (err: any) {
      toastError(err?.message || 'Gagal menyelesaikan pencairan')
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="soft" className="bg-amber-50 text-amber-800 border-amber-200">
            Menunggu Verifikasi
          </Badge>
        )
      case 'PROCESSED':
        return (
          <Badge variant="soft" className="bg-blue-50 text-blue-800 border-blue-200">
            Transfer Terkirim
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge variant="soft" className="bg-emerald-50 text-emerald-800 border-emerald-200">
            Selesai
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="soft" className="bg-red-50 text-red-800 border-red-200">
            Ditolak & Refund
          </Badge>
        )
      default:
        return <Badge variant="soft">{status}</Badge>
    }
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING')
  const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0)
  const processedWithdrawals = withdrawals.filter((w) => w.status === 'PROCESSED')
  const completedWithdrawals = withdrawals.filter((w) => w.status === 'COMPLETED')
  const totalCompletedAmount = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0)

  return (
    <InternalLayout>
      <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[#0a0a0a]">
              Pencairan Dana Cabang Food Court
            </h1>
            <p className="text-xs sm:text-sm text-[#737373] mt-1">
              Verifikasi transfer dana kas operasional dari rekening sentra platform ke rekening manajemen cabang food court.
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
              Segarkan Data
            </Button>
          </div>
        </div>

        {/* 3 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Menunggu Verifikasi Transfer</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
                <Icons.AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(totalPendingAmount)}
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-1">
                {pendingWithdrawals.length} pengajuan antre diproses
              </div>
            </div>
          </Card>

          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Sedang Diproses Cabang</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                <Icons.CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                {processedWithdrawals.length} Pengajuan
              </div>
              <div className="text-[11px] text-[#737373] mt-1">
                Menunggu konfirmasi penerimaan oleh pengelola cabang
              </div>
            </div>
          </Card>

          <Card className="p-5 rounded-[26px] bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737373]">Total Selesai Dicairkan</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
                <Icons.Check className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(totalCompletedAmount)}
              </div>
              <div className="text-[11px] text-[#737373] mt-1">
                {completedWithdrawals.length} transaksi pencairan tuntas
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[22px] bg-white border border-[#e5e5e5] shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'PENDING', 'PROCESSED', 'COMPLETED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'bg-[#fafafa] text-[#737373] hover:text-[#0a0a0a] border border-[#e5e5e5]'
                }`}
              >
                {st === 'ALL'
                  ? 'Semua Status'
                  : st === 'PENDING'
                    ? 'Menunggu'
                    : st === 'PROCESSED'
                      ? 'Diproses'
                      : st === 'COMPLETED'
                        ? 'Selesai'
                        : 'Ditolak'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737373] whitespace-nowrap">Cabang:</span>
            <select
              value={selectedFoodCourtId}
              onChange={(e) => setSelectedFoodCourtId(e.target.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#e5e5e5] bg-white text-[#0a0a0a] focus:outline-hidden"
            >
              <option value="ALL">Seluruh Cabang Food Court</option>
              {foodCourts.map((fc) => (
                <option key={fc.id} value={fc.id}>
                  {fc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Requests Table */}
        <Card className="rounded-[24px] border border-[#e5e5e5] bg-white overflow-hidden shadow-xs">
          {withdrawals.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#737373]">
              <Icons.CreditCard className="w-8 h-8 text-[#a3a3a3] mx-auto mb-2" />
              <p className="font-semibold text-sm text-[#0a0a0a]">Tidak Ada Pengajuan Pencairan</p>
              <p className="mt-1">
                Semua pengajuan pencairan dana kas cabang yang cocok dengan filter akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Cabang Food Court</th>
                    <th className="py-3.5 px-4">Waktu Pengajuan</th>
                    <th className="py-3.5 px-4">Rekening Transfer</th>
                    <th className="py-3.5 px-4 font-mono text-right">Nominal</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Ref / Catatan</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-[#fafafa] transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#0a0a0a] block">
                          {w.foodCourt?.name || 'Cabang'}
                        </span>
                        <span className="text-[11px] text-[#737373] block">
                          Diajukan: {w.requester?.name || 'Pengelola'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#737373]">
                        {formatDate(w.requestedAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#0a0a0a] block">
                          {w.bankName} - {w.bankAccountNumber}
                        </span>
                        <span className="text-[11px] text-[#737373] block">
                          a/n {w.bankAccountHolder}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-right text-[#0a0a0a]">
                        {formatRupiah(w.amount)}
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
                          {w.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWithdrawal(w)
                                setProcessModalOpen(true)
                              }}
                              className="px-3 py-1 rounded-full bg-[#0a0a0a] hover:bg-[#262626] text-white text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              Proses Transfer
                            </button>
                          )}

                          {w.proofReceiptUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWithdrawal(w)
                                setReceiptModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-full bg-[#f0f0f0] hover:bg-[#e5e5e5] text-[#0a0a0a] text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              Lihat Bukti
                            </button>
                          )}

                          {w.status === 'PROCESSED' && (
                            <button
                              type="button"
                              onClick={() => handleCompleteDirect(w.id)}
                              className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              Selesaikan
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

        {/* Modals */}
        <ProcessFoodCourtWithdrawalModal
          isOpen={processModalOpen}
          onClose={() => {
            setProcessModalOpen(false)
            setSelectedWithdrawal(null)
          }}
          withdrawal={selectedWithdrawal}
          onProcess={handleProcess}
          onReject={handleReject}
          onCompleteDirect={handleCompleteDirect}
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
