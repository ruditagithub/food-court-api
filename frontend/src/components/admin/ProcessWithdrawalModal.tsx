import { useState, useEffect } from 'react'
import { Dialog, DialogClose, DialogHeader } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Icons } from '../ui/Icons'
import { ImageUploadInput } from '../ui/ImageUploadInput'
import { formatDate, formatRupiah } from '../../lib/utils'

interface ProcessWithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  withdrawal: any | null
  onProcess: (id: string, data: any) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  onCompleteDirect: (id: string) => Promise<void>
}

export function ProcessWithdrawalModal({
  isOpen,
  onClose,
  withdrawal,
  onProcess,
  onReject,
  onCompleteDirect,
}: ProcessWithdrawalModalProps) {
  const [activeAction, setActiveAction] = useState<'disburse' | 'reject'>('disburse')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('TRANSFER')
  const [transferReference, setTransferReference] = useState('')
  const [proofReceiptUrl, setProofReceiptUrl] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && withdrawal) {
      setActiveAction('disburse')
      setPaymentMethod(withdrawal.paymentMethod || 'TRANSFER')
      setTransferReference('')
      setProofReceiptUrl('')
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

    if (paymentMethod === 'TRANSFER' && !proofReceiptUrl) {
      setError('Mohon unggah foto bukti transfer bank sebelum memproses')
      return
    }

    setIsSubmitting(true)
    try {
      await onProcess(withdrawal.id, {
        paymentMethod,
        proofReceiptUrl: proofReceiptUrl || undefined,
        transferReference: transferReference.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses pencairan dana')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!rejectReason.trim()) {
      setError('Mohon isi alasan penolakan agar tenant mengetahui kendala')
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

  const handleCompleteDirectSubmit = async () => {
    if (!confirm('Apakah uang tunai telah diserahkan langsung ke pemilik stan?')) return
    setIsSubmitting(true)
    try {
      await onCompleteDirect(withdrawal.id)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Gagal menyelesaikan pencairan tunai')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()} size="xl">
      <DialogClose onClick={() => !isSubmitting && onClose()} />
      <DialogHeader>
        <div className="pr-6">
          <h2 className="text-base font-bold text-[#0a0a0a]">
            Proses Pencairan Dana Stan
          </h2>
          <p className="text-xs text-[#737373] mt-0.5">
            Stan: <span className="font-bold text-[#0a0a0a]">{withdrawal.tenant?.name || 'Tenant'}</span> • Diajukan: {formatDate(withdrawal.requestedAt)}
          </p>
        </div>
      </DialogHeader>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Nominal & Recipient Info Card */}
        <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
            <div>
              <span className="text-[11px] text-[#737373] block">Nominal yang Dicairkan</span>
              <span className="text-2xl font-mono font-black text-[#0a0a0a]">
                {formatRupiah(withdrawal.amount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#737373] block">Metode Permintaan</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-[10px] bg-neutral-200 text-[#0a0a0a] inline-block mt-0.5">
                {withdrawal.paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Tunai Langsung'}
              </span>
            </div>
          </div>

          {/* Recipient Account Details with copy buttons */}
          {withdrawal.paymentMethod === 'TRANSFER' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-[14px] bg-white border border-[#e5e5e5]">
                <span className="text-[#737373] text-[10px] uppercase font-mono block">Bank / E-Wallet</span>
                <span className="font-bold text-[#0a0a0a] text-sm mt-0.5 block">
                  {withdrawal.bankName || '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-[14px] bg-white border border-[#e5e5e5] relative group">
                <span className="text-[#737373] text-[10px] uppercase font-mono block">No. Rekening</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-[#0a0a0a] text-sm truncate">
                    {withdrawal.bankAccountNumber || '-'}
                  </span>
                  {withdrawal.bankAccountNumber && (
                    <button
                      type="button"
                      onClick={() => handleCopy(withdrawal.bankAccountNumber, 'accNo')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors p-1"
                      title="Salin nomor rekening"
                    >
                      {copiedField === 'accNo' ? (
                        <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Icons.Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-[14px] bg-white border border-[#e5e5e5]">
                <span className="text-[#737373] text-[10px] uppercase font-mono block">Atas Nama</span>
                <span className="font-semibold text-[#0a0a0a] text-sm mt-0.5 block truncate">
                  {withdrawal.bankAccountHolder || '-'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Toggle (Disburse vs Reject) */}
        <div className="flex border-b border-[#e5e5e5] gap-4">
          <button
            type="button"
            onClick={() => setActiveAction('disburse')}
            disabled={isSubmitting}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeAction === 'disburse'
                ? 'text-[#0a0a0a]'
                : 'text-[#737373] hover:text-[#0a0a0a]'
            }`}
          >
            <span>Pencairan Dana (Disburse)</span>
            {activeAction === 'disburse' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0a0a0a]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveAction('reject')}
            disabled={isSubmitting}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeAction === 'reject'
                ? 'text-red-600'
                : 'text-[#737373] hover:text-red-600'
            }`}
          >
            <span>Tolak Pengajuan (Refund Saldo)</span>
            {activeAction === 'reject' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-red-600" />
            )}
          </button>
        </div>

        {/* ACTION FORM 1: DISBURSE */}
        {activeAction === 'disburse' && (
          <form onSubmit={handleDisburseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="disburse-method">Metode Penyaluran Nyata</Label>
                <select
                  id="disburse-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-[14px] bg-white border border-[#e5e5e5] text-xs font-bold text-[#0a0a0a] outline-none"
                >
                  <option value="TRANSFER">Transfer Bank / E-Wallet</option>
                  <option value="CASH">Tunai (Cash di Kasir/Kantor)</option>
                </select>
              </div>

              {paymentMethod === 'TRANSFER' && (
                <div>
                  <Label htmlFor="transfer-ref">Nomor Referensi Bank (Opsional)</Label>
                  <Input
                    id="transfer-ref"
                    placeholder="Contoh: TRX-12345678"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    disabled={isSubmitting}
                    className="h-10 rounded-[14px] font-mono text-xs"
                  />
                </div>
              )}
            </div>

            {/* Upload Proof */}
            <div>
              <Label required={paymentMethod === 'TRANSFER'}>
                Unggah Foto Bukti Transfer / Kwitansi Serah Terima
              </Label>
              <ImageUploadInput
                value={proofReceiptUrl}
                onChange={setProofReceiptUrl}
                label="Unggah Struk Bukti Transfer"
              />
            </div>

            <div>
              <Label htmlFor="admin-notes">Catatan Tambahan untuk Tenant (Opsional)</Label>
              <textarea
                id="admin-notes"
                rows={2}
                placeholder="Contoh: Sudah ditransfer via m-BCA jam 14:00, mohon dicek mutasinya."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={isSubmitting}
                className="w-full p-3 rounded-[14px] bg-white border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-[14px] bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#e5e5e5]">
              {paymentMethod === 'CASH' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCompleteDirectSubmit}
                  disabled={isSubmitting}
                  className="text-xs font-bold rounded-[14px] h-10 px-4 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <Icons.Check className="w-3.5 h-3.5" />
                  <span>Selesaikan Langsung (Tunai Lunas)</span>
                </Button>
              )}

              <div className="flex items-center justify-end gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-xs font-bold rounded-[14px] h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="text-xs font-bold rounded-[14px] h-10 px-5 gap-1.5"
                >
                  {isSubmitting ? (
                    <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icons.ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>Kirim Bukti & Tandai Diproses</span>
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* ACTION FORM 2: REJECT */}
        {activeAction === 'reject' && (
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="p-3.5 rounded-[16px] bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <span className="font-bold block mb-0.5">Informasi Pengembalian Dana:</span>
              Jika Anda menolak pengajuan ini, saldo sebesar <span className="font-bold">{formatRupiah(withdrawal.amount)}</span> akan otomatis dikembalikan ke dompet aktif stan tenant.
            </div>

            <div>
              <Label htmlFor="reject-reason" required>
                Alasan Penolakan
              </Label>
              <textarea
                id="reject-reason"
                rows={3}
                placeholder="Contoh: Nomor rekening tidak valid / nama tidak sesuai dengan akun bank."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={isSubmitting}
                className="w-full p-3 rounded-[14px] bg-white border border-red-300 focus:border-red-500 text-xs text-[#0a0a0a] outline-none resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-[14px] bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e5e5]">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs font-bold rounded-[14px] h-10 px-4"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!rejectReason.trim() || isSubmitting}
                className="text-xs font-bold rounded-[14px] h-10 px-5 bg-red-600 hover:bg-red-700 gap-1.5"
              >
                {isSubmitting ? (
                  <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icons.Close className="w-3.5 h-3.5" />
                )}
                <span>Tolak & Kembalikan Saldo</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  )
}
