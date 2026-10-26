import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { formatRupiah, formatDate } from '../../lib/utils'
import { PaymentModal } from '../../components/customer/PaymentModal'
import { ReceiptModal } from '../../components/payment/ReceiptModal'
import { CashierPaymentPassModal } from '../../components/customer/CashierPaymentPassModal'

export function OrderTrackingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const { success: toastSuccess } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [selectedPaymentGroupId, setSelectedPaymentGroupId] = useState<string | null>(null)
  const [openSplitAllocation, setOpenSplitAllocation] = useState(false)
  const [activeTableQr, setActiveTableQr] = useState<string | null>(null)
  const [cashierPassTarget, setCashierPassTarget] = useState<any>(null)
  const [isCashierPassOpen, setIsCashierPassOpen] = useState(false)

  useEffect(() => {
    try {
      const storedTable = localStorage.getItem('active_table')
      if (storedTable) {
        const parsed = JSON.parse(storedTable)
        if (parsed.qrToken) {
          setActiveTableQr(parsed.qrToken)
        }
      }
    } catch {
      // ignore
    }
  }, [])

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
    }, 4000)
    return () => clearInterval(interval)
  }, [fetchTrack])

  // Share link handlers
  const handleCopyOrderLink = (customText?: string) => {
    const shareUrl = window.location.href.split('?')[0]
    const textToCopy = customText || shareUrl
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
    }
    toastSuccess(
      'Tautan Disalin',
      customText
        ? 'Rincian tagihan berhasil disalin ke clipboard.'
        : 'Link pesanan meja berhasil disalin ke clipboard.'
    )
  }

  const handleShareWhatsApp = (message: string) => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')
  }

  const handleShareTableWhatsApp = () => {
    const shareUrl = window.location.href.split('?')[0]
    const msg = `Halo! Ini pesanan meja kita di Food Court (Nomor: ${order?.orderNumber || orderNumber}). Yuk buka link ini untuk cek pesanan dan bayar bagian masing-masing:\n${shareUrl}`
    handleShareWhatsApp(msg)
  }

  const handleShareParticipantWA = (pg: any) => {
    const shareUrl = window.location.href.split('?')[0]
    const itemsSummary = (pg.items || [])
      .map((it: any) => {
        const itemOptions = it.options || it.orderItemOptions || []
        const optText = itemOptions.length > 0
          ? ` (+${itemOptions.map((o: any) => typeof o === 'string' ? o : (o.optionNameSnapshot || o.name)).join(', ')})`
          : ''
        return `${it.quantity}x ${it.menuName || it.menuNameSnapshot}${optText}`
      })
      .join(', ')
    const msg = `Hai ${pg.participantName}! Total bagian pesananmu di Food Court adalah ${formatRupiah(pg.amountDue)} (${itemsSummary}). Silakan buka link ini untuk bayar bagianmu:\n${shareUrl}`
    handleShareWhatsApp(msg)
  }

  const handleCopyParticipantBill = (pg: any) => {
    const shareUrl = window.location.href.split('?')[0]
    const itemsSummary = (pg.items || [])
      .map((it: any) => {
        const itemOptions = it.options || it.orderItemOptions || []
        const optText = itemOptions.length > 0
          ? ` (+${itemOptions.map((o: any) => typeof o === 'string' ? o : (o.optionNameSnapshot || o.name)).join(', ')})`
          : ''
        return `${it.quantity}x ${it.menuName || it.menuNameSnapshot}${optText}`
      })
      .join(', ')
    const msg = `Hai ${pg.participantName}! Total bagian pesananmu di Food Court adalah ${formatRupiah(pg.amountDue)} (${itemsSummary}). Silakan bayar bagianmu:\n${shareUrl}`
    handleCopyOrderLink(msg)
  }

  
  // Cashier Pass ticket handlers
  const handleOpenParticipantCashPass = (pg: any) => {
    const itemsList = (pg.items || []).map((it: any) => {
      const itemOptions = it.options || it.orderItemOptions || []
      return {
        name: it.menuName || it.menuNameSnapshot || 'Item',
        quantity: it.quantity || 1,
        amount: it.allocatedAmount || it.subtotal || 0,
        notes: it.notes || null,
        options: itemOptions.map((o: any) => typeof o === 'string' ? o : (o.optionNameSnapshot || o.name)),
      }
    })

    const sub = pg.subtotal || itemsList.reduce((acc: number, it: any) => acc + it.amount, 0)
    const svc = pg.serviceFee || Math.round(sub * 0.03)
    const tax = pg.taxAmount || Math.round(sub * 0.10)
    const due = pg.amountDue || (sub + svc + tax)

    setCashierPassTarget({
      paymentGroupId: pg.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      participantName: pg.participantName,
      items: itemsList,
      subtotal: sub,
      serviceFee: svc,
      taxAmount: tax,
      amountDue: due,
    })
    setIsCashierPassOpen(true)
  }

  const handleOpenDirectCashPass = () => {
    const allItems = (order.stalls || []).flatMap((s: any) => s.items || []).map((it: any) => {
      const itemOptions = it.options || it.orderItemOptions || []
      return {
        name: it.name || it.menuNameSnapshot || 'Item',
        quantity: it.quantity || 1,
        amount: it.subtotal || 0,
        notes: it.notes || null,
        options: itemOptions.map((o: any) => typeof o === 'string' ? o : (o.optionNameSnapshot || o.name)),
      }
    })

    const sub = order.subtotal || allItems.reduce((acc: number, it: any) => acc + it.amount, 0)
    const svc = order.serviceFee || Math.round(sub * 0.03)
    const tax = order.taxAmount || Math.round(sub * 0.10)
    const due = order.totalAmount || (sub + svc + tax)

    setCashierPassTarget({
      paymentGroupId: order.paymentGroups?.[0]?.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      participantName: order.customerName,
      items: allItems,
      subtotal: sub,
      serviceFee: svc,
      taxAmount: tax,
      amountDue: due,
    })
    setIsCashierPassOpen(true)
  }

  // Payment triggers
  const handlePayParticipantMidtrans = (groupId: string) => {
    setSelectedPaymentGroupId(groupId)
    setOpenSplitAllocation(false)
    setIsPaymentModalOpen(true)
  }

  const handleOpenDirectPay = () => {
    setSelectedPaymentGroupId(null)
    setOpenSplitAllocation(false)
    setIsPaymentModalOpen(true)
  }

  const handleOpenSplitEditor = () => {
    if (
      order &&
      (order.paymentStatus === 'PAID' ||
        order.paymentStatus === 'PARTIALLY_PAID' ||
        (order.paymentGroups || []).some(
          (pg: any) => pg.status === 'PAID' || Number(pg.amountPaid || 0) > 0
        ))
    ) {
      return
    }
    setSelectedPaymentGroupId(null)
    setOpenSplitAllocation(true)
    setIsPaymentModalOpen(true)
  }



  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <Icons.Refresh className="w-8 h-8 animate-spin text-[#0a0a0a] mb-2" />
        <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
          Menghubungkan ke Dapur Stan...
        </p>
      </div>
    )
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card surface="paper" className="max-w-md w-full text-center p-8 space-y-4 rounded-[24px]">
          <div className="w-12 h-12 rounded-[18px] bg-[#fff0f0] text-[#e7000b] flex items-center justify-center mx-auto">
            <Icons.AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0a0a0a]">Pesanan Tidak Ditemukan</h2>
          <p className="text-xs text-[#737373]">
            {errorMsg || 'Nomor pesanan tidak valid atau sudah kadaluarsa.'}
          </p>
          <Link to="/">
            <Button variant="primary" className="w-full mt-2 rounded-[16px]">
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
      case 'WAITING_PAYMENT':
      case 'CANCELLED':
        return 0
      case 'QUEUED':
        return 1
      case 'PREPARING':
        return 2
      case 'READY':
        return 3
      case 'COMPLETED':
        return 4
      default:
        return 0
    }
  }

  const getStallStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING_PAYMENT':
        return { label: 'Menunggu Pembayaran', className: 'bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5]' }
      case 'QUEUED':
        return { label: 'Antrean Dapur', className: 'bg-[#0a0a0a] text-white' }
      case 'PREPARING':
        return { label: 'Sedang Dimasak', className: 'bg-blue-600 text-white' }
      case 'READY':
        return { label: 'Siap Diambil di Gerai', className: 'bg-amber-500 text-white' }
      case 'COMPLETED':
        return { label: 'Selesai Disajikan', className: 'bg-emerald-600 text-white' }
      case 'CANCELLED':
        return { label: 'Dibatalkan', className: 'bg-red-600 text-white' }
      default:
        return { label: status, className: 'bg-[#f5f5f5] text-[#737373]' }
    }
  }

  const isOrderFullyPaid = order.paymentStatus === 'PAID'
  const isPartiallyPaid = order.paymentStatus === 'PARTIALLY_PAID'
  const hasAnyGroupPaid =
    isOrderFullyPaid ||
    isPartiallyPaid ||
    (order.paymentGroups || []).some(
      (pg: any) => pg.status === 'PAID' || Number(pg.amountPaid || 0) > 0
    )

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 lg:px-8 xl:px-10 text-[#0a0a0a]">
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-6">
        {/* Top return link to Table Menu if available */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          {activeTableQr ? (
            <Link
              to={`/s/${activeTableQr}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors py-1.5 px-3 rounded-[16px] bg-white border border-[#e5e5e5] shadow-xs cursor-pointer hover:border-[#0a0a0a]"
            >
              <Icons.ArrowLeft className="w-3.5 h-3.5" />
              <span>Pesan Menu Tambahan</span>
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors py-1.5 px-3 rounded-[16px] bg-white border border-[#e5e5e5] shadow-xs cursor-pointer hover:border-[#0a0a0a]"
            >
              <Icons.ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda Food Court</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            {order.foodCourtName && (
              <span className="text-xs font-bold text-[#0a0a0a] hidden sm:inline">
                {order.foodCourtName} •
              </span>
            )}
            <Badge variant="solid" className="font-mono text-xs">
              {order.tableNumber ? `Meja ${order.tableNumber}` : 'Bawa Pulang'}
            </Badge>
          </div>
        </div>

        {/* Ready Buzzer Notification Banner */}
        {readyStalls.length > 0 && (
          <div className="p-4 rounded-[24px] bg-[#0a0a0a] text-white shadow-2xl flex items-start gap-3.5 border-2 border-white animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Icons.Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight">
                Makanan Anda Siap Diambil di Gerai!
              </h3>
              <p className="text-xs text-[#d4d4d4] mt-1 leading-relaxed">
                Silakan menuju ke{' '}
                <span className="font-bold text-white">
                  {readyStalls.map((s: any) => s.tenantName || 'Stan Kios').join(', ')}
                </span>
                . Jika Anda tidak mengambilnya, staf/runner kami akan mengantarkannya langsung ke Meja {order.tableNumber || ''}.
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Stalls Kitchen Progress Tracking */}
          <div className="w-full lg:col-span-7 xl:col-span-8 space-y-6 order-2 lg:order-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#0a0a0a] font-mono">
                    Proses Dapur Masing-Masing Stan
                  </h2>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Pantau status memasak dari masing-masing koki gerai secara langsung
                  </p>
                </div>
                <Badge variant="soft" className="text-xs font-semibold">
                  {(order.stalls || order.tenantOrders || []).length} Stan
                </Badge>
              </div>

              {(order.stalls || order.tenantOrders || []).map((stall: any, idx: number) => {
                const cookingStatus = stall.status || stall.cookingStatus || 'QUEUED'
                const progress = getStepProgress(cookingStatus)
                const statusBadge = getStallStatusBadge(cookingStatus)

                return (
                  <Card key={stall.id || idx} surface="paper" className="space-y-4 rounded-[24px]">
                    <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icons.Store className="w-4 h-4 text-[#737373] shrink-0" />
                        <span className="font-bold text-sm text-[#0a0a0a] truncate">
                          {stall.tenantName || 'Stan Kios'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <span className={`font-semibold text-[10px] px-2 py-0.5 rounded-[10px] ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                        {stall.queueNumber && stall.queueNumber !== '-' && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-[10px] bg-[#0a0a0a] text-white">
                            #{stall.queueNumber}
                          </span>
                        )}
                        {stall.stallNumber && (
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[10px] bg-[#f5f5f5] text-[#0a0a0a] border border-[#e5e5e5]">
                            Kios {stall.stallNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4-Step Visual Progress Bar */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-1.5">
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
                            progress >= 3 ? 'bg-amber-500' : 'bg-[#e5e5e5]'
                          }`}
                        />
                        <div
                          className={`h-2 rounded-full transition-colors ${
                            progress >= 4 ? 'bg-emerald-500' : 'bg-[#e5e5e5]'
                          }`}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] font-mono uppercase text-[#737373]">
                        <span className={progress >= 1 ? 'text-[#0a0a0a] font-bold' : ''}>
                          1. Antre
                        </span>
                        <span className={progress >= 2 ? 'text-[#0a0a0a] font-bold' : ''}>
                          2. Dimasak
                        </span>
                        <span className={progress >= 3 ? 'text-amber-600 font-bold' : ''}>
                          3. Siap Gerai
                        </span>
                        <span className={progress >= 4 ? 'text-emerald-600 font-bold' : ''}>
                          4. Disajikan
                        </span>
                      </div>
                    </div>

                    {/* Stall Items */}
                    {stall.items && stall.items.length > 0 && (
                      <div className="pt-2 border-t border-[#e5e5e5] space-y-2 text-xs">
                        {stall.items.map((it: any, iIdx: number) => {
                          const itemOptions = it.options || it.orderItemOptions || []
                          return (
                            <div key={iIdx} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-[#0a0a0a] font-medium">
                                  {it.quantity}x {it.name || it.menuNameSnapshot}
                                </span>
                                {(it.unitPrice || it.subtotal) && (
                                  <span className="font-mono text-[#737373] text-[11px]">
                                    {formatRupiah(it.subtotal || it.unitPrice * it.quantity)}
                                  </span>
                                )}
                              </div>
                              {itemOptions.length > 0 && (
                                <div className="flex flex-wrap gap-1 pl-4">
                                  {itemOptions.map((opt: any, oIdx: number) => {
                                    const optName = typeof opt === 'string' ? opt : (opt.optionNameSnapshot || opt.name)
                                    const optAdj = typeof opt === 'object' ? (opt.priceAdjustmentSnapshot || opt.priceAdjustment) : undefined
                                    return (
                                      <span
                                        key={oIdx}
                                        className="inline-block text-[10px] font-medium bg-[#f5f5f5] text-[#0a0a0a] px-1.5 py-0.5 rounded-[6px] border border-[#e5e5e5]"
                                      >
                                        {optName}
                                        {optAdj && optAdj > 0 ? ` (+${formatRupiah(optAdj)})` : ''}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {it.notes && (
                                <p className="text-[11px] text-[#737373] italic pl-4">
                                  Catatan: &quot;{it.notes}&quot;
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            {/* Polling live footer */}
            <div className="text-center pt-2 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-[#737373]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Memperbarui status otomatis setiap 4 detik</span>
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
          </div>

          {/* Right Column: Order Header, Bill Summary & Sticky Payment/Split Controls */}
          <div className="w-full lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto order-1 lg:order-2">
            {/* Order Header Card */}
            <Card surface="paper" className="space-y-4 rounded-[24px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
                    Nomor Pesanan Terpadu
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
                  {order.customerName && (
                    <p className="text-xs text-[#737373] mt-1 font-medium">
                      {order.customerName}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#e5e5e5] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#737373]">
                  <span>Subtotal Makanan:</span>
                  <span className="font-mono text-[#0a0a0a]">{formatRupiah(order.subtotal || order.totalAmount)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Diskon Voucher ({order.discountCode || 'Promo'}):</span>
                    <span className="font-mono font-bold">-{formatRupiah(order.discountAmount)}</span>
                  </div>
                )}
                {(order.serviceFee > 0 || order.taxAmount > 0) && (
                  <>
                    <div className="flex justify-between text-[#737373]">
                      <span>Biaya Layanan (3%):</span>
                      <span className="font-mono text-[#0a0a0a]">{formatRupiah(order.serviceFee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[#737373]">
                      <span>Pajak Restoran PB1 (10%):</span>
                      <span className="font-mono text-[#0a0a0a]">{formatRupiah(order.taxAmount || 0)}</span>
                    </div>
                  </>
                )}
                <div className="pt-1 border-t border-[#f0f0f0] flex justify-between items-center font-bold">
                  <span className="text-[#0a0a0a]">Total Tagihan:</span>
                  <span className="font-mono text-sm text-[#0a0a0a]">{formatRupiah(order.totalAmount || 0)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-between text-xs">
                <span className="text-[#737373]">Status Pembayaran:</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isOrderFullyPaid ? 'solid' : 'soft'}
                    className={
                      isOrderFullyPaid
                        ? 'bg-[#16a34a] text-white'
                        : isPartiallyPaid
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }
                  >
                    {isOrderFullyPaid
                      ? 'LUNAS'
                      : isPartiallyPaid
                        ? 'DIBAYAR SEBAGIAN'
                        : 'BELUM BAYAR'}
                  </Badge>
                  {!isOrderFullyPaid ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleOpenDirectPay}
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

            {/* ===================== SPLIT BILL ACTIVE PANEL ===================== */}
            {order.paymentGroups && order.paymentGroups.length > 1 ? (
              <Card surface="paper" className="p-4 sm:p-5 rounded-[24px] space-y-4 border border-[#e5e5e5] shadow-xs">
                {/* Split Bill Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center border border-[#e5e5e5]">
                      <Icons.Users className="w-4 h-4 text-[#0a0a0a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#0a0a0a]">
                        Tagihan Split Bill ({order.paymentGroups.length} Orang)
                      </h3>
                      <p className="text-[11px] text-[#737373]">
                        Setiap teman dapat membayar bagiannya dari HP masing-masing
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="soft"
                    className={`text-[10px] font-bold ${
                      isOrderFullyPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : isPartiallyPaid
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isOrderFullyPaid
                      ? 'Semua Lunas'
                      : isPartiallyPaid
                        ? 'Sebagian Lunas'
                        : 'Menunggu Pembayaran'}
                  </Badge>
                </div>

                {/* Share Link Banner (shown if not fully paid) */}
                {!isOrderFullyPaid && (
                  <div className="p-3.5 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a]">
                        <Icons.Share className="w-3.5 h-3.5 text-[#0a0a0a]" />
                        <span>Bagikan Link ke Teman Semeja</span>
                      </div>
                      <span className="text-[10px] text-[#737373]">Bayar dari device masing-masing</span>
                    </div>
                    <p className="text-xs text-[#737373] leading-relaxed">
                      Kirimkan link ini agar teman semeja dapat membuka daftar pesanan dan langsung membayar tagihan sesuai namanya:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyOrderLink()}
                        className="h-8 text-xs font-semibold rounded-[12px] flex items-center justify-center gap-1.5"
                      >
                        <Icons.Copy className="w-3.5 h-3.5" />
                        <span>Salin Link Meja</span>
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleShareTableWhatsApp}
                        className="h-8 text-xs font-semibold rounded-[12px] flex items-center justify-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white border-none"
                      >
                        <Icons.Message className="w-3.5 h-3.5" />
                        <span>Share WhatsApp</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Participants Cards List */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block">
                    Daftar Tagihan per Orang:
                  </span>
                  {order.paymentGroups.map((pg: any) => {
                    const isGroupPaid = pg.status === 'PAID'

                    return (
                      <div
                        key={pg.id}
                        className="p-3.5 rounded-[18px] bg-white border border-[#e5e5e5] space-y-3 shadow-xs hover:border-[#d4d4d4] transition-colors"
                      >
                        {/* Participant Header & Subtotal */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#0a0a0a] truncate">
                                {pg.participantName}
                              </span>
                              <Badge
                                variant={isGroupPaid ? 'solid' : 'soft'}
                                className={`text-[9px] py-0 px-2 font-mono ${
                                  isGroupPaid
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {isGroupPaid ? 'LUNAS' : 'BELUM BAYAR'}
                              </Badge>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sm text-[#0a0a0a] shrink-0">
                            {formatRupiah(pg.amountDue)}
                          </span>
                        </div>

                        {/* Allocated Items List */}
                        <div className="p-2.5 rounded-[12px] bg-[#fafafa] border border-[#f0f0f0] space-y-2 text-xs">
                          {(pg.items || []).map((it: any, itemIdx: number) => {
                            const itemOptions = it.options || it.orderItemOptions || []
                            return (
                              <div key={it.id || itemIdx} className="space-y-0.5">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[#0a0a0a] font-medium">
                                    {it.quantity}x {it.menuName || it.menuNameSnapshot || 'Item'}
                                  </span>
                                  <span className="font-mono text-[#737373] shrink-0 text-[11px]">
                                    {formatRupiah(it.allocatedAmount || it.subtotal || 0)}
                                  </span>
                                </div>
                                {itemOptions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pl-3">
                                    {itemOptions.map((opt: any, oIdx: number) => {
                                      const optName = typeof opt === 'string' ? opt : (opt.optionNameSnapshot || opt.name)
                                      return (
                                        <span
                                          key={oIdx}
                                          className="inline-block text-[10px] font-medium bg-[#f5f5f5] text-[#0a0a0a] px-1.5 py-0.5 rounded-[6px] border border-[#e5e5e5]"
                                        >
                                          {optName}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                                {it.notes && (
                                  <span className="text-[11px] text-[#737373] block italic pl-3">
                                    Catatan: &quot;{it.notes}&quot;
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Financial Breakdown (Subtotal, Layanan 3%, PB1 10%, Total) */}
                        {(() => {
                          const sub = pg.subtotal ?? (pg.items || []).reduce((acc: number, it: any) => acc + (it.allocatedAmount || 0), 0)
                          const svc = pg.serviceFee ?? Math.round(sub * 0.03)
                          const tax = pg.taxAmount ?? Math.round(sub * 0.10)
                          const due = pg.amountDue ?? (sub + svc + tax)
                          return (
                            <div className="pt-2 border-t border-[#f0f0f0] space-y-1 text-xs">
                              <div className="flex justify-between text-[#737373]">
                                <span>Subtotal Menu:</span>
                                <span className="font-mono text-[#0a0a0a]">{formatRupiah(sub)}</span>
                              </div>
                              <div className="flex justify-between text-[#737373]">
                                <span>Biaya Layanan (3%):</span>
                                <span className="font-mono text-[#0a0a0a]">{formatRupiah(svc)}</span>
                              </div>
                              <div className="flex justify-between text-[#737373]">
                                <span>Pajak Restoran PB1 (10%):</span>
                                <span className="font-mono text-[#0a0a0a]">{formatRupiah(tax)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-[#0a0a0a] pt-1 border-t border-[#e5e5e5]">
                                <span>Total Tagihan:</span>
                                <span className="font-mono">{formatRupiah(due)}</span>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Actions for this participant if not yet paid */}
                        {!isGroupPaid && (
                          <div className="pt-2 border-t border-[#f5f5f5] space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handlePayParticipantMidtrans(pg.id)}
                                className="h-8 text-xs font-bold rounded-[12px] flex items-center justify-center gap-1.5"
                              >
                                <Icons.CreditCard className="w-3.5 h-3.5" />
                                <span>Bayar via Midtrans</span>
                              </Button>

                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenParticipantCashPass(pg)}
                                className="h-8 text-xs font-bold rounded-[12px] flex items-center justify-center gap-1.5"
                              >
                                <Icons.Check className="w-3.5 h-3.5" />
                                <span>Bayar Kasir (Cash)</span>
                              </Button>
                            </div>

                            {/* Personal Share Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleCopyParticipantBill(pg)}
                                className="text-[11px] font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Icons.Copy className="w-3 h-3" />
                                <span>Salin Tagihan {pg.participantName}</span>
                              </button>
                              <span className="text-[#d4d4d4]">•</span>
                              <button
                                type="button"
                                onClick={() => handleShareParticipantWA(pg)}
                                className="text-[11px] font-semibold text-[#16a34a] hover:text-[#15803d] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Icons.Message className="w-3 h-3" />
                                <span>Kirim WA ke {pg.participantName}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Split configuration edit button or lock notification */}
                {!hasAnyGroupPaid ? (
                  <div className="pt-2 border-t border-[#e5e5e5] text-center">
                    <button
                      type="button"
                      onClick={handleOpenSplitEditor}
                      className="text-xs font-bold text-[#737373] hover:text-[#0a0a0a] transition-colors underline underline-offset-4 cursor-pointer"
                    >
                      Atur Ulang Pembagian Menu (Edit Split Bill)
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-center gap-1.5 text-[11px] text-[#737373]">
                    <Icons.Lock className="w-3.5 h-3.5 text-[#a3a3a3]" />
                    <span>Pembagian menu telah dikunci karena pembayaran sudah dimulai.</span>
                  </div>
                )}
              </Card>
            ) : (
              /* ===================== SINGLE BILL / SPLIT PROMPT PANEL ===================== */
              !isOrderFullyPaid && (
                <Card surface="paper" className="p-4 sm:p-5 rounded-[24px] space-y-3.5 border border-[#e5e5e5] shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#0a0a0a]">Pilihan Pembayaran Meja</h3>
                      <p className="text-xs text-[#737373] mt-0.5">
                        Total tagihan: <span className="font-mono font-bold text-[#0a0a0a]">{formatRupiah(order.totalAmount || 0)}</span>
                      </p>
                    </div>
                    <Badge variant="soft" className="text-xs bg-amber-100 text-amber-900 border border-amber-300">
                      BELUM BAYAR
                    </Badge>
                  </div>

                  <p className="text-xs text-[#737373] leading-relaxed">
                    Anda dapat langsung melunasi seluruh tagihan meja, atau membaginya (Split Bill) per menu makanan ke teman semeja agar bisa dibayar dari HP masing-masing.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleOpenDirectPay}
                      className="h-9 text-xs font-bold rounded-[14px] flex items-center justify-center gap-1.5"
                    >
                      <Icons.CreditCard className="w-3.5 h-3.5" />
                      <span>Bayar via Midtrans</span>
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleOpenDirectCashPass}
                      className="h-9 text-xs font-bold rounded-[14px] flex items-center justify-center gap-1.5"
                    >
                      <Icons.Check className="w-3.5 h-3.5" />
                      <span>Bayar Kasir (Cash)</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenSplitEditor}
                      className="h-9 text-xs font-bold rounded-[14px] flex items-center justify-center gap-1.5"
                    >
                      <Icons.Users className="w-3.5 h-3.5" />
                      <span>Bagi Tagihan (Split Bill)</span>
                    </Button>
                  </div>
                </Card>
              )
            )}
          </div>
        </div>

        {/* Payment Modal */}
        {order && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false)
              setSelectedPaymentGroupId(null)
              setOpenSplitAllocation(false)
              fetchTrack()
            }}
            orderId={order.id || orderNumber || ''}
            orderNumber={order.orderNumber || orderNumber || ''}
            totalAmount={order.totalAmount || 0}
            tableNumber={order.tableNumber}
            initialPaymentGroupId={selectedPaymentGroupId}
            openInSplitAllocation={openSplitAllocation}
            onPaymentSuccess={() => {
              setIsPaymentModalOpen(false)
              setSelectedPaymentGroupId(null)
              setOpenSplitAllocation(false)
              fetchTrack()
            }}
          />
        )}

        
        {/* Cashier Payment Pass Modal */}
        {cashierPassTarget && (
          <CashierPaymentPassModal
            isOpen={isCashierPassOpen}
            onClose={() => {
              setIsCashierPassOpen(false)
              fetchTrack()
            }}
            orderNumber={cashierPassTarget.orderNumber}
            paymentGroupId={cashierPassTarget.paymentGroupId}
            tableNumber={cashierPassTarget.tableNumber}
            participantName={cashierPassTarget.participantName}
            items={cashierPassTarget.items}
            subtotal={cashierPassTarget.subtotal}
            serviceFee={cashierPassTarget.serviceFee}
            taxAmount={cashierPassTarget.taxAmount}
            amountDue={cashierPassTarget.amountDue}
            isPaid={Boolean(
              (order.paymentGroups || []).find((g: any) => g.id === cashierPassTarget.paymentGroupId)?.status === 'PAID' ||
              order.paymentStatus === 'PAID'
            )}
            onPaidSuccess={() => {
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
