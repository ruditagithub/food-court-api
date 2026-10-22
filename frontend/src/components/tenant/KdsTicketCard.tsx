import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'
import { formatDate } from '../../lib/utils'

interface KdsTicketProps {
  tenantOrder: any
  orderNumber: string
  tableNumber?: string
  customerName?: string
  createdAt?: string
  onUpdateStatus: (tenantOrderId: string, nextStatus: 'PREPARING' | 'READY' | 'COMPLETED') => void
  isUpdating?: boolean
}

export function KdsTicketCard({
  tenantOrder,
  orderNumber,
  tableNumber,
  customerName,
  createdAt,
  onUpdateStatus,
  isUpdating,
}: KdsTicketProps) {
  const currentStatus = tenantOrder.status || tenantOrder.cookingStatus || 'QUEUED'

  const getNextAction = () => {
    switch (currentStatus) {
      case 'QUEUED':
        return { label: 'Mulai Masak', nextStatus: 'PREPARING' as const, variant: 'primary' as const }
      case 'PREPARING':
        return { label: 'Selesai Masak', nextStatus: 'READY' as const, variant: 'primary' as const }
      case 'READY':
        return { label: 'Pesanan Diambil', nextStatus: 'COMPLETED' as const, variant: 'secondary' as const }
      default:
        return null
    }
  }

  const nextAction = getNextAction()

  return (
    <Card
      surface="paper"
      className="!p-4 border-2 border-[#e5e5e5] shadow-xs space-y-3 flex flex-col justify-between"
    >
      <div>
        {/* Header: Order Number, Table, Elapsed Time */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#e5e5e5]">
          <div>
            <span className="font-mono font-bold text-sm text-[#0a0a0a] block">
              {orderNumber}
            </span>
            <span className="text-xs text-[#737373]">
              {customerName ? `Atas Nama: ${customerName}` : 'Tamu Meja'}
            </span>
          </div>

          <Badge variant="solid" className="font-mono text-xs">
            {tableNumber ? `Meja ${tableNumber}` : 'Bawa Pulang'}
          </Badge>
        </div>

        {/* Item List */}
        <div className="py-2 space-y-2 text-xs">
          {tenantOrder.items?.map((item: any, idx: number) => (
            <div key={item.id || idx} className="space-y-0.5">
              <div className="flex items-center justify-between font-bold text-[#0a0a0a]">
                <span>
                  {item.quantity}x {item.menuNameSnapshot || item.menu?.name || item.name}
                </span>
              </div>
              {(item.notes || item.specialInstructions) && (
                <p className="text-[11px] font-semibold text-[#e7000b] bg-[#fff0f0] px-2 py-0.5 rounded-[8px]">
                  Catatan: {item.notes || item.specialInstructions}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer & Action button */}
      <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#737373] font-mono">
          {createdAt ? formatDate(createdAt).split(',')[1] : ''}
        </span>

        {nextAction && (
          <Button
            type="button"
            variant={nextAction.variant}
            size="sm"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(tenantOrder.id, nextAction.nextStatus)}
            className="text-xs font-bold gap-1.5"
          >
            {isUpdating ? (
              <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{nextAction.label}</span>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
