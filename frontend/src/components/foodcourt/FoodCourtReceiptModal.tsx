import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog'
import { Icons } from '../ui/Icons'
import { formatDate, formatRupiah } from '../../lib/utils'

interface FoodCourtReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  withdrawal: {
    id: string
    amount: number
    paymentMethod: 'TRANSFER'
    bankName: string
    bankAccountNumber: string
    bankAccountHolder: string
    status: string
    proofReceiptUrl?: string | null
    transferReference?: string | null
    adminNotes?: string | null
    processedAt?: string | null
    completedAt?: string | null
    processor?: { name: string } | null
  } | null
}

export function FoodCourtReceiptModal({
  isOpen,
  onClose,
  withdrawal,
}: FoodCourtReceiptModalProps) {
  if (!withdrawal) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} size="lg">
      <div className="relative">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>Bukti Transfer Pencairan Dana Cabang</DialogTitle>
          <DialogDescription>
            Pengajuan penarikan #{withdrawal.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nominal and Status Banner */}
          <div className="p-4 rounded-[22px] bg-[#fafafa] border border-[#e5e5e5] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
                Nominal Ditransfer
              </span>
              <span className="font-heading text-xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(withdrawal.amount)}
              </span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Icons.CreditCard className="w-3.5 h-3.5" />
                Transfer Bank
              </span>
              {withdrawal.processedAt && (
                <span className="text-[11px] text-[#737373] font-mono block mt-1">
                  {formatDate(withdrawal.processedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Destination Details */}
          <div className="p-4 rounded-[22px] bg-white border border-[#e5e5e5] text-xs space-y-2.5">
            <div className="font-bold text-[#0a0a0a] pb-1.5 border-b border-[#f0f0f0] flex items-center justify-between">
              <span>Rekening Penerima</span>
              <span className="font-mono text-blue-600">
                {withdrawal.transferReference ? `Ref: ${withdrawal.transferReference}` : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[#737373]">
              <div>
                <span>Bank Tujuan:</span>
                <p className="font-semibold text-[#0a0a0a] mt-0.5">{withdrawal.bankName}</p>
              </div>
              <div>
                <span>No. Rekening:</span>
                <p className="font-mono font-bold text-[#0a0a0a] mt-0.5">{withdrawal.bankAccountNumber}</p>
              </div>
              <div className="col-span-2">
                <span>Pemilik Rekening:</span>
                <p className="font-semibold text-[#0a0a0a] mt-0.5">{withdrawal.bankAccountHolder}</p>
              </div>
            </div>
          </div>

          {/* Proof Receipt Attachment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0a0a0a]">
                Lampiran Struk Transfer Bank (Super Admin)
              </span>
              {withdrawal.proofReceiptUrl && (
                <a
                  href={withdrawal.proofReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-[#047857] hover:underline inline-flex items-center gap-1"
                >
                  <Icons.Eye className="w-3.5 h-3.5" />
                  Buka Gambar Penuh &rarr;
                </a>
              )}
            </div>

            {withdrawal.proofReceiptUrl ? (
              <div className="rounded-[22px] overflow-hidden border border-[#e5e5e5] bg-[#fafafa] flex items-center justify-center max-h-[320px]">
                <img
                  src={withdrawal.proofReceiptUrl}
                  alt="Bukti Transfer Bank"
                  className="max-h-[320px] w-auto object-contain rounded-[20px]"
                />
              </div>
            ) : (
              <div className="p-6 rounded-[22px] border border-dashed border-[#e5e5e5] text-center text-xs text-[#737373]">
                Belum ada berkas struk yang diunggah.
              </div>
            )}
          </div>

          {/* Super Admin Notes */}
          {withdrawal.adminNotes && (
            <div className="p-3.5 rounded-[18px] bg-blue-50 border border-blue-200 text-xs">
              <span className="font-bold text-blue-900 block mb-0.5">Catatan Super Admin:</span>
              <p className="text-blue-800">{withdrawal.adminNotes}</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
