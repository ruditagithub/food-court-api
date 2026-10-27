import { useState, useEffect } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'
import { formatRupiah } from '../../lib/utils'

export interface KioskOrderSuccessModalProps {
  isOpen: boolean
  orderNumber: string
  customerName: string
  totalAmount: number
  items?: Array<{ name: string; quantity: number; price: number; notes?: string }>
  kioskName?: string
  foodCourtName?: string
  onReturnHome: () => void
}

export function KioskOrderSuccessModal({
  isOpen,
  orderNumber,
  customerName,
  totalAmount,
  items = [],
  kioskName,
  foodCourtName,
  onReturnHome,
}: KioskOrderSuccessModalProps) {
  const [countdown, setCountdown] = useState<number>(30)

  useEffect(() => {
    if (!isOpen) return
    setCountdown(30)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onReturnHome()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, onReturnHome])

  if (!isOpen) return null

  const handlePrintSlip = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} size="lg">
      <div className="p-4 sm:p-6 text-center space-y-6">
        {/* Animated Success Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
          <Icons.Check className="w-10 h-10 stroke-[3]" />
        </div>

        <div>
          <Badge
            variant="soft"
            className="px-3.5 py-1 text-xs font-mono uppercase tracking-widest bg-neutral-900 text-[#9ef01a] border-none mb-3"
          >
            TAKEAWAY • PESANAN BAWA PULANG
          </Badge>
          <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
            Nomor Panggilan Pesanan Anda
          </p>
          <div className="font-mono text-5xl sm:text-6xl font-black text-[#0a0a0a] tracking-tight mt-1 select-all">
            {orderNumber}
          </div>
          <p className="text-sm font-bold text-neutral-800 mt-2">
            Atas Nama: <span className="text-emerald-700 font-extrabold">{customerName}</span>
          </p>
          {(kioskName || foodCourtName) && (
            <p className="text-[11px] font-mono text-neutral-500 mt-1">
              {[kioskName, foodCourtName].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        {/* Announcement Box */}
        <div className="p-4 sm:p-5 rounded-[22px] bg-emerald-50 border border-emerald-200 text-emerald-950 text-left space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Icons.Kitchen className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>Pesanan Sedang Dimasak di Dapur Stan</span>
          </div>
          <p className="text-xs text-emerald-900/90 leading-relaxed">
            Pesanan Anda telah otomatis diteruskan ke layar dapur masing-masing stan mitra. Silakan duduk santai di area tunggu dan nantikan panggilan suara <strong>nama</strong> atau <strong>nomor order #{orderNumber}</strong> saat hidangan siap diambil.
          </p>
        </div>

        {/* Items Summary (if provided) */}
        {items.length > 0 && (
          <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] text-left text-xs space-y-2 max-h-40 overflow-y-auto">
            <span className="font-mono uppercase text-[10px] text-[#737373] tracking-wider block">
              Ringkasan Item ({items.length} Menu):
            </span>
            <div className="divide-y divide-neutral-200 space-y-1.5">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center pt-1.5">
                  <div>
                    <span className="font-bold text-[#0a0a0a]">{it.quantity}x {it.name}</span>
                    {it.notes && <span className="text-[10px] text-neutral-500 block">"{it.notes}"</span>}
                  </div>
                  <span className="font-mono font-semibold text-neutral-800">
                    {formatRupiah(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-neutral-300 flex justify-between font-bold text-xs">
              <span>Total Pembayaran:</span>
              <span className="font-mono text-emerald-700">{formatRupiah(totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={onReturnHome}
            className="w-full h-14 rounded-[20px] text-sm font-black gap-2 shadow-md cursor-pointer bg-[#0a0a0a] hover:bg-[#262626]"
          >
            <Icons.ArrowRight className="w-5 h-5 text-[#9ef01a]" />
            <span>Selesai & Kembali ke Layar Utama ({countdown}s)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePrintSlip}
            className="w-full h-10 rounded-[16px] text-xs font-semibold gap-1.5"
          >
            <Icons.Printer className="w-4 h-4 text-[#737373]" />
            <span>Cetak Struk Pemesanan (Thermal)</span>
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
