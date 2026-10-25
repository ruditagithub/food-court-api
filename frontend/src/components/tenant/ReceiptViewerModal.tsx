import { Dialog, DialogClose, DialogHeader } from '../ui/Dialog'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'
import { formatDate, formatRupiah } from '../../lib/utils'

interface ReceiptViewerModalProps {
  isOpen: boolean
  onClose: () => void
  withdrawal: {
    id: string
    amount: number
    paymentMethod: 'CASH' | 'TRANSFER'
    bankName?: string | null
    bankAccountNumber?: string | null
    bankAccountHolder?: string | null
    proofReceiptUrl?: string | null
    transferReference?: string | null
    adminNotes?: string | null
    processedAt?: string | null
    completedAt?: string | null
    processor?: { name: string } | null
  } | null
}

export function ReceiptViewerModal({
  isOpen,
  onClose,
  withdrawal,
}: ReceiptViewerModalProps) {
  if (!withdrawal) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} size="lg">
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <div className="flex items-center justify-between pr-6">
          <div>
            <h2 className="text-base font-bold text-[#0a0a0a]">
              Bukti Pencairan Dana
            </h2>
            <p className="text-xs text-[#737373] mt-0.5 font-mono">
              ID: {withdrawal.id}
            </p>
          </div>
          <Badge
            variant="soft"
            className={
              withdrawal.paymentMethod === 'TRANSFER'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
          >
            {withdrawal.paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Tunai (Cash)'}
          </Badge>
        </div>
      </DialogHeader>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Nominal Card */}
        <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#737373] block">Nominal Pencairan</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-[#0a0a0a]">
              {formatRupiah(withdrawal.amount)}
            </span>
          </div>
          {withdrawal.processedAt && (
            <div className="text-right">
              <span className="text-[11px] text-[#737373] block">Diproses Pada</span>
              <span className="text-xs font-mono font-medium text-[#0a0a0a]">
                {formatDate(withdrawal.processedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Transfer Details */}
        {withdrawal.paymentMethod === 'TRANSFER' && (
          <div className="p-4 rounded-[20px] bg-white border border-[#e5e5e5] space-y-2 text-xs">
            <h4 className="font-bold text-[#0a0a0a] text-xs pb-1 border-b border-[#f0f0f0]">
              Detail Rekening Penerima
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[#737373]">
              <div>
                <span>Bank / E-Wallet:</span>
                <p className="font-semibold text-[#0a0a0a] mt-0.5">
                  {withdrawal.bankName || '-'}
                </p>
              </div>
              <div>
                <span>Nomor Rekening:</span>
                <p className="font-mono font-bold text-[#0a0a0a] mt-0.5">
                  {withdrawal.bankAccountNumber || '-'}
                </p>
              </div>
              <div className="col-span-2">
                <span>Atas Nama:</span>
                <p className="font-semibold text-[#0a0a0a] mt-0.5">
                  {withdrawal.bankAccountHolder || '-'}
                </p>
              </div>
              {withdrawal.transferReference && (
                <div className="col-span-2 pt-1 border-t border-[#f0f0f0]">
                  <span>No. Referensi Transfer:</span>
                  <p className="font-mono font-bold text-blue-600 mt-0.5">
                    {withdrawal.transferReference}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proof Photo Attachment */}
        <div>
          <label className="text-xs font-bold text-[#0a0a0a] block mb-2">
            Lampiran Struk / Bukti Transfer
          </label>
          {withdrawal.proofReceiptUrl ? (
            <div className="rounded-[20px] overflow-hidden border border-[#e5e5e5] bg-black/5 flex items-center justify-center max-h-[360px]">
              <img
                src={withdrawal.proofReceiptUrl}
                alt="Bukti Transfer"
                className="max-h-[360px] w-auto object-contain"
              />
            </div>
          ) : (
            <div className="p-8 rounded-[20px] border border-dashed border-[#e5e5e5] bg-[#fafafa] text-center text-xs text-[#737373] flex flex-col items-center justify-center gap-2">
              <Icons.AlertCircle className="w-6 h-6 text-[#a3a3a3]" />
              <span>Tidak ada gambar bukti terlampir (Pencairan Tunai Langsung)</span>
            </div>
          )}
        </div>

        {/* Admin Notes */}
        {withdrawal.adminNotes && (
          <div className="p-3.5 rounded-[16px] bg-amber-50 border border-amber-200 text-xs">
            <span className="font-bold text-amber-900 block mb-0.5">Catatan Pengelola:</span>
            <p className="text-amber-800">{withdrawal.adminNotes}</p>
          </div>
        )}
      </div>
    </Dialog>
  )
}
