import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Icons } from '../ui/Icons'
import { ImageUploadInput } from '../ui/ImageUploadInput'
import { formatRupiah } from '../../lib/utils'

interface ProcessFoodCourtWithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  withdrawal: any | null
  onProcess: (id: string, data: any) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  onCompleteDirect?: (id: string) => Promise<void>
}

export function ProcessFoodCourtWithdrawalModal({
  isOpen,
  onClose,
  withdrawal,
  onProcess,
  onReject,
  onCompleteDirect,
}: ProcessFoodCourtWithdrawalModalProps) {
  const [activeTab, setActiveTab] = useState<'disburse' | 'reject'>('disburse')
  const [proofReceiptUrl, setProofReceiptUrl] = useState('')
  const [transferReference, setTransferReference] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && withdrawal) {
      setActiveTab('disburse')
      setProofReceiptUrl('')
      setTransferReference('')
      setAdminNotes('')
      setRejectReason('')
      setError(null)
    }
  }, [isOpen, withdrawal])

  if (!withdrawal) return null

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!proofReceiptUrl) {
      setError('Mohon unggah struk / bukti transfer bank sebelum memproses')
      return
    }

    setIsSubmitting(true)
    try {
      await onProcess(withdrawal.id, {
        proofReceiptUrl,
        transferReference: transferReference.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses pencairan dana cabang')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!rejectReason.trim()) {
      setError('Mohon isi alasan penolakan secara jelas')
      return
    }

    setIsSubmitting(true)
    try {
      await onReject(withdrawal.id, rejectReason.trim())
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Gagal menolak pengajuan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} size="lg">
      <div className="relative">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>Verifikasi & Pencairan Dana Cabang Food Court</DialogTitle>
          <DialogDescription>
            Pengajuan penarikan dana kas operasional #{withdrawal.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-5 p-3.5 rounded-[18px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <Icons.AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Withdrawal Info Card */}
        <div className="p-4 rounded-[22px] bg-[#fafafa] border border-[#e5e5e5] space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
                Cabang Food Court
              </span>
              <span className="font-heading text-lg font-bold text-[#0a0a0a]">
                {withdrawal.foodCourt?.name || 'Cabang Food Court'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
                Nominal Pencairan
              </span>
              <span className="font-heading text-xl font-black text-[#0a0a0a]">
                {formatRupiah(withdrawal.amount)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#e5e5e5] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[#737373] block text-[11px]">Bank Tujuan</span>
              <span className="font-semibold text-[#0a0a0a]">{withdrawal.bankName}</span>
            </div>
            <div>
              <span className="text-[#737373] block text-[11px]">Nomor Rekening</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-[#0a0a0a]">
                <span>{withdrawal.bankAccountNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(withdrawal.bankAccountNumber, 'acc')}
                  className="p-1 rounded-sm text-[#737373] hover:text-[#0a0a0a]"
                  title="Salin nomor rekening"
                >
                  <Icons.Copy className="w-3.5 h-3.5" />
                </button>
                {copiedField === 'acc' && (
                  <span className="text-[10px] text-emerald-600 font-sans font-medium">Tersalin!</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[#737373] block text-[11px]">Atas Nama</span>
              <span className="font-semibold text-[#0a0a0a]">{withdrawal.bankAccountHolder}</span>
            </div>
          </div>
        </div>

        {/* 2 Tabs: Transfer vs Tolak */}
        <div className="flex items-center border-b border-[#e5e5e5] mb-5 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('disburse')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'disburse'
                ? 'text-[#0a0a0a]'
                : 'text-[#737373] hover:text-[#0a0a0a]'
            }`}
          >
            Transfer Bank & Unggah Bukti
            {activeTab === 'disburse' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a0a0a] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reject')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'reject'
                ? 'text-red-600'
                : 'text-[#737373] hover:text-red-600'
            }`}
          >
            Tolak Pengajuan & Refund Saldo
            {activeTab === 'reject' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
            )}
          </button>
        </div>

        {/* TAB 1: Transfer & Disburse */}
        {activeTab === 'disburse' && (
          <form onSubmit={handleDisburseSubmit} className="space-y-4">
            {/* Proof Receipt Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#0a0a0a]">
                Foto Struk / Bukti Transfer Bank <span className="text-red-500">*</span>
              </Label>
              <ImageUploadInput
                value={proofReceiptUrl}
                onChange={(url) => setProofReceiptUrl(url)}
                folder="food-courts"
              />
            </div>

            {/* Transfer Reference */}
            <div className="space-y-1.5">
              <Label htmlFor="transferReference" className="text-xs font-semibold text-[#0a0a0a]">
                Nomor Referensi Transfer Bank (Opsional)
              </Label>
              <Input
                id="transferReference"
                type="text"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
                placeholder="Contoh: TRF-MND-9921827"
                className="font-mono text-sm rounded-[18px]"
              />
            </div>

            {/* Internal Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="adminNotes" className="text-xs font-semibold text-[#0a0a0a]">
                Catatan Super Admin (Opsional)
              </Label>
              <textarea
                id="adminNotes"
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Catatan rekening sentra pengirim..."
                className="w-full px-3.5 py-2.5 rounded-[18px] border border-[#e5e5e5] text-xs text-[#0a0a0a] focus:outline-hidden focus:border-[#0a0a0a]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {onCompleteDirect && (
                <button
                  type="button"
                  onClick={() => onCompleteDirect(withdrawal.id)}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Selesaikan Langsung &rarr;
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-full px-4 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !proofReceiptUrl}
                  className="rounded-full px-5 text-xs bg-[#0a0a0a] hover:bg-[#262626] text-white shadow-xs"
                >
                  {isSubmitting ? 'Memproses...' : 'Kirim & Tandai Transfer Diproses'}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Reject & Refund */}
        {activeTab === 'reject' && (
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="p-3.5 rounded-[18px] bg-red-50 border border-red-200 text-red-800 text-xs">
              <span className="font-bold block mb-1">Otomatis Mengembalikan Saldo (WITHDRAWAL_REFUND)</span>
              <p>
                Saldo sebesar <strong>{formatRupiah(withdrawal.amount)}</strong> yang saat ini tertahan akan langsung dikembalikan secara otomatis ke saldo kas cabang food court <strong>{withdrawal.foodCourt?.name}</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rejectReason" className="text-xs font-semibold text-[#0a0a0a]">
                Alasan Penolakan <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="rejectReason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan (misal: nomor rekening tidak valid, nama pemilik tidak sesuai, dll)..."
                className="w-full px-3.5 py-2.5 rounded-[18px] border border-[#e5e5e5] text-xs text-[#0a0a0a] focus:outline-hidden focus:border-red-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full px-4 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !rejectReason.trim()}
                className="rounded-full px-5 text-xs bg-red-600 hover:bg-red-700 text-white shadow-xs"
              >
                {isSubmitting ? 'Memproses...' : 'Tolak & Kembalikan Saldo Kas'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  )
}
