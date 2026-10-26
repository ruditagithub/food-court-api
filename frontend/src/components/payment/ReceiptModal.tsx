import { useState, useEffect } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'
import { formatRupiah, formatDate } from '../../lib/utils'

export interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  orderId?: string
  orderNumber?: string
}

export function ReceiptModal({ isOpen, onClose, orderId, orderNumber }: ReceiptModalProps) {
  const [loading, setLoading] = useState(false)
  const [orderData, setOrderData] = useState<any>(null)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setOrderData(null)
      setPaymentData(null)
      setError(null)
      return
    }

    const loadReceipt = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = getToken()
        let fetchedOrder = null

        // If orderNumber is available, use track endpoint
        if (orderNumber) {
          const res = await apiFetch<{ data: any }>(`/api/orders/track/${orderNumber}`)
          fetchedOrder = res.data
        } else if (orderId) {
          const res = await apiFetch<{ data: any }>(`/api/orders/${orderId}`, {
            token: token || undefined,
          })
          fetchedOrder = res.data
        }

        setOrderData(fetchedOrder)

        // Try to fetch payment record if orderId is available
        const effectiveOrderId = orderId || fetchedOrder?.id
        if (effectiveOrderId) {
          try {
            const payRes = await apiFetch<{ data: any }>(`/api/payments/${effectiveOrderId}`, {
              token: token || undefined,
            })
            setPaymentData(payRes.data)
          } catch {
            // Payment record might not exist yet if pending
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat data struk'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    loadReceipt()
  }, [isOpen, orderId, orderNumber])

  const handlePrint = () => {
    window.print()
  }

  const effectiveOrderNumber = orderData?.orderNumber || orderNumber || '-'
  const effectiveTable = orderData?.tableNumber || orderData?.table?.tableNumber || 'Takeaway'
  const effectiveTotal = orderData?.totalAmount || orderData?.totalPrice || 0
  const isPaid = (orderData?.paymentStatus === 'PAID') || (paymentData?.status === 'SUCCESS')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Icons.Printer className="w-5 h-5 text-[#0a0a0a]" />
          <DialogTitle>Struk Pembayaran Digital</DialogTitle>
        </div>
      </DialogHeader>

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
          }
          /* Hide everything in the body by default */
          body * {
            visibility: hidden !important;
          }
          /* Neutralize modal wrapper and overflow containers so receipt is never clipped */
          .fixed,
          .relative,
          [data-lenis-prevent],
          .overflow-y-auto {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            min-height: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Only show the receipt paper and all its children */
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 480px !important;
            margin: 0 auto !important;
            padding: 20px !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Hide any buttons, close icons, dialog headers/footers */
          button, [role="button"], dialog, .no-print {
            display: none !important;
          }
        }
      `}</style>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Icons.Refresh className="w-6 h-6 animate-spin text-[#0a0a0a]" />
          <p className="text-xs font-mono uppercase text-[#737373]">Menyiapkan Struk...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#fff0f0] text-[#e7000b] flex items-center justify-center mx-auto">
            <Icons.AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-xs text-[#e7000b]">{error}</p>
        </div>
      ) : (
        <div className="py-2 overflow-y-auto max-h-[60vh] bg-white text-[#0a0a0a] space-y-4 print:p-0">
          {/* Thermal Receipt Visual Paper */}
          <div
            id="printable-receipt"
            className="p-5 border border-dashed border-[#d4d4d4] rounded-[18px] bg-[#fafafa] space-y-4 font-mono text-xs"
          >
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-[#d4d4d4]">
              <h3 className="font-sans font-black text-sm tracking-wider uppercase text-[#0a0a0a]">
                {orderData?.foodCourtName || 'AMICI FOOD COURT'}
              </h3>
              <p className="text-[10px] text-[#737373]">Sentra Kuliner Modern & Digital</p>
              <p className="text-[10px] text-[#737373]">Bukti Pembayaran Transaksi Resmi</p>
            </div>

            {/* Order Meta */}
            <div className="grid grid-cols-2 gap-y-1 text-[11px] pb-3 border-b border-dashed border-[#d4d4d4]">
              <span className="text-[#737373]">No. Order:</span>
              <span className="text-right font-bold text-[#0a0a0a]">{effectiveOrderNumber}</span>

              <span className="text-[#737373]">Meja:</span>
              <span className="text-right font-bold text-[#0a0a0a]">
                {effectiveTable === 'Takeaway' ? 'Bawa Pulang (Takeaway)' : `Meja ${effectiveTable}`}
              </span>

              <span className="text-[#737373]">Tanggal:</span>
              <span className="text-right text-[#0a0a0a]">
                {orderData?.createdAt ? formatDate(orderData.createdAt) : '-'}
              </span>

              <span className="text-[#737373]">Metode:</span>
              <span className="text-right font-bold text-[#0a0a0a] uppercase">
                {paymentData?.paymentMethod || 'CASH / MIDTRANS'}
              </span>

              <span className="text-[#737373]">Status:</span>
              <span className="text-right">
                <Badge variant={isPaid ? 'solid' : 'soft'} className="text-[9px] py-0 px-1.5">
                  {isPaid ? 'LUNAS (PAID)' : 'MENUNGGU BAYAR'}
                </Badge>
              </span>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-3 pb-3 border-b border-dashed border-[#d4d4d4]">
              <div className="font-bold text-[10px] uppercase text-[#737373] tracking-wider">
                Rincian Pesanan
              </div>

              {orderData?.stalls ? (
                orderData.stalls.map((stall: any, sIdx: number) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="font-bold text-[#0a0a0a] flex justify-between text-[11px]">
                      <span>{stall.tenantName}</span>
                      <span className="text-[10px] text-[#737373]">
                        {stall.stallNumber ? `Kios ${stall.stallNumber}` : ''}
                      </span>
                    </div>
                    {stall.items?.map((it: any, iIdx: number) => {
                      const itemOptions = it.options || it.orderItemOptions || []
                      return (
                        <div key={iIdx} className="space-y-0.5 pl-2 text-[11px] text-[#404040]">
                          <div className="flex justify-between">
                            <span>
                              {it.quantity}x {it.name || it.menuNameSnapshot}
                            </span>
                            {(it.subtotal !== undefined || it.unitPrice !== undefined) && (
                              <span>
                                {formatRupiah(it.subtotal ?? (it.unitPrice || 0) * it.quantity)}
                              </span>
                            )}
                          </div>
                          {itemOptions.length > 0 && (
                            <div className="text-[10px] text-[#737373] pl-3 italic">
                              + {itemOptions.map((opt: any) => typeof opt === 'string' ? opt : (opt.optionNameSnapshot || opt.name)).join(', ')}
                            </div>
                          )}
                          {it.notes && (
                            <div className="text-[10px] text-[#737373] pl-3 italic">
                              Catatan: &quot;{it.notes}&quot;
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              ) : orderData?.tenantOrders ? (
                orderData.tenantOrders.map((to: any, sIdx: number) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="font-bold text-[#0a0a0a] flex justify-between text-[11px]">
                      <span>{to.tenant?.name || 'Tenant Gerai'}</span>
                      <span className="text-[10px] text-[#737373]">
                        {to.tenant?.stallNumber || ''}
                      </span>
                    </div>
                    {to.items?.map((it: any, iIdx: number) => {
                      const itemOptions = it.options || it.orderItemOptions || []
                      return (
                        <div key={iIdx} className="space-y-0.5 pl-2 text-[11px] text-[#404040]">
                          <div className="flex justify-between">
                            <span>
                              {it.quantity}x {it.menuNameSnapshot || it.name}
                            </span>
                            <span>{formatRupiah(it.subtotal || it.unitPriceSnapshot * it.quantity)}</span>
                          </div>
                          {itemOptions.length > 0 && (
                            <div className="text-[10px] text-[#737373] pl-3 italic">
                              + {itemOptions.map((opt: any) => typeof opt === 'string' ? opt : (opt.optionNameSnapshot || opt.name)).join(', ')}
                            </div>
                          )}
                          {it.notes && (
                            <div className="text-[10px] text-[#737373] pl-3 italic">
                              Catatan: &quot;{it.notes}&quot;
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-[#737373] italic">Item pesanan terdaftar</p>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 pb-2">
              <div className="flex justify-between text-[11px] text-[#737373]">
                <span>Subtotal Pesanan</span>
                <span>{formatRupiah(orderData?.subtotal || effectiveTotal)}</span>
              </div>
              {orderData?.discountAmount ? (
                <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                  <span>Diskon Voucher ({orderData.discountCode || 'Promo'})</span>
                  <span>-{formatRupiah(orderData.discountAmount)}</span>
                </div>
              ) : null}
              {orderData?.serviceFee ? (
                <div className="flex justify-between text-[11px] text-[#737373]">
                  <span>Biaya Layanan (3%)</span>
                  <span>{formatRupiah(orderData.serviceFee)}</span>
                </div>
              ) : null}
              {orderData?.taxAmount ? (
                <div className="flex justify-between text-[11px] text-[#737373]">
                  <span>Pajak Restoran PB1 (10%)</span>
                  <span>{formatRupiah(orderData.taxAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-xs font-bold text-[#0a0a0a] pt-1 border-t border-[#e5e5e5]">
                <span>TOTAL PEMBAYARAN</span>
                <span>{formatRupiah(effectiveTotal)}</span>
              </div>
            </div>

            {/* Reference ID */}
            {paymentData?.paymentReference && (
              <div className="text-[9px] text-[#737373] text-center pt-2">
                Ref: <span className="font-mono text-[#0a0a0a]">{paymentData.paymentReference}</span>
              </div>
            )}

            {/* Footer Note */}
            <div className="text-center text-[10px] text-[#737373] pt-2 border-t border-dashed border-[#d4d4d4]">
              <p>Terima kasih atas kunjungan Anda!</p>
              <p>Simpan struk ini sebagai bukti pesanan yang sah.</p>
            </div>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Tutup
        </Button>
        <Button
          variant="primary"
          onClick={handlePrint}
          disabled={loading || !!error}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5"
        >
          <Icons.Printer className="w-4 h-4" />
          Cetak Struk
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
