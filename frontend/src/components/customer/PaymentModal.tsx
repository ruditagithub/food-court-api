import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Icons } from '../ui/Icons'
import { useToast } from '../ui/Toast'
import { formatRupiah } from '../../lib/utils'
import {
  loadMidtransSnap,
  getMidtransSimulatorInfo,
  type MidtransSnapResult,
} from '../../lib/midtrans'

export interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
  totalAmount: number
  tableNumber?: string
  initialPaymentGroupId?: string | null
  openInSplitAllocation?: boolean
  onPaymentSuccess?: (paymentData: any) => void
}

type PaymentMode = 'DIRECT' | 'SPLIT'

interface PortionAllocation {
  key: string
  orderItemId: string
  menuName: string
  portionIndex: number
  totalPortions: number
  unitPrice: number
  notes?: string | null
  assignedParticipant: string
}

export function PaymentModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  tableNumber,
  initialPaymentGroupId,
  openInSplitAllocation,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { success: toastSuccess, error: toastError } = useToast()

  const [orderData, setOrderData] = useState<any>(null)
  const [isLoadingOrder, setIsLoadingOrder] = useState(false)
  const [activeMode, setActiveMode] = useState<PaymentMode>('DIRECT')
  const [isEditingSplit, setIsEditingSplit] = useState(false)

  // Split bill allocation state
  const [participantNames, setParticipantNames] = useState<string[]>([])
  const [newParticipantInput, setNewParticipantInput] = useState('')
  const [allocations, setAllocations] = useState<PortionAllocation[]>([])

  // Payment processing state
  const [processingGroupId, setProcessingGroupId] = useState<string | null>(null)
  const [syncingGroupId, setSyncingGroupId] = useState<string | null>(null)
  const [isSnapPopupOpen, setIsSnapPopupOpen] = useState(false)

  // Snap data and sync details stored per paymentGroupId
  const [snapByGroup, setSnapByGroup] = useState<Record<string, any>>({})
  const [syncDetailsByGroup, setSyncDetailsByGroup] = useState<Record<string, any>>({})

  // Fetch full live order data
  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return
    setIsLoadingOrder(true)
    try {
      const res = await apiFetch<{ data: any }>(`/api/orders/${orderId}`)
      const order = res.data
      setOrderData(order)

      const groups = order.paymentGroups || []
      const isSplitActive = groups.length > 1
      const orderHasPaid =
        order.paymentStatus === 'PAID' ||
        order.paymentStatus === 'PARTIALLY_PAID' ||
        groups.some((g: any) => g.status === 'PAID' || Number(g.amountPaid || 0) > 0)

      if (!openInSplitAllocation) {
        setActiveMode(isSplitActive ? 'SPLIT' : 'DIRECT')
      } else {
        setActiveMode('SPLIT')
        if (!orderHasPaid) {
          setIsEditingSplit(true)
        }
      }

      // If split bill not yet configured or in edit mode, initialize default allocations from order items
      const existingParticipants = Array.from(
        new Set(
          groups
            .map((g: any) => g.participantName?.trim())
            .filter((n: string) => Boolean(n) && n !== 'Tamu Meja')
        )
      ) as string[]

      const defaultPayer =
        order.customerName?.trim() ||
        order.session?.participants?.[0]?.name?.trim() ||
        'Pemesan Utama'

      const initialNames =
        existingParticipants.length > 0 ? existingParticipants : [defaultPayer]
      setParticipantNames(initialNames)

      // Map allocated quantities per orderItemId to participants
      const assignmentsByOrderItem = new Map<string, string[]>()
      if (isSplitActive) {
        groups.forEach((g: any) => {
          (g.items || []).forEach((gi: any) => {
            const arr = assignmentsByOrderItem.get(gi.orderItemId) || []
            const count = gi.quantity || 1
            for (let k = 0; k < count; k++) {
              arr.push(g.participantName)
            }
            assignmentsByOrderItem.set(gi.orderItemId, arr)
          })
        })
      }

      // Flatten order items into portion units
      const portions: PortionAllocation[] = []
      const allItems = order.items || []
      allItems.forEach((it: any) => {
        const qty = it.quantity || 1
        const unitPrice =
          it.unitPriceSnapshot ||
          (it.quantity > 0 ? Math.round(it.subtotal / it.quantity) : it.subtotal)

        const itemAssignments = assignmentsByOrderItem.get(it.id) || []

        for (let i = 0; i < qty; i++) {
          const assignedName = itemAssignments[i] || initialNames[0] || 'Pemesan Utama'
          portions.push({
            key: `${it.id}-${i}`,
            orderItemId: it.id,
            menuName: it.menuNameSnapshot || it.name || 'Menu',
            portionIndex: i + 1,
            totalPortions: qty,
            unitPrice,
            notes: it.notes || null,
            assignedParticipant: assignedName,
          })
        }
      })
      setAllocations(portions)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat detail tagihan pesanan'
      toastError('Gagal Memuat Pesanan', msg)
    } finally {
      setIsLoadingOrder(false)
    }
  }, [orderId, openInSplitAllocation])

  useEffect(() => {
    if (isOpen) {
      fetchOrderDetails()
      if (openInSplitAllocation) {
        setActiveMode('SPLIT')
        setIsEditingSplit(true)
      } else {
        setIsEditingSplit(false)
      }
    }
  }, [isOpen, openInSplitAllocation, fetchOrderDetails])

  // Automatically trigger Midtrans Snap if an initial group is requested
  useEffect(() => {
    if (isOpen && initialPaymentGroupId && orderData?.paymentGroups) {
      const targetGroup = orderData.paymentGroups.find(
        (g: any) => g.id === initialPaymentGroupId
      )
      if (targetGroup && targetGroup.status !== 'PAID' && !processingGroupId && !isSnapPopupOpen) {
        handlePayViaMidtrans(initialPaymentGroupId)
      }
    }
  }, [isOpen, initialPaymentGroupId, orderData])

  // Add participant name in split editor
  const handleAddParticipant = () => {
    const trimmed = newParticipantInput.trim()
    if (!trimmed) return
    if (participantNames.includes(trimmed)) {
      toastError('Nama Sudah Ada', `Peserta "${trimmed}" sudah terdaftar.`)
      return
    }
    setParticipantNames((prev) => [...prev, trimmed])
    setNewParticipantInput('')
  }

  // Remove participant from split editor
  const handleRemoveParticipant = (nameToRemove: string) => {
    if (participantNames.length <= 1) {
      toastError('Minimal 1 Peserta', 'Setidaknya harus ada 1 nama pembayar.')
      return
    }
    const remaining = participantNames.filter((n) => n !== nameToRemove)
    setParticipantNames(remaining)

    // Reassign items of removed participant to first available participant
    const fallback = remaining[0]
    setAllocations((prev) =>
      prev.map((a) => (a.assignedParticipant === nameToRemove ? { ...a, assignedParticipant: fallback } : a))
    )
  }

  // Assign a portion to a participant
  const handleAssignPortion = (portionKey: string, participantName: string) => {
    setAllocations((prev) =>
      prev.map((p) => (p.key === portionKey ? { ...p, assignedParticipant: participantName } : p))
    )
  }

  // Calculate live split totals per participant
  const splitCalculations = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number
        subtotal: number
        serviceFee: number
        taxAmount: number
        totalDue: number
        items: PortionAllocation[]
      }
    >()
    participantNames.forEach((name) => {
      map.set(name, { count: 0, subtotal: 0, serviceFee: 0, taxAmount: 0, totalDue: 0, items: [] })
    })

    allocations.forEach((portion) => {
      const entry = map.get(portion.assignedParticipant)
      if (entry) {
        entry.count += 1
        entry.subtotal += portion.unitPrice
        entry.items.push(portion)
      }
    })

    // Compute service fee (3%) and tax (10% PB1)
    map.forEach((val) => {
      val.serviceFee = Math.round(val.subtotal * 0.03)
      val.taxAmount = Math.round(val.subtotal * 0.10)
      val.totalDue = val.subtotal + val.serviceFee + val.taxAmount
    })

    return map
  }, [participantNames, allocations])

  // Save Split Bill configuration to backend
  const handleSaveSplitBill = async () => {
    if (participantNames.length < 2) {
      toastError('Minimal 2 Pembayar', 'Tambahkan minimal 2 nama pembayar untuk menggunakan fitur Split Bill.')
      return
    }

    // Prepare groups payload
    const groupsPayload = participantNames.map((name) => {
      const pItems = allocations.filter((a) => a.assignedParticipant === name)
      // Group allocations by orderItemId
      const qtyByItem = new Map<string, number>()
      pItems.forEach((a) => {
        qtyByItem.set(a.orderItemId, (qtyByItem.get(a.orderItemId) ?? 0) + 1)
      })

      return {
        participantName: name,
        items: Array.from(qtyByItem.entries()).map(([orderItemId, quantity]) => ({
          orderItemId,
          quantity,
        })),
      }
    }).filter((g) => g.items.length > 0)

    if (groupsPayload.length < 2) {
      toastError('Alokasi Belum Merata', 'Setiap peserta harus memiliki minimal 1 porsi menu yang dibayarkan.')
      return
    }

    try {
      const res = await apiFetch<{ data: any }>(`/api/orders/${orderId}/split-bill`, {
        method: 'POST',
        body: { groups: groupsPayload },
      })
      toastSuccess('Split Bill Berhasil Disimpan', `Tagihan dibagi untuk ${groupsPayload.length} pembayar.`)
      setOrderData(res.data)
      setIsEditingSplit(false)
      setActiveMode('SPLIT')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pembagian tagihan'
      toastError('Gagal Split Bill', msg)
    }
  }

  // Reset to single direct bill
  const handleResetToDirectBill = async () => {
    if (!orderData?.items || orderData.items.length === 0) return
    const mainCustomer =
      orderData.customerName?.trim() ||
      orderData.session?.participants?.[0]?.name?.trim() ||
      'Pemesan Utama'

    const allItemsPayload = orderData.items.map((it: any) => ({
      orderItemId: it.id,
      quantity: it.quantity,
    }))

    try {
      const res = await apiFetch<{ data: any }>(`/api/orders/${orderId}/split-bill`, {
        method: 'POST',
        body: {
          groups: [
            {
              participantName: mainCustomer,
              items: allItemsPayload,
            },
          ],
        },
      })
      setOrderData(res.data)
      setActiveMode('DIRECT')
      setIsEditingSplit(false)
      toastSuccess('Kembali ke Tagihan Penuh', 'Mode pembayaran diubah menjadi 1 tagihan meja.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengatur ulang tagihan'
      toastError('Gagal Reset', msg)
    }
  }

  // Open Midtrans Snap Popup for a specific paymentGroup
  const handlePayViaMidtrans = async (paymentGroupId?: string) => {
    const groupId = paymentGroupId || orderData?.paymentGroups?.[0]?.id
    setProcessingGroupId(groupId || 'direct')

    try {
      let snapInfo = snapByGroup[groupId || 'default']

      // If not yet generated or different group, request snap token from backend
      if (!snapInfo) {
        const token = getToken()
        const res = await apiFetch<{ data: any }>('/api/payments/midtrans', {
          method: 'POST',
          token: token || undefined,
          body: {
            orderId,
            paymentGroupId: groupId,
          },
        })
        snapInfo = res.data
        setSnapByGroup((prev) => ({ ...prev, [groupId || 'default']: snapInfo }))
      }

      const snapInstance = await loadMidtransSnap(
        snapInfo.clientKey,
        Boolean(snapInfo.isProduction)
      )

      setIsSnapPopupOpen(true)
      setProcessingGroupId(null)

      snapInstance.pay(snapInfo.snapToken, {
        onSuccess: async (result: MidtransSnapResult) => {
          setIsSnapPopupOpen(false)
          await handleSyncMidtransStatus(snapInfo.paymentReference, groupId, result, false)
        },
        onPending: async (result: MidtransSnapResult) => {
          setIsSnapPopupOpen(false)
          await handleSyncMidtransStatus(snapInfo.paymentReference, groupId, result, true)
        },
        onError: () => {
          setIsSnapPopupOpen(false)
          toastError('Gagal Bayar', 'Terjadi kendala pada gateway pembayaran Midtrans.')
        },
        onClose: async () => {
          setIsSnapPopupOpen(false)
          await handleSyncMidtransStatus(snapInfo.paymentReference, groupId, undefined, true)
        },
      })
    } catch {
      setIsSnapPopupOpen(false)
      setProcessingGroupId(null)
      const fallbackSnap = snapByGroup[groupId || 'default']
      if (fallbackSnap?.redirectUrl) {
        window.open(fallbackSnap.redirectUrl, '_blank', 'noopener,noreferrer')
        toastSuccess('Halaman Midtrans Dibuka', 'Selesaikan pembayaran di halaman web Midtrans yang baru terbuka.')
      } else {
        toastError('Gagal Membuka UI Midtrans', 'Periksa koneksi internet untuk memuat Midtrans Snap.')
      }
    }
  }

  // Sync Midtrans payment status
  const handleSyncMidtransStatus = async (
    paymentRef: string,
    paymentGroupId?: string,
    snapCallbackResult?: MidtransSnapResult,
    silentIfPending = false
  ) => {
    const groupId = paymentGroupId || orderData?.paymentGroups?.[0]?.id || 'default'
    setSyncingGroupId(groupId)

    try {
      const token = getToken()
      const res = await apiFetch<{ data: any }>(`/api/payments/midtrans/${paymentRef}/sync`, {
        method: 'POST',
        token: token || undefined,
      })

      const synced = res.data
      const merged = {
        ...synced,
        paymentType: synced.paymentType || snapCallbackResult?.payment_type,
        vaNumbers:
          synced.vaNumbers && synced.vaNumbers.length > 0
            ? synced.vaNumbers
            : snapCallbackResult?.va_numbers || [],
        permataVaNumber: synced.permataVaNumber || snapCallbackResult?.permata_va_number || null,
        billKey: synced.billKey || snapCallbackResult?.bill_key || null,
        billerCode: synced.billerCode || snapCallbackResult?.biller_code || null,
        paymentCode: synced.paymentCode || snapCallbackResult?.payment_code || null,
      }

      setSyncDetailsByGroup((prev) => ({ ...prev, [groupId]: merged }))

      // Refresh live order details to update paid statuses across paymentGroups
      await fetchOrderDetails()

      if (synced.status === 'SUCCESS') {
        toastSuccess('Pembayaran Terverifikasi!', 'Status pembayaran berhasil lunas dan diverifikasi dari Midtrans.')
        onPaymentSuccess?.(merged)
      } else if (!silentIfPending) {
        toastError(
          'Pembayaran Belum Selesai',
          'Status di Midtrans masih PENDING. Silakan selesaikan simulasi pembayaran di web Midtrans Simulator.'
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memeriksa status ke Midtrans'
      if (!silentIfPending) {
        toastError('Gagal Cek Status', msg)
      }
    } finally {
      setSyncingGroupId(null)
    }
  }

  // Pay in cash at cashier for a specific group
  const handlePayCash = async (paymentGroupId?: string) => {
    const groupId = paymentGroupId || orderData?.paymentGroups?.[0]?.id
    const targetGroup = orderData?.paymentGroups?.find((g: any) => g.id === groupId)
    const amountToPay = targetGroup?.amountDue || totalAmount

    setProcessingGroupId(groupId || 'cash')
    try {
      const token = getToken()
      const res = await apiFetch<{ data: any }>('/api/payments', {
        method: 'POST',
        token: token || undefined,
        body: {
          orderId,
          paymentGroupId: groupId,
          paymentMethod: 'CASH',
          amount: amountToPay,
          provider: 'Manual',
        },
      })

      toastSuccess('Pembayaran Kasir Berhasil', `Tagihan telah dibayar tunai.`)
      await fetchOrderDetails()
      onPaymentSuccess?.(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses pembayaran kasir'
      toastError('Gagal Bayar Tunai', msg)
    } finally {
      setProcessingGroupId(null)
    }
  }

  const handleCopyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toastSuccess('Disalin', `${label} (${text}) berhasil disalin.`)
    } catch {
      // ignore
    }
  }

  // Status checks
  const paymentGroups = orderData?.paymentGroups || []
  const allPaid =
    paymentGroups.length > 0 && paymentGroups.every((g: any) => g.status === 'PAID')
  const hasAnyPaid =
    orderData?.paymentStatus === 'PAID' ||
    orderData?.paymentStatus === 'PARTIALLY_PAID' ||
    paymentGroups.some((g: any) => g.status === 'PAID' || Number(g.amountPaid || 0) > 0)

  // Guard against editing split bill once any payment has been made
  useEffect(() => {
    if (hasAnyPaid && isEditingSplit) {
      setIsEditingSplit(false)
    }
  }, [hasAnyPaid, isEditingSplit])

  // If Midtrans Snap popup iframe is currently open on top of the window, minimize modal container
  if (isSnapPopupOpen) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !processingGroupId && !syncingGroupId && onClose()} size="3xl">
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <Icons.CreditCard className="w-5 h-5 text-[#0a0a0a]" />
            <DialogTitle>
              {isEditingSplit || openInSplitAllocation
                ? `Atur Pembagian Tagihan (Split Bill)`
                : activeMode === 'SPLIT'
                  ? `Pembagian Tagihan Meja (Split Bill)`
                  : `Pembayaran Terpadu Meja`}
            </DialogTitle>
          </div>
          <Badge variant="solid" className="font-mono text-xs">
            {orderNumber}
          </Badge>
        </div>
      </DialogHeader>

      {isLoadingOrder && !orderData ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <Icons.Refresh className="w-6 h-6 animate-spin text-[#0a0a0a]" />
          <p className="text-xs font-mono text-[#737373]">Memuat tagihan meja...</p>
        </div>
      ) : allPaid ? (
        /* All Bills Fully Paid State */
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <Icons.Check className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[#0a0a0a]">Semua Tagihan Lunas!</h2>
            <p className="text-xs text-[#737373]">
              Seluruh pembayaran untuk pesanan <span className="font-mono font-bold text-[#0a0a0a]">{orderNumber}</span> telah lunas dan pesanan sudah masuk ke antrean dapur stan.
            </p>
          </div>

          <Card surface="canvas" className="p-4 text-left space-y-2 text-xs font-mono rounded-[20px]">
            <div className="flex justify-between text-[#737373]">
              <span>Total Pesanan:</span>
              <span className="font-bold text-[#0a0a0a]">{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[#737373]">
              <span>Status Meja:</span>
              <Badge variant="solid" className="bg-emerald-600 text-white text-[10px]">
                Lunas & Antrean Dapur
              </Badge>
            </div>
          </Card>

          <Button variant="primary" onClick={onClose} className="w-full h-11 text-sm font-bold rounded-[16px]">
            Lihat Progres Dapur (Live Tracking)
          </Button>
        </div>
      ) : (
        <div className="space-y-5 py-2">
          {/* Bill Summary Banner */}
          <Card surface="canvas" className="p-4 text-center space-y-1 rounded-[22px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
              Total Tagihan Pesanan Meja
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

          {/* Mode Switcher Tabs (Direct vs Split Bill) */}
          {!hasAnyPaid && !openInSplitAllocation && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#f5f5f5] rounded-[18px] border border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => {
                  if (activeMode === 'SPLIT' && paymentGroups.length > 1) {
                    handleResetToDirectBill()
                  } else {
                    setActiveMode('DIRECT')
                    setIsEditingSplit(false)
                  }
                }}
                className={`py-2 px-3 text-xs font-bold rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMode === 'DIRECT' && !isEditingSplit
                    ? 'bg-white text-[#0a0a0a] shadow-xs'
                    : 'text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                <Icons.CreditCard className="w-3.5 h-3.5" />
                <span>Langsung Bayar (1 Tagihan)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('SPLIT')
                  if (paymentGroups.length <= 1) {
                    setIsEditingSplit(true)
                  }
                }}
                className={`py-2 px-3 text-xs font-bold rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMode === 'SPLIT' || isEditingSplit
                    ? 'bg-white text-[#0a0a0a] shadow-xs'
                    : 'text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                <Icons.Users className="w-3.5 h-3.5" />
                <span>Split Bill (Bagi per Menu)</span>
              </button>
            </div>
          )}

          {/* ===================== VIEW A: SPLIT BILL ALLOCATION EDITOR ===================== */}
          {activeMode === 'SPLIT' && (isEditingSplit || paymentGroups.length <= 1) && !hasAnyPaid ? (
            <Card surface="paper" className="p-4 sm:p-5 rounded-[22px] space-y-4 border border-[#e5e5e5]">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#e5e5e5]">
                <div>
                  <h3 className="font-bold text-sm text-[#0a0a0a]">Atur Pembagian Menu & Pembayar</h3>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Tambahkan nama teman semeja (mis. Nanda, Najwa, Putra) dan pilih siapa yang membayar tiap sajian.
                  </p>
                </div>
                <Badge variant="soft" className="text-xs shrink-0">
                  {allocations.length} Porsi
                </Badge>
              </div>

              {/* Add Participant Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#0a0a0a]">Daftar Nama Pembayar:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newParticipantInput}
                    onChange={(e) => setNewParticipantInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
                    placeholder="Ketik nama teman (cth: Najwa, Putra)..."
                    className="flex-1 h-9 rounded-[14px] bg-[#fafafa] text-xs px-3 border border-[#e5e5e5] focus:border-[#0a0a0a] outline-none"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddParticipant}
                    className="h-9 px-3 text-xs font-bold shrink-0 rounded-[14px]"
                  >
                    + Tambah Teman
                  </Button>
                </div>

                {/* Participant Pills */}
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {participantNames.map((name) => {
                    const stats = splitCalculations.get(name)
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 bg-[#f5f5f5] text-[#0a0a0a] text-xs font-medium px-2.5 py-1 rounded-[12px] border border-[#e5e5e5]"
                      >
                        <span className="font-bold">{name}</span>
                        <span className="text-[10px] text-[#737373]">
                          ({stats?.count || 0} menu • {formatRupiah(stats?.totalDue || 0)})
                        </span>
                        {participantNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(name)}
                            className="text-[#dc2626] hover:text-[#991b1b] cursor-pointer ml-0.5"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Per-portion Menu Allocation List */}
              <div className="space-y-2 pt-2 border-t border-[#f0f0f0]">
                <label className="text-xs font-semibold text-[#0a0a0a]">
                  Pilih Siapa yang Membayar Setiap Makanan:
                </label>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {allocations.map((portion) => (
                    <div
                      key={portion.key}
                      className="p-3 rounded-[16px] bg-[#fafafa] border border-[#e5e5e5] space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#0a0a0a]">{portion.menuName}</span>
                            {portion.totalPortions > 1 && (
                              <Badge variant="soft" className="text-[10px] py-0 px-1.5">
                                Porsi {portion.portionIndex}/{portion.totalPortions}
                              </Badge>
                            )}
                          </div>
                          {portion.notes && (
                            <p className="text-[11px] text-[#737373] italic mt-0.5">
                              Catatan: &quot;{portion.notes}&quot;
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-[#0a0a0a] shrink-0">
                          {formatRupiah(portion.unitPrice)}
                        </span>
                      </div>

                      {/* Participant selector pills for this portion */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#f0f0f0]">
                        <span className="text-[10px] text-[#737373] mr-1">Dibayar oleh:</span>
                        {participantNames.map((name) => {
                          const isAssigned = portion.assignedParticipant === name
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleAssignPortion(portion.key, name)}
                              className={`text-[11px] px-2.5 py-0.5 rounded-[10px] font-semibold transition-all cursor-pointer ${
                                isAssigned
                                  ? 'bg-[#0a0a0a] text-white shadow-xs'
                                  : 'bg-white text-[#737373] hover:text-[#0a0a0a] border border-[#e5e5e5]'
                              }`}
                            >
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Financial Breakdown Summary */}
              <div className="p-3.5 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] space-y-2 text-xs">
                <span className="font-bold text-[#0a0a0a] text-xs block">
                  Ringkasan Tagihan per Orang (Termasuk Pajak & Layanan):
                </span>
                <div className="space-y-1.5">
                  {participantNames.map((name) => {
                    const stats = splitCalculations.get(name)
                    if (!stats) return null
                    return (
                      <div key={name} className="p-2.5 rounded-[12px] bg-white border border-[#e5e5e5] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#0a0a0a]">{name}</span>
                          <div className="text-[10px] text-[#737373] space-x-1">
                            <span>Subtotal: {formatRupiah(stats.subtotal)}</span>
                            <span>•</span>
                            <span>Layanan (3%): {formatRupiah(stats.serviceFee)}</span>
                            <span>•</span>
                            <span>PB1 (10%): {formatRupiah(stats.taxAmount)}</span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-sm text-[#0a0a0a]">
                          {formatRupiah(stats.totalDue)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons in Split Editor */}
              <div className="flex items-center justify-between pt-3 border-t border-[#e5e5e5] gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (openInSplitAllocation) {
                      onClose()
                    } else {
                      setIsEditingSplit(false)
                    }
                  }}
                  className="rounded-[14px]"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSplitBill}
                  className="rounded-[14px] font-bold"
                >
                  Simpan & Buat Tagihan Masing-Masing
                </Button>
              </div>
            </Card>
          ) : activeMode === 'SPLIT' && paymentGroups.length > 1 ? (
            /* ===================== VIEW B: SPLIT BILL PAYER CARDS ===================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#737373]">
                    Tagihan per Pembayar ({paymentGroups.length} Orang)
                  </h3>
                  <p className="text-[11px] text-[#737373]">
                    Setiap pembayar dapat menyelesaikan tagihannya masing-masing via Midtrans Snap atau Kasir.
                  </p>
                </div>

                {!hasAnyPaid && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingSplit(true)}
                    className="h-7 text-xs px-2.5 rounded-[12px]"
                  >
                    Ubah Pembagian
                  </Button>
                )}
              </div>

              {/* Individual Payer Cards */}
              <div className="space-y-3">
                {paymentGroups.map((group: any) => {
                  const isPaid = group.status === 'PAID'
                  const groupSnap = snapByGroup[group.id]
                  const groupSync = syncDetailsByGroup[group.id]
                  const isThisProcessing = processingGroupId === group.id
                  const isThisSyncing = syncingGroupId === group.id

                  const primaryVa = groupSync?.vaNumbers?.[0]
                  const vaDisplay =
                    primaryVa?.va_number || groupSync?.permataVaNumber || groupSync?.paymentCode || null
                  const vaBank = primaryVa?.bank || (groupSync?.permataVaNumber ? 'permata' : undefined)
                  const simInfo = getMidtransSimulatorInfo(groupSync?.paymentType, vaBank)

                  return (
                    <Card
                      key={group.id}
                      surface="paper"
                      className={`p-4 rounded-[22px] space-y-3 border transition-all ${
                        isPaid
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-[#e5e5e5] bg-white'
                      }`}
                    >
                      {/* Payer Header */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#f0f0f0]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-xs">
                            {group.participantName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#0a0a0a] block">
                              {group.participantName}
                            </span>
                            <span className="text-[11px] text-[#737373]">
                              {(group.items || []).length} Menu sajian
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge
                            variant={isPaid ? 'solid' : 'soft'}
                            className={isPaid ? 'bg-emerald-600 text-white' : 'text-amber-800 bg-amber-100'}
                          >
                            {isPaid ? 'LUNAS' : 'BELUM BAYAR'}
                          </Badge>
                          <p className="font-mono text-sm font-black text-[#0a0a0a] mt-0.5">
                            {formatRupiah(group.amountDue)}
                          </p>
                        </div>
                      </div>

                      {/* Items list for this payer */}
                      <div className="space-y-1.5 text-xs">
                        {(group.items || []).map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[#737373]">
                            <span>
                              {it.quantity}x {it.menuName}
                              {it.notes ? ` ("${it.notes}")` : ''}
                            </span>
                            <span className="font-mono text-[#0a0a0a]">
                              {formatRupiah(it.allocatedAmount)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Breakdown: Subtotal, Service Fee (3%), PB1 Tax (10%), Total */}
                      {(() => {
                        const sub = group.subtotal ?? (group.items || []).reduce((acc: number, it: any) => acc + (it.allocatedAmount || 0), 0)
                        const svc = group.serviceFee ?? Math.round(sub * 0.03)
                        const tax = group.taxAmount ?? Math.round(sub * 0.10)
                        const due = group.amountDue ?? (sub + svc + tax)
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

                      {/* Action buttons if unpaid */}
                      {!isPaid && (
                        <div className="pt-2 border-t border-[#f0f0f0] space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => handlePayViaMidtrans(group.id)}
                              disabled={isThisProcessing || isThisSyncing}
                              className="h-8 text-xs font-bold rounded-[12px] flex items-center justify-center gap-1.5"
                            >
                              {isThisProcessing ? (
                                <>
                                  <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                                  <span>Membuka Midtrans...</span>
                                </>
                              ) : (
                                <>
                                  <Icons.CreditCard className="w-3.5 h-3.5" />
                                  <span>Bayar via UI Midtrans</span>
                                </>
                              )}
                            </Button>

                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePayCash(group.id)}
                              disabled={isThisProcessing || isThisSyncing}
                              className="h-8 text-xs font-bold rounded-[12px] flex items-center justify-center gap-1.5"
                            >
                              <Icons.Check className="w-3.5 h-3.5" />
                              <span>Bayar Kasir (Cash)</span>
                            </Button>
                          </div>

                          {/* VA / Simulator Box if Snap was opened */}
                          {groupSnap && (
                            <div className="p-3 rounded-[16px] bg-[#fafafa] border border-[#e5e5e5] space-y-2 text-xs">
                              {vaDisplay && (
                                <div className="flex justify-between items-center bg-white p-2 rounded-[12px] border border-[#f0f0f0]">
                                  <div>
                                    <span className="text-[10px] text-[#737373] block">{simInfo.label}:</span>
                                    <span className="font-mono font-bold text-sm text-[#0a0a0a]">{vaDisplay}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleCopyText('Nomor VA', vaDisplay)}
                                    className="h-7 text-[11px] px-2.5 rounded-[10px]"
                                  >
                                    Salin
                                  </Button>
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <a
                                  href={simInfo.simulatorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-[#0a0a0a] hover:underline flex items-center gap-1"
                                >
                                  <span>Buka Simulator Web</span>
                                  <Icons.ArrowRight className="w-3 h-3" />
                                </a>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSyncMidtransStatus(groupSnap.paymentReference, group.id)}
                                  disabled={isThisSyncing}
                                  className="h-7 text-[11px] px-2.5 rounded-[10px]"
                                >
                                  {isThisSyncing ? 'Mengecek...' : 'Cek Status'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ===================== VIEW C: DIRECT SINGLE BILL ===================== */
            <div className="space-y-4">
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
                  Pilih Pembayaran 1 Tagihan Meja
                </label>

                {/* Option 1: Midtrans Snap */}
                <div
                  className="p-3.5 rounded-[18px] border-2 border-[#0a0a0a] bg-[#fafafa] shadow-xs flex items-start gap-3 cursor-pointer"
                  onClick={() => handlePayViaMidtrans()}
                >
                  <div className="w-4 h-4 rounded-full border-2 border-[#0a0a0a] mt-0.5 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0a0a0a]">
                        Pembayaran Digital (UI Midtrans Snap Sandbox)
                      </span>
                      <Badge variant="solid" className="text-[9px] py-0 px-1.5">
                        Midtrans
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#737373] leading-relaxed">
                      Pilih metode pembayaran langsung di popup resmi Midtrans (QRIS, GoPay, ShopeePay, Virtual Account BCA/BNI/BRI/Mandiri/Permata, atau Kartu Kredit).
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Bill Midtrans Simulator Box */}
              {snapByGroup['default'] && (
                <Card surface="paper" className="p-4 bg-[#fafafa] border border-[#e5e5e5] rounded-[20px] space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-[#0a0a0a]">
                      <Icons.QrCode className="w-4 h-4 text-[#0a0a0a]" />
                      <span>Status Transaksi Midtrans Sandbox</span>
                    </div>
                    <Badge variant="soft" className="font-mono text-[10px] bg-amber-100 text-amber-800">
                      MENUNGGU PEMBAYARAN
                    </Badge>
                  </div>

                  {syncDetailsByGroup['default']?.vaNumbers?.[0] && (
                    <div className="flex justify-between items-center bg-white p-3 rounded-[14px] border border-[#e5e5e5]">
                      <div>
                        <span className="text-[10px] text-[#737373] block">Nomor Virtual Account:</span>
                        <span className="font-mono text-sm font-bold text-[#0a0a0a]">
                          {syncDetailsByGroup['default'].vaNumbers[0].va_number}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyText('Nomor VA', syncDetailsByGroup['default'].vaNumbers[0].va_number)}
                        className="h-7 text-xs px-2.5 rounded-[10px]"
                      >
                        Salin
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <a
                      href="https://simulator.sandbox.midtrans.com/bca/va/index"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[14px] bg-white border border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#f5f5f5] font-bold text-xs"
                    >
                      <span>Buka Simulator Midtrans</span>
                      <Icons.ArrowRight className="w-3.5 h-3.5" />
                    </a>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSyncMidtransStatus(snapByGroup['default'].paymentReference, undefined)}
                      disabled={Boolean(syncingGroupId)}
                      className="h-9 text-xs font-bold rounded-[14px]"
                    >
                      {syncingGroupId ? 'Mengecek...' : 'Cek Status Pembayaran'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {!allPaid && !isEditingSplit && activeMode === 'DIRECT' && (
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={Boolean(processingGroupId || syncingGroupId)}
            className="w-full sm:w-auto"
          >
            Nanti Saja
          </Button>

          <Button
            variant="secondary"
            onClick={() => handlePayCash()}
            disabled={Boolean(processingGroupId || syncingGroupId)}
            className="w-full sm:w-auto font-bold"
          >
            Bayar Tunai di Kasir
          </Button>

          <Button
            variant="primary"
            onClick={() => handlePayViaMidtrans()}
            disabled={Boolean(processingGroupId || syncingGroupId)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 font-bold"
          >
            {processingGroupId ? (
              <>
                <Icons.Refresh className="w-4 h-4 animate-spin" />
                <span>Membuka UI Midtrans...</span>
              </>
            ) : (
              <>
                <Icons.CreditCard className="w-4 h-4" />
                <span>Bayar via UI Midtrans</span>
              </>
            )}
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  )
}
