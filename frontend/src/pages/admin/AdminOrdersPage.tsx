import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { OrderDetailDialog } from '../../components/admin/OrderDetailDialog'
import { formatRupiah, formatDate } from '../../lib/utils'

export function AdminOrdersPage() {
  const { user } = useAuth()
  const isTenant = user?.role === 'tenant'
  const { error: toastError } = useToast()

  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Dialog state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any[] }>('/api/orders', {
        token: token || undefined,
      })
      setOrders(res.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar pesanan'
      toastError('Gagal Memuat Pesanan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filteredOrders = orders.filter((ord) => {
    const orderNum = ord.orderNumber || ord.order?.orderNumber || ''
    const custName = ord.customerName || ord.order?.customerName || ''
    const matchesSearch = search.trim()
      ? orderNum.toLowerCase().includes(search.toLowerCase()) ||
        custName.toLowerCase().includes(search.toLowerCase())
      : true
    const currentStatus = ord.orderStatus || ord.status || ''
    const matchesStatus = statusFilter
      ? currentStatus === statusFilter
      : true
    return matchesSearch && matchesStatus
  })

  return (
    <InternalLayout
      title={isTenant ? "Rekap Pesanan Gerai" : "Monitoring Pesanan Food Court"}
      subtitle={
        isTenant
          ? "Daftar seluruh riwayat transaksi pesanan dan status sajian di gerai Anda"
          : "Pantau alur transaksi seluruh stan, intervensi kendala dapur, dan status meja"
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <Card surface="paper" className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Cari nomor pesanan (ORD-...) atau nama pembeli..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            <div className="w-full sm:w-56">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status Pesanan</option>
                {isTenant ? (
                  <>
                    <option value="QUEUED">QUEUED (Antre Dapur)</option>
                    <option value="PREPARING">PREPARING (Sedang Dimasak)</option>
                    <option value="READY">READY (Siap Diambil)</option>
                    <option value="COMPLETED">COMPLETED (Selesai)</option>
                    <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
                  </>
                ) : (
                  <>
                    <option value="DRAFT">DRAFT</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="SENT_TO_KITCHEN">SENT TO KITCHEN</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </>
                )}
              </Select>
            </div>
          </div>
        </Card>

        {/* Orders Table */}
        <Card surface="paper" className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-3 px-4 font-medium">Nomor Order</th>
                  <th className="py-3 px-4 font-medium">Pelanggan & Meja</th>
                  <th className="py-3 px-4 font-medium">Total Tagihan</th>
                  <th className="py-3 px-4 font-medium">Status Pesanan</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Waktu</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      <div className="flex items-center justify-center gap-2">
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        <span>Memuat pesanan...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#737373]">
                      Tidak ada pesanan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const orderNum = ord.orderNumber || ord.order?.orderNumber || 'ORD-...'
                    const custName = ord.customerName || ord.order?.customerName || 'Tamu'
                    const tableNum = ord.table?.tableNumber || ord.order?.session?.table?.tableNumber
                    const isTakeaway =
                      ord.order?.session?.orderType === 'TAKEAWAY' ||
                      ord.session?.orderType === 'TAKEAWAY' ||
                      (!tableNum && !ord.table)
                    const totalAmt = ord.totalAmount ?? ord.subtotal ?? 0
                    const orderSt = ord.orderStatus || ord.status || 'CONFIRMED'

                    return (
                      <tr
                        key={ord.id}
                        className="hover:bg-[#fafafa] transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedOrder(ord)
                          setDetailOpen(true)
                        }}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#0a0a0a]">
                          {orderNum}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <p className="font-semibold text-[#0a0a0a]">
                            {custName}
                          </p>
                          <div className="mt-0.5">
                            {tableNum ? (
                              <span className="inline-block text-[11px] font-mono font-medium text-[#0a0a0a] bg-[#f5f5f5] px-1.5 py-0.5 rounded-[6px]">
                                Meja {tableNum}
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-mono text-[#737373] bg-[#f0f0f0] px-1.5 py-0.5 rounded-[6px]">
                                {isTakeaway ? 'Bawa Pulang (Takeaway)' : 'Tanpa Meja'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#0a0a0a]">
                          {formatRupiah(totalAmt)}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              orderSt === 'COMPLETED'
                                ? 'solid'
                                : orderSt === 'CANCELLED'
                                ? 'outline'
                                : 'soft'
                            }
                            className="text-[10px]"
                          >
                            {orderSt}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-[#737373] hidden sm:table-cell">
                          {ord.createdAt ? formatDate(ord.createdAt) : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            title="Rincian"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrder(ord)
                              setDetailOpen(true)
                            }}
                            className="p-1.5 rounded-[12px] bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#0a0a0a] transition-colors inline-flex items-center gap-1 text-xs px-2 cursor-pointer"
                          >
                            <Icons.Eye className="w-3.5 h-3.5" />
                            <span>Rincian</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onOrderUpdated={fetchOrders}
      />
    </InternalLayout>
  )
}
