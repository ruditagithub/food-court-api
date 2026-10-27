import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import { apiFetch } from '../../api/client'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'
import { useToast } from '../ui/Toast'
import { formatRupiah } from '../../lib/utils'

export interface KioskPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
  customerName: string
  totalAmount: number
  subtotal: number
  taxAmount: number
  serviceFee: number
  kioskName?: string
  onPaidSuccess: () => void
}

export function KioskPaymentModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  customerName,
  totalAmount,
  subtotal,
  taxAmount,
  serviceFee,
  kioskName,
  onPaidSuccess,
}: KioskPaymentModalProps) {
  const { success: toastSuccess, error: toastError } = useToast()

  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'CASH'>('QRIS')
  const [qrisSvg, setQrisSvg] = useState<string>('')
  const [cashPassSvg, setCashPassSvg] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState<number>(300) // 5 minutes countdown
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false)

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isPaidRef = useRef(false)

  const cashSlipCode = `CSH-TK-${orderNumber.replace(/[^A-Za-z0-9]/g, '')}`

  // Check order status
  const checkOrderStatus = useCallback(async () => {
    if (!orderId || isPaidRef.current) return
    setIsCheckingStatus(true)
    try {
      const res = await apiFetch<{ data: any }>(`/api/orders/${orderId}`)
      if (res.data?.paymentStatus === 'PAID') {
        isPaidRef.current = true
        toastSuccess('Pembayaran Berhasil!', 'Pesanan Anda telah lunas dan diteruskan ke dapur.')
        onPaidSuccess()
      }
    } catch {
      // Silently continue polling
    } finally {
      setIsCheckingStatus(false)
    }
  }, [orderId, onPaidSuccess, toastSuccess])

  // Request Midtrans Snap QRIS or generate local QRIS payload
  useEffect(() => {
    if (!isOpen || !orderId) return

    isPaidRef.current = false
    setTimeLeft(300)

    // Request Midtrans snap token
    apiFetch<{ data: any }>('/api/payments/midtrans', {
      method: 'POST',
      body: { orderId },
    })
      .then((res) => {
        const qrPayload = res.data?.qrCodeUrl || res.data?.redirectUrl || `QRIS-DYNAMIC-${orderNumber}-${totalAmount}`
        return QRCode.toString(qrPayload, {
          type: 'svg',
          margin: 1,
          color: { dark: '#0a0a0a', light: '#ffffff' },
        })
      })
      .then((svg) => setQrisSvg(svg))
      .catch(() => {
        // Fallback QRIS
        const fallbackPayload = `00020101021226580016ID.CO.MIDTRANS.WWW0118936009140000000000520458125303360540${totalAmount}5802ID5910FOOD COURT6008SURABAYA62070703A016304${orderNumber.slice(-4)}`
        QRCode.toString(fallbackPayload, {
          type: 'svg',
          margin: 1,
          color: { dark: '#0a0a0a', light: '#ffffff' },
        }).then((svg) => setQrisSvg(svg))
      })

    // Generate Cash Slip Barcode
    const cashPayload = JSON.stringify({
      type: 'CASH_TAKEAWAY',
      code: cashSlipCode,
      orderNumber,
      customerName,
      amountDue: totalAmount,
    })
    QRCode.toString(cashPayload, {
      type: 'svg',
      margin: 1,
      color: { dark: '#0a0a0a', light: '#ffffff' },
    }).then((svg) => setCashPassSvg(svg))

    // Start status polling every 3 seconds
    pollingTimerRef.current = setInterval(() => {
      checkOrderStatus()
    }, 3000)

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
    }
  }, [isOpen, orderId, orderNumber, totalAmount, customerName, checkOrderStatus, cashSlipCode])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, timeLeft])

  // Simulator helper: mark paid directly in development
  const handleSimulatePayment = async () => {
    try {
      setIsCheckingStatus(true)
      // Call cashier payment confirmation
      await apiFetch('/api/payments/cashier/confirm', {
        method: 'POST',
        body: {
          orderId,
          cashReceived: totalAmount,
        },
      })
      isPaidRef.current = true
      toastSuccess('Simulasi Sukses', 'Pembayaran ditandai LUNAS.')
      onPaidSuccess()
    } catch (err: any) {
      toastError('Gagal Simulasi', err?.message || 'Gagal memproses pembayaran')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  if (!isOpen) return null

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} size="xl">
      <DialogClose onClick={onClose} />
      <DialogHeader className="text-center pb-2">
        <Badge variant="soft" className="mx-auto mb-1 text-[11px] font-mono uppercase tracking-wider bg-neutral-900 text-[#9ef01a] border-none px-3 py-1">
          Kiosk Self-Service • Pembayaran Takeaway
        </Badge>
        <DialogTitle className="text-2xl font-black text-[#0a0a0a] tracking-tight">
          Pilih Metode Pembayaran
        </DialogTitle>
        <p className="text-xs text-[#737373]">
          Pesanan #{orderNumber} a.n. <strong className="text-[#0a0a0a]">{customerName}</strong>
          {kioskName && <span> • Kiosk: {kioskName}</span>}
        </p>
      </DialogHeader>

      <div className="space-y-5 p-2 sm:p-4">
        {/* Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 p-1.5 rounded-[22px] bg-neutral-100 border border-neutral-200">
          <button
            type="button"
            onClick={() => setPaymentMethod('QRIS')}
            className={`py-3.5 px-4 rounded-[18px] text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              paymentMethod === 'QRIS'
                ? 'bg-white text-[#0a0a0a] shadow-md border border-neutral-200'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Icons.QrCode className="w-5 h-5 text-emerald-600" />
            <span>QRIS Dinamis (Instan)</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            className={`py-3.5 px-4 rounded-[18px] text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              paymentMethod === 'CASH'
                ? 'bg-white text-[#0a0a0a] shadow-md border border-neutral-200'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Icons.CreditCard className="w-5 h-5 text-amber-600" />
            <span>Bayar Tunai di Kasir</span>
          </button>
        </div>

        {/* Content Tab 1: QRIS Midtrans */}
        {paymentMethod === 'QRIS' && (
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Big QR Code Card */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 rounded-[28px] bg-gradient-to-br from-neutral-900 to-neutral-950 text-white shadow-xl border border-white/10">
              <div className="flex items-center justify-between w-full mb-3 px-2">
                <span className="text-[11px] font-mono tracking-wider text-emerald-400 font-bold uppercase">
                  Pindai QRIS Sentra
                </span>
                <span className="font-mono text-xs text-white/80 font-bold bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Icons.Clock className="w-3 h-3 text-[#9ef01a]" />
                  {formatCountdown(timeLeft)}
                </span>
              </div>

              {/* QR Canvas Box */}
              <div className="w-56 h-56 p-3 bg-white rounded-[22px] shadow-lg flex items-center justify-center">
                {qrisSvg ? (
                  <div
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrisSvg }}
                  />
                ) : (
                  <Icons.Refresh className="w-8 h-8 animate-spin text-neutral-400" />
                )}
              </div>

              <div className="mt-4 text-center space-y-1">
                <p className="text-xs font-bold text-white">
                  BCA, GoPay, OVO, Dana, ShopeePay, LinkAja
                </p>
                <p className="text-[11px] text-white/60">
                  Arahkan kamera aplikasi pembayaran bank/e-wallet Anda ke QR di atas
                </p>
              </div>

              <div className="mt-4 w-full pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-white/60">Status Deteksi:</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Menunggu Pembayaran...
                </span>
              </div>
            </div>

            {/* Bill Breakdown & Actions */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="p-5 rounded-[24px] bg-[#fafafa] border border-[#e5e5e5] space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#737373] block">
                  Ringkasan Tagihan Takeaway
                </span>

                <div className="space-y-2 text-xs divide-y divide-neutral-200">
                  <div className="flex justify-between pt-1">
                    <span className="text-neutral-600">Subtotal Pesanan:</span>
                    <span className="font-mono font-semibold text-neutral-900">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-neutral-600">Pajak Restoran PB1 (10%):</span>
                    <span className="font-mono text-neutral-700">{formatRupiah(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-neutral-600">Biaya Layanan (3%):</span>
                    <span className="font-mono text-neutral-700">{formatRupiah(serviceFee)}</span>
                  </div>
                  <div className="flex justify-between pt-2.5 text-base">
                    <span className="font-bold text-[#0a0a0a]">Total Bayar:</span>
                    <span className="font-mono font-black text-2xl text-emerald-700">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={checkOrderStatus}
                  disabled={isCheckingStatus}
                  className="w-full h-12 rounded-[18px] text-xs font-bold gap-2 cursor-pointer"
                >
                  {isCheckingStatus ? (
                    <Icons.Refresh className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icons.Check className="w-4 h-4" />
                  )}
                  <span>Cek Status Pembayaran</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSimulatePayment}
                  disabled={isCheckingStatus}
                  className="w-full h-11 rounded-[18px] text-xs font-semibold text-neutral-600 hover:text-black gap-2 cursor-pointer border-dashed"
                >
                  <Icons.Zap className="w-4 h-4 text-amber-500" />
                  <span>Simulasi Bayar Cepat (Development / Demo Sandbox)</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab 2: Cashier Payment Slip */}
        {paymentMethod === 'CASH' && (
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Big Cashier Slip Card */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 rounded-[28px] bg-white border-2 border-[#0a0a0a] shadow-xl text-center">
              <span className="text-[10px] font-mono tracking-widest text-[#737373] uppercase font-bold">
                TIKET PEMBAYARAN KASIR
              </span>
              <h3 className="font-mono text-2xl font-black text-[#0a0a0a] tracking-tight mt-1">
                {cashSlipCode}
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Nomor Pesanan: <strong className="font-mono text-black">{orderNumber}</strong>
              </p>

              {/* Barcode / QR Box */}
              <div className="w-48 h-48 my-3 p-2 bg-[#fafafa] rounded-[18px] border border-[#e5e5e5] flex items-center justify-center">
                {cashPassSvg ? (
                  <div
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: cashPassSvg }}
                  />
                ) : (
                  <Icons.Refresh className="w-8 h-8 animate-spin text-neutral-400" />
                )}
              </div>

              <div className="p-3 rounded-[16px] bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left w-full space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Icons.AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Instruksi Menuju Meja Kasir:</span>
                </p>
                <ol className="list-decimal pl-5 space-y-0.5 text-[11px] text-amber-800">
                  <li>Tunjukkan kode atau scan tiket ini ke kasir food court.</li>
                  <li>Serahkan uang tunai sebesar <strong>{formatRupiah(totalAmount)}</strong>.</li>
                  <li>Setelah diverifikasi kasir, pesanan Anda langsung dimasak dapur.</li>
                </ol>
              </div>
            </div>

            {/* Total Due & Status Polling */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="p-5 rounded-[24px] bg-[#fafafa] border border-[#e5e5e5] space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#737373] block">
                  Total Harus Dibayar di Kasir
                </span>
                <div className="font-mono font-black text-3xl text-[#0a0a0a]">
                  {formatRupiah(totalAmount)}
                </div>
                <p className="text-xs text-neutral-600">
                  Kasir akan memverifikasi pesanan #{orderNumber} atas nama <strong>{customerName}</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={checkOrderStatus}
                  disabled={isCheckingStatus}
                  className="w-full h-12 rounded-[18px] text-xs font-bold gap-2 cursor-pointer"
                >
                  <Icons.Refresh className="w-4 h-4" />
                  <span>Periksa Apakah Sudah Dilunasi di Kasir</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSimulatePayment}
                  disabled={isCheckingStatus}
                  className="w-full h-11 rounded-[18px] text-xs font-semibold text-neutral-600 hover:text-black gap-2 cursor-pointer border-dashed"
                >
                  <Icons.Zap className="w-4 h-4 text-amber-500" />
                  <span>Simulasi Kasir Melunasi Tagihan (Demo)</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
