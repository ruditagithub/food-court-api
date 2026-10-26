import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'
import { useToast } from '../ui/Toast'
import { formatRupiah } from '../../lib/utils'

export interface CashierPaymentPassModalProps {
  isOpen: boolean
  onClose: () => void
  orderNumber: string
  paymentGroupId?: string
  tableNumber?: string
  participantName?: string
  items?: Array<{ name: string; quantity: number; amount: number; notes?: string | null; options?: string[] }>
  subtotal: number
  serviceFee: number
  taxAmount: number
  amountDue: number
  isPaid?: boolean
  onPaidSuccess?: () => void
}

export function CashierPaymentPassModal({
  isOpen,
  onClose,
  orderNumber,
  paymentGroupId,
  tableNumber,
  participantName,
  items = [],
  subtotal,
  serviceFee,
  taxAmount,
  amountDue,
  isPaid = false,
  onPaidSuccess,
}: CashierPaymentPassModalProps) {
  const { success: toastSuccess } = useToast()
  const [qrSvg, setQrSvg] = useState<string>('')

  // Generate QR payload
  const passCode = paymentGroupId
    ? `CSH-${orderNumber}-${participantName?.slice(0, 5).toUpperCase() || 'P'}`
    : `CSH-${orderNumber}`

  const qrPayload = JSON.stringify({
    type: 'CASH_PAYMENT',
    code: passCode,
    orderNumber,
    paymentGroupId: paymentGroupId || undefined,
    tableNumber,
    participantName,
    amountDue,
  })

  useEffect(() => {
    if (!isOpen) return
    QRCode.toString(qrPayload, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
    })
      .then((svg) => setQrSvg(svg))
      .catch((err) => console.error('Failed to generate pass QR:', err))
  }, [isOpen, qrPayload])

  // Copy code handler
  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(passCode)
    }
    toastSuccess('Kode Disalin', `Kode pembayaran kasir ${passCode} disalin ke clipboard.`)
  }

  // Auto close on paid
  useEffect(() => {
    if (isPaid && isOpen) {
      const timer = setTimeout(() => {
        if (onPaidSuccess) onPaidSuccess()
        onClose()
      }, 1800)
      return () => clearTimeout(timer)
    }
  }, [isPaid, isOpen, onPaidSuccess, onClose])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} size="md">
      <div className="relative">
        <DialogClose onClick={onClose} />
        <DialogHeader className="text-center pb-2">
          <Badge variant="soft" className="mx-auto mb-1 text-[10px] font-mono uppercase tracking-wider">
            Pembayaran Tunai Kasir
          </Badge>
          <DialogTitle className="text-lg font-bold text-[#0a0a0a]">
            Tiket Bayar Kasir
          </DialogTitle>
          <p className="text-xs text-[#737373]">
            Tunjukkan QR Code ini ke kasir Food Court untuk pembayaran tunai
          </p>
        </DialogHeader>

        {isPaid ? (
          /* Success Paid State */
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <Icons.Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#0a0a0a]">Pembayaran Diterima Kasir!</h3>
            <p className="text-xs text-[#737373]">
              Tagihan telah lunas. Pesanan Anda segera disiapkan di dapur stan.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Ticket Card */}
            <div className="p-4 sm:p-5 rounded-[22px] bg-[#fafafa] border border-[#e5e5e5] space-y-4">
              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center p-3 rounded-[16px] bg-white border border-[#f0f0f0] shadow-xs">
                {qrSvg ? (
                  <div
                    className="w-44 h-44 sm:w-48 sm:h-48"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-[#737373]">
                    <Icons.Refresh className="w-5 h-5 animate-spin mr-1.5" />
                    Membuat QR...
                  </div>
                )}

                {/* Readable Code + Copy button */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#0a0a0a] px-2.5 py-1 rounded-[10px] bg-[#f5f5f5] border border-[#e5e5e5]">
                    {passCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-[11px] font-semibold text-[#737373] hover:text-[#0a0a0a] flex items-center gap-1 cursor-pointer"
                  >
                    <Icons.Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </button>
                </div>
              </div>

              {/* Bill Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#737373]">
                  <span>Nomor Pesanan:</span>
                  <span className="font-mono font-bold text-[#0a0a0a]">{orderNumber}</span>
                </div>
                <div className="flex justify-between items-center text-[#737373]">
                  <span>Meja:</span>
                  <span className="font-bold text-[#0a0a0a]">{tableNumber ? `Meja ${tableNumber}` : 'Bawa Pulang'}</span>
                </div>
                {participantName && (
                  <div className="flex justify-between items-center text-[#737373]">
                    <span>Atas Nama:</span>
                    <span className="font-bold text-[#0a0a0a]">{participantName}</span>
                  </div>
                )}

                {/* Items preview */}
                {items.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-[#e5e5e5] space-y-1.5">
                    {items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#0a0a0a]">
                            {it.quantity}x {it.name}
                          </span>
                          <span className="font-mono text-[#737373]">{formatRupiah(it.amount)}</span>
                        </div>
                        {it.options && it.options.length > 0 && (
                          <div className="text-[10px] text-[#737373] pl-2 italic">
                            + {it.options.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Cost Breakdown */}
                <div className="pt-2 border-t border-[#e5e5e5] space-y-1 text-xs">
                  <div className="flex justify-between text-[#737373]">
                    <span>Subtotal Makanan:</span>
                    <span className="font-mono text-[#0a0a0a]">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#737373]">
                    <span>Biaya Layanan (3%):</span>
                    <span className="font-mono text-[#0a0a0a]">{formatRupiah(serviceFee)}</span>
                  </div>
                  <div className="flex justify-between text-[#737373]">
                    <span>Pajak Restoran PB1 (10%):</span>
                    <span className="font-mono text-[#0a0a0a]">{formatRupiah(taxAmount)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#e5e5e5] flex justify-between items-center font-bold text-sm">
                    <span className="text-[#0a0a0a]">Total Tagihan Tunai:</span>
                    <span className="font-mono text-base text-[#0a0a0a]">{formatRupiah(amountDue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Waiting for Cashier Pulse Banner */}
            <div className="p-3 rounded-[16px] bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-[#737373] text-[11px]">
                  Menunggu kasir memindai QR dan menerima uang tunai...
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-7 text-[11px] px-2.5 rounded-[10px]"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
