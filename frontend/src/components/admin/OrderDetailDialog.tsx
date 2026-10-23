import { useState } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../ui/Toast'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'
import { formatRupiah, formatDate } from '../../lib/utils'

interface OrderDetailDialogProps {
  order: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderUpdated?: () => void
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onOrderUpdated,
}: OrderDetailDialogProps) {
  const { error: toastError, success: toastSuccess } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  if (!order) return null

  const isTenantOrder = !!order.order || !order.tenantOrders
  const orderNumber = order.orderNumber || order.order?.orderNumber || 'ORD-...'
  const currentStatus = order.orderStatus || order.status || 'CONFIRMED'
  const customerName = order.customerName || order.order?.customerName || 'Tamu Meja'
  const tableNumber =
    order.table?.tableNumber ||
    order.tableNumber ||
    order.order?.session?.table?.tableNumber ||
    (order.order?.session?.orderType === 'TAKEAWAY' || order.session?.orderType === 'TAKEAWAY'
      ? 'Bawa Pulang'
      : '-')
  const paymentStatus = order.paymentStatus || order.order?.paymentStatus || 'PENDING'
  const notes = order.notes || order.order?.notes
  const totalAmount = order.totalAmount ?? order.subtotal ?? 0
  const items = order.items || []
  const tenantOrdersList = order.tenantOrders || []

  const handleUpdateStatus = async (newStatus: 'COMPLETED' | 'CANCELLED') => {
    setIsUpdating(true)
    try {
      const token = getToken()
      const endpoint = isTenantOrder
        ? `/api/orders/tenant-orders/${order.id}/status`
        : `/api/orders/${order.id}/status`
      const payload = isTenantOrder
        ? { status: newStatus, cookingStatus: newStatus }
        : { status: newStatus }

      await apiFetch(endpoint, {
        method: 'PATCH',
        token: token || undefined,
        body: payload,
      })
      toastSuccess('Status Pesanan Diubah', `Pesanan telah diubah menjadi ${newStatus}.`)
      onOpenChange(false)
      onOrderUpdated?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status pesanan'
      toastError('Gagal Memperbarui', msg)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <div className="flex items-center justify-between pr-6">
          <DialogTitle className="font-mono text-base">
            {orderNumber}
          </DialogTitle>
          <Badge
            variant={
              currentStatus === 'COMPLETED'
                ? 'solid'
                : currentStatus === 'CANCELLED'
                ? 'outline'
                : 'soft'
            }
          >
            {currentStatus}
          </Badge>
        </div>
        <DialogDescription>
          Rincian sajian, catatan pelanggan, dan tindakan status pesanan
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 my-2 text-xs">
        {/* Customer & Table details */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#737373]">
              Pelanggan
            </span>
            <p className="font-semibold text-[#0a0a0a] mt-0.5">
              {customerName}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-[#737373]">
              Nomor Meja
            </span>
            <p className="font-mono font-bold text-[#0a0a0a] mt-0.5">
              {tableNumber}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-[#737373]">
              Waktu Pesanan
            </span>
            <p className="text-[#0a0a0a] mt-0.5">
              {order.createdAt ? formatDate(order.createdAt) : '-'}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-[#737373]">
              Status Bayar
            </span>
            <p className="font-bold text-[#0a0a0a] mt-0.5">
              {paymentStatus}
            </p>
          </div>
        </div>

        {notes && (
          <div className="p-3 rounded-[14px] bg-[#f5f5f5] text-[11px] text-[#0a0a0a]">
            <strong>Catatan Pesanan:</strong> {notes}
          </div>
        )}

        {/* Tenant Sub-Orders Breakdown (Admin View) */}
        {tenantOrdersList.length > 0 && (
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373] block">
              Sub-Order Stan Dapur ({tenantOrdersList.length})
            </span>

            {tenantOrdersList.map((to: any) => (
              <div
                key={to.id}
                className="p-3 rounded-[16px] bg-[#ffffff] border border-[#e5e5e5] space-y-2"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5]">
                  <span className="font-bold text-[#0a0a0a]">
                    {to.tenant?.name || to.tenantName || 'Stan Kios'}
                  </span>
                  <Badge variant="soft" className="text-[10px]">
                    {to.status || to.cookingStatus || 'QUEUED'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {to.items?.map((it: any, itIdx: number) => (
                    <div key={it.id || itIdx} className="flex justify-between">
                      <span>
                        {it.quantity}x {it.menuNameSnapshot || it.name}
                      </span>
                      <span className="font-mono text-[#737373]">
                        {formatRupiah(it.subtotal || (it.unitPriceSnapshot || 0) * it.quantity || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Direct Items List (Tenant View) */}
        {items.length > 0 && tenantOrdersList.length === 0 && (
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373] block">
              Menu Pesanan ({items.length})
            </span>

            <div className="p-3 rounded-[16px] bg-[#ffffff] border border-[#e5e5e5] space-y-2">
              <div className="space-y-1.5">
                {items.map((it: any, itIdx: number) => (
                  <div key={it.id || itIdx} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#0a0a0a]">
                        {it.quantity}x {it.menuNameSnapshot || it.menu?.name || it.name}
                      </span>
                      {it.notes && (
                        <p className="text-[10px] text-[#737373] italic">
                          Catatan: {it.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[#737373]">
                      {formatRupiah(it.subtotal || (it.unitPriceSnapshot || 0) * it.quantity || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Total Calculation */}
        <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-between text-sm font-bold text-[#0a0a0a]">
          <span>Total Pesanan</span>
          <span className="text-base font-mono">{formatRupiah(totalAmount)}</span>
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleUpdateStatus('CANCELLED')}
          disabled={isUpdating || currentStatus === 'CANCELLED'}
          className="text-[#e7000b] hover:bg-[#fff0f0] border-[#e5e5e5]"
        >
          <Icons.Close className="w-3.5 h-3.5 mr-1" />
          Batalkan Pesanan
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={() => handleUpdateStatus('COMPLETED')}
          disabled={isUpdating || currentStatus === 'COMPLETED'}
        >
          {isUpdating ? 'Memproses...' : isTenantOrder ? 'Selesaikan Pesanan' : 'Selesaikan & Bebaskan Meja'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
