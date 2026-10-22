import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { ReceiptModal } from '../../components/payment/ReceiptModal'
import { formatRupiah, formatDate } from '../../lib/utils'

export function AdminPaymentsPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL')
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any[] }>('/api/orders', {
        token: token || undefined,
      })
      setOrders(res.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat log pembayaran'
      toastError('Gagal Memuat', msg)
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Handle instant cashier cash acceptance
  const handleCashierAccept = async (order: any) => {
    setIsProcessingPayment(order.id)
    try {
      const token = getToken()
      await apiFetch('/api/payments', {
        method: 'POST',
        token: token || undefined,
        body: {
          orderId: order.id,
          paymentMethod: 'CASH',
          amount: order.totalAmount,
          provider: 'Kasir-Admin',
        },
      })

      toastSuccess(
        'Pembayaran Diterima',
        `Pesanan ${order.orderNumber} telah ditandai lunas dan diteruskan ke dapur.`
      )
      await fetchOrders()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses pembayaran kasir'
      toastError('Gagal Pembayaran', msg)
    } finally {
      setIsProcessingPayment(null)
    }
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase()))

      const isPaid = o.paymentStatus === 'PAID'
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PAID'
          ? isPaid
          : !isPaid

      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, statusFilter])

  // Metrics
  const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID')
  const totalOmzet = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const pendingCount = orders.filter((o) => o.paymentStatus !== 'PAID').length

  return (
    <InternalLayout
      title="Rekap Pembayaran & Log Transaksi"
      subtitle="Pantau arus kas masuk, konfirmasi pembayaran kasir, dan cetak struk resmi transaksi"
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card surface="paper" className="p-5 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
              Total Omzet Hari Ini
            </span>
            <div className="text-2xl font-black font-mono text-[#0a0a0a]">
              {formatRupiah(totalOmzet)}
            </div>
            <p className="text-[11px] text-[#737373]">
              Dari total {paidOrders.length} transaksi berhasil
            </p>
          </Card>

          <Card surface="paper" className="p-5 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
              Transaksi Berhasil (PAID)
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600">
              {paidOrders.length}
            </div>
            <p className="text-[11px] text-[#737373]">
              Dana lunas diverifikasi Midtrans / Kasir
            </p>
          </Card>

          <Card surface="paper" className="p-5 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
              Menunggu Pembayaran
            </span>
            <div className="text-2xl font-black font-mono text-amber-600">
              {pendingCount}
            </div>
            <p className="text-[11px] text-[#737373]">
              Menunggu pembayaran di meja / konter kasir
            </p>
          </Card>
        </div>

        {/* Filter bar */}
        <Card surface="paper" className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. order atau nama..."
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              size="sm"
              variant={statusFilter === 'ALL' ? 'primary' : 'outline'}
              onClick={() => setStatusFilter('ALL')}
              className="text-xs h-9"
            >
              Semua ({orders.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'PAID' ? 'primary' : 'outline'}
              onClick={() => setStatusFilter('PAID')}
              className="text-xs h-9"
            >
              Lunas ({paidOrders.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'PENDING' ? 'primary' : 'outline'}
              onClick={() => setStatusFilter('PENDING')}
              className="text-xs h-9"
            >
              Pending ({pendingCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchOrders}
              className="h-9 px-3"
              title="Refresh Data"
            >
              <Icons.Refresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card surface="paper" className="overflow-hidden p-0 border border-[#e5e5e5]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[10px] font-mono uppercase tracking-wider text-[#737373]">
                <tr>
                  <th className="p-3.5">Waktu</th>
                  <th className="p-3.5">No. Pesanan</th>
                  <th className="p-3.5">Meja</th>
                  <th className="p-3.5">Pemesan</th>
                  <th className="p-3.5">Total Tagihan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-[#737373]">
                      <div className="flex items-center justify-center gap-2">
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        <span>Memuat data transaksi...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-[#737373]">
                      Tidak ada data transaksi yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isPaid = order.paymentStatus === 'PAID'
                    const tableNum = order.session?.table?.tableNumber || '-'

                    return (
                      <tr key={order.id} className="hover:bg-[#fafafa] transition-colors">
                        <td className="p-3.5 text-[#737373] whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#0a0a0a]">
                          {order.orderNumber}
                        </td>
                        <td className="p-3.5">
                          <Badge variant="soft" className="font-mono text-[10px]">
                            Meja {tableNum}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-[#0a0a0a] font-medium">
                          {order.customerName || '-'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#0a0a0a] whitespace-nowrap">
                          {formatRupiah(order.totalAmount || 0)}
                        </td>
                        <td className="p-3.5">
                          <Badge variant={isPaid ? 'solid' : 'soft'}>
                            {isPaid ? 'LUNAS (PAID)' : 'PENDING'}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaid && (
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={isProcessingPayment === order.id}
                                onClick={() => handleCashierAccept(order)}
                                className="h-7 text-[11px] px-2.5 rounded-[14px] flex items-center gap-1 font-bold"
                              >
                                {isProcessingPayment === order.id ? (
                                  <Icons.Refresh className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Icons.CreditCard className="w-3 h-3" />
                                )}
                                Terima Kasir
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReceiptOrder(order)}
                              className="h-7 text-[11px] px-2.5 rounded-[14px] flex items-center gap-1"
                            >
                              <Icons.Printer className="w-3 h-3" />
                              Struk
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Receipt Modal */}
        {selectedReceiptOrder && (
          <ReceiptModal
            isOpen={!!selectedReceiptOrder}
            onClose={() => setSelectedReceiptOrder(null)}
            orderId={selectedReceiptOrder.id}
            orderNumber={selectedReceiptOrder.orderNumber}
          />
        )}
      </div>
    </InternalLayout>
  )
}
