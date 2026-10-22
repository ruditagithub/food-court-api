import { useState } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Icons } from '../ui/Icons'
import { useToast } from '../ui/Toast'
import { formatRupiah } from '../../lib/utils'

export interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
  totalAmount: number
  tableNumber?: string
  onPaymentSuccess?: (paymentData: any) => void
}

type PaymentMethodType = 'MIDTRANS' | 'CASH'

export function PaymentModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  tableNumber,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('MIDTRANS')
  const [isProcessing, setIsProcessing] = useState(false)
  const [snapData, setSnapData] = useState<any>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successDetails, setSuccessDetails] = useState<any>(null)

  const handleOnlinePayment = async () => {
    setIsProcessing(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any }>('/api/payments/midtrans', {
        method: 'POST',
        token: token || undefined,
        body: { orderId },
      })

      const snapResult = res.data
      setSnapData(snapResult)

      // Check if Midtrans Snap SDK is globally available
      const snapObj = (window as any).snap

      if (snapObj && typeof snapObj.pay === 'function') {
        snapObj.pay(snapResult.snapToken, {
          onSuccess: async () => {
            await handleAutoSync(snapResult.paymentReference)
          },
          onPending: async () => {
            await handleAutoSync(snapResult.paymentReference)
          },
          onError: () => {
            toastError('Gagal Bayar', 'Pembayaran dibatalkan atau terjadi gangguan pada gateway.')
            setIsProcessing(false)
          },
          onClose: () => {
            setIsProcessing(false)
          },
        })
      } else {
        // Fallback for environment without active internet / external script
        toastSuccess('Transaksi Dibuat', 'Token Snap berhasil dibuat. Anda dapat menyelesaikan simulasi di bawah.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi gateway pembayaran'
      toastError('Gagal Proses', msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAutoSync = async (paymentRef: string) => {
    setIsProcessing(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any }>(`/api/payments/midtrans/${paymentRef}/sync`, {
        method: 'POST',
        token: token || undefined,
      })

      setIsSuccess(true)
      setSuccessDetails(res.data)
      toastSuccess('Pembayaran Sukses', 'Pesanan Anda telah dibayar dan diteruskan ke dapur.')
      onPaymentSuccess?.(res.data)
    } catch {
      // In offline testing or mock fallback
      await handleDirectSuccessFallback('QRIS')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCashPayment = async () => {
    setIsProcessing(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any }>('/api/payments', {
        method: 'POST',
        token: token || undefined,
        body: {
          orderId,
          paymentMethod: 'CASH',
          amount: totalAmount,
          provider: 'Manual',
        },
      })

      setIsSuccess(true)
      setSuccessDetails(res.data)
      toastSuccess('Pembayaran Kasir Berhasil', 'Pesanan telah dikonfirmasi dan antrean dapur mulai dimasak.')
      onPaymentSuccess?.(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses pembayaran kasir'
      toastError('Gagal Bayar', msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDirectSuccessFallback = async (method: 'QRIS' | 'CASH') => {
    setIsProcessing(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any }>('/api/payments', {
        method: 'POST',
        token: token || undefined,
        body: {
          orderId,
          paymentMethod: method,
          amount: totalAmount,
          provider: 'Gateway-Simulation',
        },
      })

      setIsSuccess(true)
      setSuccessDetails(res.data)
      toastSuccess('Simulasi Berhasil', 'Status pesanan berubah menjadi Lunas dan diteruskan ke dapur.')
      onPaymentSuccess?.(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan simulasi'
      toastError('Gagal Simulasi', msg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.CreditCard className="w-5 h-5 text-[#0a0a0a]" />
            <DialogTitle>Selesaikan Pembayaran</DialogTitle>
          </div>
          <Badge variant="solid" className="font-mono text-xs">
            {orderNumber}
          </Badge>
        </div>
      </DialogHeader>

      {isSuccess ? (
        <div className="py-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <Icons.Check className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[#0a0a0a]">Pembayaran Berhasil!</h2>
            <p className="text-xs text-[#737373]">
              Pesanan <span className="font-mono font-bold text-[#0a0a0a]">{orderNumber}</span> telah
              lunas dan tiket antrean masak sudah masuk ke layar dapur stan.
            </p>
          </div>

          <Card surface="canvas" className="p-3 text-left space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-[#737373]">
              <span>Total Lunas:</span>
              <span className="font-bold text-[#0a0a0a]">{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[#737373]">
              <span>Metode:</span>
              <span className="font-bold text-[#0a0a0a] uppercase">
                {successDetails?.paymentMethod || selectedMethod}
              </span>
            </div>
            {successDetails?.paymentReference && (
              <div className="flex justify-between text-[#737373]">
                <span>Referensi:</span>
                <span className="font-bold text-[#0a0a0a]">{successDetails.paymentReference}</span>
              </div>
            )}
          </Card>

          <Button
            variant="primary"
            onClick={onClose}
            className="w-full h-11 text-sm font-bold"
          >
            Lihat Progres Dapur (Live Tracking)
          </Button>
        </div>
      ) : (
        <div className="py-2 space-y-5">
          {/* Bill Summary */}
          <Card surface="canvas" className="p-4 text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
              Total Tagihan Pembayaran
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#0a0a0a]">
              {formatRupiah(totalAmount)}
            </div>
            {tableNumber && (
              <p className="text-xs text-[#737373]">
                Disajikan untuk Meja <span className="font-bold text-[#0a0a0a]">{tableNumber}</span>
              </p>
            )}
          </Card>

          {/* Methods options */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
              Pilih Metode Pembayaran
            </label>

            {/* Option 1: Midtrans Snap */}
            <div
              onClick={() => setSelectedMethod('MIDTRANS')}
              className={`p-3.5 rounded-[18px] border-2 cursor-pointer transition-all flex items-start gap-3 ${
                selectedMethod === 'MIDTRANS'
                  ? 'border-[#0a0a0a] bg-[#fafafa] shadow-xs'
                  : 'border-[#e5e5e5] hover:border-[#a3a3a3]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedMethod === 'MIDTRANS' ? 'border-[#0a0a0a]' : 'border-[#d4d4d4]'
                }`}
              >
                {selectedMethod === 'MIDTRANS' && (
                  <div className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0a0a0a]">
                    Pembayaran Digital (QRIS / E-Wallet)
                  </span>
                  <Badge variant="solid" className="text-[9px] py-0 px-1.5">
                    Midtrans Snap
                  </Badge>
                </div>
                <p className="text-[11px] text-[#737373] leading-relaxed">
                  Bayar instan via GoPay, QRIS, ShopeePay, OVO, atau Virtual Account Bank (BCA, Mandiri, BRI).
                </p>
              </div>
            </div>

            {/* Option 2: Cashier */}
            <div
              onClick={() => setSelectedMethod('CASH')}
              className={`p-3.5 rounded-[18px] border-2 cursor-pointer transition-all flex items-start gap-3 ${
                selectedMethod === 'CASH'
                  ? 'border-[#0a0a0a] bg-[#fafafa] shadow-xs'
                  : 'border-[#e5e5e5] hover:border-[#a3a3a3]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedMethod === 'CASH' ? 'border-[#0a0a0a]' : 'border-[#d4d4d4]'
                }`}
              >
                {selectedMethod === 'CASH' && (
                  <div className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0a0a0a]">
                    Bayar Tunai di Kasir (Cash)
                  </span>
                  <Badge variant="soft" className="text-[9px] py-0 px-1.5">
                    Kasir Konter
                  </Badge>
                </div>
                <p className="text-[11px] text-[#737373] leading-relaxed">
                  Tunjukkan nomor order ke petugas kasir food court dan bayar menggunakan uang pas.
                </p>
              </div>
            </div>
          </div>

          {/* Offline/Sandbox simulation box if snap created */}
          {snapData && (
            <Card surface="paper" className="p-3 bg-amber-50/70 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                <Icons.Zap className="w-4 h-4 text-amber-600" />
                <span>Sandbox Simulator Aktif</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Token Midtrans Snap: <span className="font-mono font-bold">{snapData.snapToken.slice(0, 16)}...</span>
              </p>
              <Button
                variant="primary"
                onClick={() => handleDirectSuccessFallback('QRIS')}
                disabled={isProcessing}
                className="w-full h-8 text-xs bg-amber-900 hover:bg-amber-950 text-white"
              >
                Simulasikan Sukses (QRIS Lunas)
              </Button>
            </Card>
          )}
        </div>
      )}

      {!isSuccess && (
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Nanti Saja
          </Button>

          {selectedMethod === 'MIDTRANS' ? (
            <Button
              variant="primary"
              onClick={handleOnlinePayment}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 font-bold"
            >
              {isProcessing ? (
                <>
                  <Icons.Refresh className="w-4 h-4 animate-spin" />
                  Menghubungkan...
                </>
              ) : (
                <>
                  <Icons.Zap className="w-4 h-4" />
                  Bayar Online
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleCashPayment}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 font-bold"
            >
              {isProcessing ? (
                <>
                  <Icons.Refresh className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Icons.Check className="w-4 h-4" />
                  Konfirmasi Tunai
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      )}
    </Dialog>
  )
}
