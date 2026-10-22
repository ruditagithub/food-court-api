import { useState, useEffect } from 'react'
import { apiFetch, getToken } from '../../api/client'
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetClose,
} from '../ui/Sheet'
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'
import { formatDate, formatRupiah } from '../../lib/utils'

interface DiningSessionDrawerProps {
  tableId: string | null
  tableNumber?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DiningSessionDrawer({
  tableId,
  tableNumber,
  open,
  onOpenChange,
}: DiningSessionDrawerProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !tableId) {
      setSessions([])
      return
    }

    const fetchSessions = async () => {
      setIsLoading(true)
      try {
        const token = getToken()
        const res = await apiFetch<{ data: any[] }>(`/api/tables/${tableId}/sessions?limit=15`, {
          token: token || undefined,
        })
        setSessions(res.data || [])
      } catch (err) {
        console.warn('Failed to load table dining sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSessions()
  }, [open, tableId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader>
        <div className="flex items-center justify-between">
          <SheetTitle>Riwayat Sesi Meja {tableNumber ? `No. ${tableNumber}` : ''}</SheetTitle>
          <SheetClose onClick={() => onOpenChange(false)} />
        </div>
        <SheetDescription>
          Jejak aktivitas pengunjung dan transaksi yang tercatat di meja ini
        </SheetDescription>
      </SheetHeader>

      <SheetContent>
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Icons.Refresh className="w-6 h-6 animate-spin text-[#737373]" />
            <p className="text-xs text-[#737373]">Memuat sesi meja...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#737373]">
            Belum ada riwayat sesi makan di meja ini.
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0a0a0a]">
                      #{session.sessionCode || session.id.slice(0, 8)}
                    </span>
                    <Badge variant={session.status === 'ACTIVE' ? 'solid' : 'soft'}>
                      {session.status || 'COMPLETED'}
                    </Badge>
                  </div>
                  <span className="text-[#737373] text-[11px]">
                    {session.createdAt ? formatDate(session.createdAt) : '-'}
                  </span>
                </div>

                {/* Orders summary */}
                {session.orders && session.orders.length > 0 && (
                  <div className="pt-2 border-t border-[#e5e5e5] space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#737373]">
                      Pesanan ({session.orders.length}):
                    </span>
                    {session.orders.map((o: any) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between font-mono text-[11px]"
                      >
                        <span className="text-[#0a0a0a] font-medium">{o.orderNumber}</span>
                        <span className="font-bold">{formatRupiah(o.totalAmount || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
