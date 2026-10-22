import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { KdsTicketCard } from '../../components/tenant/KdsTicketCard'
import { Icons } from '../../components/ui/Icons'

export function KitchenDisplayPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [tenant, setTenant] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Fetch tenant stall info and orders
  const fetchKdsData = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) return

      // 1. Get tenant info
      const tRes = await apiFetch<{ data: any }>('/api/tenants/mine', { token })
      if (tRes.data) {
        setTenant(tRes.data)
      }

      // 2. Fetch orders
      const res = await apiFetch<{ data: any[] }>('/api/orders', { token })
      setOrders(res.data || [])
    } catch (err: unknown) {
      console.warn('Error polling KDS:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKdsData()
    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchKdsData()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchKdsData])

  // Update status
  const handleUpdateStatus = async (
    tenantOrderId: string,
    nextStatus: 'PREPARING' | 'READY' | 'COMPLETED'
  ) => {
    setUpdatingId(tenantOrderId)
    try {
      const token = getToken()
      await apiFetch(`/api/orders/tenant-orders/${tenantOrderId}/status`, {
        method: 'PATCH',
        token: token || undefined,
        body: {
          cookingStatus: nextStatus,
          status: nextStatus,
        },
      })
      toastSuccess('Status Dapur Diperbarui', `Pesanan dialihkan ke ${nextStatus}`)
      fetchKdsData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status memasak'
      toastError('Gagal Memperbarui', msg)
    } finally {
      setUpdatingId(null)
    }
  }

  // Extract tenant orders belonging to current stall
  const allTenantTickets = orders.flatMap((ord) => {
    const matchingTenantOrders = (ord.tenantOrders || []).filter(
      (to: any) => !tenant?.id || to.tenantId === tenant.id
    )

    return matchingTenantOrders.map((to: any) => ({
      tenantOrder: to,
      orderNumber: ord.orderNumber,
      tableNumber: ord.table?.tableNumber || ord.tableNumber,
      customerName: ord.customerName,
      createdAt: ord.createdAt,
    }))
  })

  // Group into Kanban 3 columns
  const queuedTickets = allTenantTickets.filter(
    (t) => (t.tenantOrder.status || t.tenantOrder.cookingStatus) === 'QUEUED'
  )
  const preparingTickets = allTenantTickets.filter(
    (t) => (t.tenantOrder.status || t.tenantOrder.cookingStatus) === 'PREPARING'
  )
  const readyTickets = allTenantTickets.filter(
    (t) => (t.tenantOrder.status || t.tenantOrder.cookingStatus) === 'READY'
  )

  return (
    <InternalLayout
      title="Kitchen Display System (KDS)"
      subtitle="Antrean masak dapur real-time (Pembaruan otomatis setiap 5 detik)"
      foodCourtName={tenant?.foodCourt?.name}
      stallNumber={tenant?.stallNumber}
      actions={
        <div className="flex items-center gap-2 text-xs font-mono text-[#737373]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Polling Aktif</span>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2">
          <Icons.Refresh className="w-8 h-8 animate-spin text-[#0a0a0a]" />
          <p className="text-xs font-mono text-[#737373]">Menghubungkan ke Dapur...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* Column 1: Antre Masak (QUEUED) */}
          <div className="rounded-[24px] bg-[#f0f0f0] p-4 border border-[#e5e5e5] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="font-bold text-sm text-[#0a0a0a]">Antre Masak</h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[10px] bg-white text-[#0a0a0a]">
                {queuedTickets.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              {queuedTickets.length === 0 ? (
                <p className="py-12 text-center text-xs text-[#737373]">
                  Tidak ada antrean pesanan baru.
                </p>
              ) : (
                queuedTickets.map((item) => (
                  <KdsTicketCard
                    key={item.tenantOrder.id}
                    tenantOrder={item.tenantOrder}
                    orderNumber={item.orderNumber}
                    tableNumber={item.tableNumber}
                    customerName={item.customerName}
                    createdAt={item.createdAt}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={updatingId === item.tenantOrder.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Sedang Dimasak (PREPARING) */}
          <div className="rounded-[24px] bg-[#f0f0f0] p-4 border border-[#e5e5e5] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h3 className="font-bold text-sm text-[#0a0a0a]">Sedang Dimasak</h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[10px] bg-white text-[#0a0a0a]">
                {preparingTickets.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              {preparingTickets.length === 0 ? (
                <p className="py-12 text-center text-xs text-[#737373]">
                  Tidak ada masakan yang sedang diproses.
                </p>
              ) : (
                preparingTickets.map((item) => (
                  <KdsTicketCard
                    key={item.tenantOrder.id}
                    tenantOrder={item.tenantOrder}
                    orderNumber={item.orderNumber}
                    tableNumber={item.tableNumber}
                    customerName={item.customerName}
                    createdAt={item.createdAt}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={updatingId === item.tenantOrder.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Siap Diambil (READY) */}
          <div className="rounded-[24px] bg-[#f0f0f0] p-4 border border-[#e5e5e5] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-sm text-[#0a0a0a]">Siap Diambil</h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[10px] bg-white text-[#0a0a0a]">
                {readyTickets.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              {readyTickets.length === 0 ? (
                <p className="py-12 text-center text-xs text-[#737373]">
                  Tidak ada hidangan yang menunggu diambil.
                </p>
              ) : (
                readyTickets.map((item) => (
                  <KdsTicketCard
                    key={item.tenantOrder.id}
                    tenantOrder={item.tenantOrder}
                    orderNumber={item.orderNumber}
                    tableNumber={item.tableNumber}
                    customerName={item.customerName}
                    createdAt={item.createdAt}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={updatingId === item.tenantOrder.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </InternalLayout>
  )
}
