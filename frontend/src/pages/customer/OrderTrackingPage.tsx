import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { formatRupiah, formatDate } from '../../lib/utils'
import { PaymentModal } from '../../components/customer/PaymentModal'
import { ReceiptModal } from '../../components/payment/ReceiptModal'

export function OrderTrackingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  const fetchTrack = useCallback(async () => {
    if (!orderNumber) return
    try {
      const res = await apiFetch<{ data: any }>(`/api/orders/track/${orderNumber}`)
      setOrder(res.data)
      setErrorMsg(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pesanan tidak ditemukan'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }, [orderNumber])

  useEffect(() => {
    fetchTrack()
    const interval = setInterval(() => {
      fetchTrack()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchTrack])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <Icons.Refresh className="w-8 h-8 animate-spin text-[#0a0a0a] mb-2" />
        <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
          Menghubungkan ke Dapur...
        </p>
      </div>
    )
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card surface="paper" className="max-w-md w-full text-center p-8 space-y-4">
          <div className="w-12 h-12 rounded-[18px] bg-[#fff0f0] text-[#e7000b] flex items-center justify-center mx-auto">
            <Icons.AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0a0a0a]">Pesanan Tidak Ditemukan</h2>
          <p className="text-xs text-[#737373]">
            {errorMsg || 'Nomor pesanan tidak valid atau sudah kadaluarsa.'}
          </p>
          <Link to="/">
            <Button variant="primary" className="w-full mt-2">
              Kembali ke Beranda
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // Check if any stall has status READY
  const readyStalls = (order.stalls || order.tenantOrders || []).filter(
    (to: any) => (to.status || to.cookingStatus) === 'READY'
  )

  const getStepProgress = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 1
      case 'PREPARING':
        return 2
      case 'READY':
        return 3
      case 'COMPLETED':
        return 4
      default:
        return 1
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6">
      <div className="max-w-md sm:max-w-xl mx-auto space-y-5">
        {/* Ready Notification Banner if ready */}
        {readyStalls.length > 0 && (
          <div className="p-4 rounded-[24px] bg-[#0a0a0a] text-white shadow-xl flex items-start gap-3.5 border-2 border-white animate-bounce">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold">
              ✓
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white leading-tight">
                Makanan Anda Siap Diambil!
              </h3>
              <p className="text-xs text-[#a3a3a3] mt-0.5">
                Silakan menuju ke{' '}
                {readyStalls.map((s: any) => s.tenantName || 'Stan Kios').join(', ')}{' '}
                dengan menunjukkan nomor pesanan ini.
              </p>
            </div>
          </div>
        )}

        {/* Order Header Card */}
        <Card surface="paper" className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
                Nomor Pesanan Anda
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-mono text-[#0a0a0a] tracking-tight">
                {order.orderNumber}
              </h1>
              <p className="text-xs text-[#737373] mt-0.5">
                {order.createdAt ? formatDate(order.createdAt) : ''}
              </p>
            </div>

            <div className="text-right">
              <Badge variant="solid" className="font-mono text-xs">
                {order.tableNumber ? `Meja ${order.tableNumber}` : 'Bawa Pulang'}
              </Badge>
              <p className="text-xs text-[#737373] mt-1">
                {order.customerName ? `Atas Nama: ${order.customerName}` : ''}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-between text-xs">
            <span className="text-[#737373]">Status Pembayaran:</span>
            <div className="flex items-center gap-2">
              <Badge variant={order.paymentStatus === 'PAID' ? 'solid' : 'soft'}>
                {order.paymentStatus || 'PENDING'}
              </Badge>
              {order.paymentStatus !== 'PAID' ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="h-7 text-xs px-2.5 rounded-[14px]"
                >
                  Bayar Sekarang
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="h-7 text-xs px-2.5 rounded-[14px] flex items-center gap-1"
                >
                  <Icons.Printer className="w-3.5 h-3.5" />
                  Struk
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Stalls Progress Tracking */}
        <div className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-[#737373] px-1">
            Status Pengerjaan Dapur Stan
          </h2>

          {(order.stalls || order.tenantOrders || []).map((stall: any, idx: number) => {
            const cookingStatus = stall.status || stall.cookingStatus || 'QUEUED'
            const progress = getStepProgress(cookingStatus)

            return (
              <Card key={stall.id || idx} surface="paper" className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icons.Store className="w-4 h-4 text-[#737373] shrink-0" />
                    <span className="font-bold text-sm text-[#0a0a0a] truncate">
                      {stall.tenantName || 'Stan Kios'}
                    </span>
                  </div>
                  {stall.stallNumber && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[10px] bg-[#f5f5f5] text-[#0a0a0a]">
                      {stall.stallNumber}
                    </span>
                  )}
                </div>

                {/* 3-Step Visual Progress Bar */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      className={`h-2 rounded-full transition-colors ${
                        progress >= 1 ? 'bg-[#0a0a0a]' : 'bg-[#e5e5e5]'
                      }`}
                    />
                    <div
                      className={`h-2 rounded-full transition-colors ${
                        progress >= 2 ? 'bg-[#0a0a0a]' : 'bg-[#e5e5e5]'
                      }`}
                    />
                    <div
                      className={`h-2 rounded-full transition-colors ${
                        progress >= 3 ? 'bg-emerald-500' : 'bg-[#e5e5e5]'
                      }`}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-mono uppercase text-[#737373]">
                    <span className={progress >= 1 ? 'text-[#0a0a0a] font-bold' : ''}>
                      1. Antre Masak
                    </span>
                    <span className={progress >= 2 ? 'text-[#0a0a0a] font-bold' : ''}>
                      2. Sedang Dimasak
                    </span>
                    <span className={progress >= 3 ? 'text-emerald-600 font-bold' : ''}>
                      3. Siap Diambil
                    </span>
                  </div>
                </div>

                {/* Stall Items */}
                {stall.items && stall.items.length > 0 && (
                  <div className="pt-2 border-t border-[#e5e5e5] space-y-1 text-xs">
                    {stall.items.map((it: any, iIdx: number) => (
                      <div key={iIdx} className="flex justify-between text-xs">
                        <span className="text-[#0a0a0a] font-medium">
                          {it.quantity}x {it.name || it.menuNameSnapshot}
                        </span>
                        {it.options && it.options.length > 0 && (
                          <span className="text-[#737373] text-[11px]">
                            ({it.options.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Total Summary Card */}
        <Card surface="paper" className="p-4 flex items-center justify-between">
          <span className="text-sm font-bold text-[#0a0a0a]">Total Transaksi</span>
          <span className="font-mono text-lg font-black text-[#0a0a0a]">
            {formatRupiah(order.totalAmount || 0)}
          </span>
        </Card>

        {/* Polling live footer */}
        <div className="text-center pt-2 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#737373]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Memperbarui status otomatis setiap 5 detik</span>
          </div>
          <div>
            <Link
              to="/"
              className="text-xs text-[#737373] hover:text-[#0a0a0a] underline underline-offset-2"
            >
              Kembali ke Beranda Food Court
            </Link>
          </div>
        </div>

        {/* Payment Modal */}
        {order && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false)
              fetchTrack()
            }}
            orderId={order.id || orderNumber || ''}
            orderNumber={order.orderNumber || orderNumber || ''}
            totalAmount={order.totalAmount || 0}
            tableNumber={order.tableNumber}
            onPaymentSuccess={() => {
              setIsPaymentModalOpen(false)
              fetchTrack()
            }}
          />
        )}

        {/* Receipt Modal */}
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          orderNumber={order.orderNumber || orderNumber}
          orderId={order.id}
        />
      </div>
    </div>
  )
}

