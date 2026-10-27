import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { ProcessWithdrawalModal } from '../../components/admin/ProcessWithdrawalModal'
import { ReceiptViewerModal } from '../../components/tenant/ReceiptViewerModal'
import { formatDate, formatRupiah } from '../../lib/utils'

export function AdminWithdrawalsPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Modals
  const [processModalOpen, setProcessModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null)

  const fetchWithdrawals = useCallback(async () => {
    setIsLoading(true)
    try {
      const queryParam = statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''
      const res = await apiFetch<any>(`/api/admin/withdrawals${queryParam}`)
      if (res?.data) {
        setWithdrawals(res.data)
      }
    } catch (err: any) {
      toastError(err?.message || 'Gagal memuat data pencairan dana')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, toastError])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const handleProcess = async (id: string, data: any) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/process`, {
        method: 'PATCH',
        body: data,
      })
      toastSuccess('Pencairan dana berhasil diproses & bukti tersimpan')
      fetchWithdrawals()
    } catch (err: any) {
      throw new Error(err?.message || 'Gagal memproses pencairan')
    }
  }

  const handleReject = async (id: string, reason: string) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'PATCH',
        body: { reason },
      })
      toastSuccess('Pengajuan berhasil ditolak dan saldo dikembalikan ke tenant')
      fetchWithdrawals()
    } catch (err: any) {
      throw new Error(err?.message || 'Gagal menolak pengajuan')
    }
  }

  const handleCompleteDirect = async (id: string) => {
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/complete`, {
        method: 'PATCH',
      })
      toastSuccess('Penyerahan tunai berhasil diselesaikan')
      fetchWithdrawals()
    } catch (err: any) {
      throw new Error(err?.message || 'Gagal menyelesaikan pencairan tunai')
    }
  }

  // Calculate high-level summary metrics
  const pendingCount = withdrawals.filter((w) => w.status === 'PENDING').length
  const pendingSum = withdrawals
    .filter((w) => w.status === 'PENDING')
    .reduce((sum, w) => sum + (w.amount || 0), 0)

  const processedSum = withdrawals
    .filter((w) => w.status === 'PROCESSED')
    .reduce((sum, w) => sum + (w.amount || 0), 0)

  const completedSum = withdrawals
    .filter((w) => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0)

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="soft" className="bg-amber-50 text-amber-800 border-amber-200">
            Perlu Tindakan
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

  return (
    <InternalLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a0a0a]">
              Pencairan Dana Stan Tenant
            </h1>
            <p className="text-xs sm:text-sm text-[#737373] mt-1">
              Verifikasi dan proses pengajuan penarikan saldo dari seluruh stan kuliner food court.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchWithdrawals}
            disabled={isLoading}
            className="rounded-[16px] h-10 px-4 text-xs font-semibold gap-2 self-start sm:self-auto"
          >
            <Icons.Refresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>

        {/* High-level Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-xs font-semibold">Menunggu Diproses</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div>
              <p className="font-mono text-xl sm:text-2xl font-black text-amber-700">
                {formatRupiah(pendingSum)}
              </p>
              <p className="text-[11px] text-[#737373] mt-1">
                {pendingCount} stan menunggu pencairan
              </p>
            </div>
          </Card>

          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-xs font-semibold">Telah Ditransfer / Diserahkan</span>
              <Icons.Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="font-mono text-xl sm:text-2xl font-black text-blue-700">
                {formatRupiah(processedSum)}
              </p>
              <p className="text-[11px] text-[#737373] mt-1">
                Menunggu konfirmasi penerimaan tenant
              </p>
            </div>
          </Card>

          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-xs font-semibold">Total Selesai Dicairkan</span>
              <Icons.Check className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-mono text-xl sm:text-2xl font-black text-emerald-800">
                {formatRupiah(completedSum)}
              </p>
              <p className="text-[11px] text-[#737373] mt-1">
                Dana sukses tersalurkan ke tenant
              </p>
            </div>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'PENDING', label: 'Perlu Tindakan' },
            { id: 'PROCESSED', label: 'Sudah Ditransfer' },
            { id: 'COMPLETED', label: 'Selesai' },
            { id: 'REJECTED', label: 'Ditolak' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-[14px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#0a0a0a] text-white'
                  : 'bg-white text-[#737373] border border-[#e5e5e5] hover:text-[#0a0a0a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Withdrawals Table */}
        <Card surface="paper" className="p-0 rounded-[24px] overflow-hidden border border-[#e5e5e5]">
          {withdrawals.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#737373]">
              Tidak ada pengajuan pencairan dana yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] uppercase text-[10px] tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Waktu Pengajuan</th>
                    <th className="py-3 px-4">Nama Stan / Tenant</th>
                    <th className="py-3 px-4">Nominal</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Tujuan Rekening</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#737373]">
                        {formatDate(w.requestedAt || w.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#0a0a0a] block">
                          {w.tenant?.name || 'Tenant'}
                        </span>
                        <span className="text-[11px] text-[#737373] font-mono">
                          Stan #{w.tenant?.stallNumber || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-sm text-[#0a0a0a]">
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
                          <span>Ambil Tunai di Kasir/Kantor</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(w.status)}
                        {w.status === 'REJECTED' && w.adminNotes && (
                          <p className="text-[11px] text-red-600 mt-1 max-w-[200px] truncate">
                            Alasan: {w.adminNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* If PENDING: Process Button */}
                          {w.status === 'PENDING' && (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedWithdrawal(w)
                                setProcessModalOpen(true)
                              }}
                              className="h-8 text-xs font-bold rounded-[12px] gap-1 px-3 shadow-xs"
                            >
                              <Icons.CreditCard className="w-3.5 h-3.5" />
                              <span>Proses</span>
                            </Button>
                          )}

                          {/* If PROCESSED or COMPLETED: View Receipt */}
                          {(w.status === 'PROCESSED' || w.status === 'COMPLETED') && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWithdrawal(w)
                                setReceiptModalOpen(true)
                              }}
                              className="h-8 text-xs font-semibold rounded-[12px] gap-1"
                            >
                              <Icons.Eye className="w-3.5 h-3.5" />
                              <span>Bukti</span>
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

        {/* Process Modal */}
        <ProcessWithdrawalModal
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

        {/* Receipt Modal */}
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
