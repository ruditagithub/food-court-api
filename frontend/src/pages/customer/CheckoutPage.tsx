import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch, getToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { formatRupiah } from '../../lib/utils'
import { Ticket, Tag, X } from 'lucide-react'
import { VoucherPickerModal } from '../../components/customer/VoucherPickerModal'
import type { DiscountCalculationResult } from '../../types'
import type { CartItem } from './CustomerMenuPage'

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()

  const qrToken = searchParams.get('qrToken') || ''
  const [activeTable, setActiveTable] = useState<any>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState(user?.name || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Discount voucher state
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountCalculationResult | null>(null)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)

  // Load active table and cart
  useEffect(() => {
    let parsedTable: any = null
    try {
      const storedTable = localStorage.getItem('active_table')
      if (storedTable) {
        parsedTable = JSON.parse(storedTable)
        setActiveTable(parsedTable)
      }
    } catch {
      // ignore
    }

    if (qrToken) {
      if (!parsedTable || parsedTable.qrToken !== qrToken) {
        apiFetch<{ data: any }>(`/api/tables/scan/${qrToken}`)
          .then((res) => {
            if (res.data) {
              const tbl = {
                tableId: res.data.id,
                tableNumber: res.data.tableNumber,
                foodCourtId: res.data.foodCourtId,
                qrToken: res.data.qrToken,
              }
              setActiveTable(tbl)
              localStorage.setItem('active_table', JSON.stringify(tbl))
            }
          })
          .catch(() => {})
      }

      try {
        const storedCart = localStorage.getItem(`cart_${qrToken}`)
        if (storedCart) {
          const parsedCart: CartItem[] = JSON.parse(storedCart)
          setCartItems(parsedCart)

          // Reconcile live stock for items in cart
          const uniqueMenuIds = Array.from(new Set(parsedCart.map((c) => c.menuId)))
          Promise.all(
            uniqueMenuIds.map(async (mId) => {
              try {
                const mRes = await apiFetch<{ data: any }>(`/api/menus/${mId}`)
                return mRes.data
              } catch {
                return null
              }
            })
          ).then((liveMenus) => {
            const stockMap = new Map<string, number>()
            liveMenus.forEach((lm) => {
              if (lm && typeof lm.stock === 'number') {
                stockMap.set(lm.id, lm.stock)
              }
            })
            if (stockMap.size > 0) {
              setCartItems((prev) => {
                const next = prev.map((ci) =>
                  stockMap.has(ci.menuId) ? { ...ci, stock: stockMap.get(ci.menuId) } : ci
                )
                localStorage.setItem(`cart_${qrToken}`, JSON.stringify(next))
                return next
              })
            }
          })
        }
      } catch {
        // ignore
      }
    }
  }, [qrToken])

  // Sync cart changes to localStorage
  const updateCart = (newItems: CartItem[]) => {
    setCartItems(newItems)
    if (qrToken) {
      localStorage.setItem(`cart_${qrToken}`, JSON.stringify(newItems))
    }
  }

  // Total quantity of a menuId across cart
  const getTotalMenuQty = (menuId: string) => {
    return cartItems
      .filter((ci) => ci.menuId === menuId)
      .reduce((sum, ci) => sum + ci.quantity, 0)
  }

  // Adjust item quantity with stock cap by array index
  const handleQuantityChange = (originalIndex: number, delta: number) => {
    const targetItem = cartItems[originalIndex]
    if (!targetItem) return

    if (delta > 0) {
      if (typeof targetItem.stock === 'number') {
        const totalForMenu = getTotalMenuQty(targetItem.menuId)
        if (totalForMenu + delta > targetItem.stock) {
          toastError('Batas Stok Tercapai', `Stok tersisa untuk ${targetItem.name} hanya ${targetItem.stock} porsi.`)
          return
        }
      }
    }

    const newQty = targetItem.quantity + delta
    if (newQty <= 0) {
      updateCart(cartItems.filter((_, idx) => idx !== originalIndex))
    } else {
      const updated = [...cartItems]
      updated[originalIndex] = { ...targetItem, quantity: newQty }
      updateCart(updated)
    }
  }

  // Update note for a specific item in cart by array index
  const handleItemNoteChange = (originalIndex: number, newNote: string) => {
    if (originalIndex < 0 || originalIndex >= cartItems.length) return
    const updated = [...cartItems]
    updated[originalIndex] = { ...updated[originalIndex], notes: newNote }
    updateCart(updated)
  }

  // Split an item with quantity > 1 into individual 1-portion items so each portion can have a distinct note
  const handleSplitItemPortion = (originalIndex: number) => {
    const targetItem = cartItems[originalIndex]
    if (!targetItem || targetItem.quantity <= 1) return

    const expanded: CartItem[] = []
    cartItems.forEach((it, idx) => {
      if (idx === originalIndex) {
        for (let i = 0; i < it.quantity; i++) {
          expanded.push({
            ...it,
            quantity: 1,
            notes: it.notes || '',
          })
        }
      } else {
        expanded.push(it)
      }
    })
    updateCart(expanded)
    toastSuccess('Porsi Dipisah', `${targetItem.name} dipisah menjadi porsi individual untuk catatan berbeda.`)
  }

  // Remove item by array index
  const handleRemoveItem = (originalIndex: number) => {
    updateCart(cartItems.filter((_, idx) => idx !== originalIndex))
  }

  // Re-validate applied discount when cart items change
  useEffect(() => {
    if (!selectedDiscount || cartItems.length === 0) return
    const foodCourtId = activeTable?.foodCourtId
    if (!foodCourtId) return

    apiFetch<{ data: DiscountCalculationResult }>('/api/discounts/validate', {
      method: 'POST',
      body: {
        foodCourtId,
        discountId: selectedDiscount.discount.id,
        items: cartItems.map((ci) => ({
          menuId: ci.menuId,
          quantity: ci.quantity,
          optionIds: ci.selectedOptions?.map((o: any) => o.id) || ci.optionIds || undefined,
        })),
      },
    })
      .then((res) => {
        if (res.data) {
          setSelectedDiscount(res.data)
        }
      })
      .catch(() => {
        setSelectedDiscount(null)
        toastError('Voucher Dilepas', 'Syarat minimal belanja atau ketentuan voucher tidak lagi terpenuhi.')
      })
  }, [cartItems, activeTable?.foodCourtId])

  const subtotalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = selectedDiscount?.discountAmount || 0
  const totalAmount = Math.max(0, subtotalAmount - discountAmount)
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Group by tenant preserving originalIndex
  const groupedByTenant = cartItems.reduce((acc, item, originalIndex) => {
    const key = item.tenantName || 'Tenant Kios'
    if (!acc[key]) {
      acc[key] = {
        stallNumber: item.stallNumber,
        items: [],
      }
    }
    acc[key].items.push({ ...item, originalIndex })
    return acc
  }, {} as Record<string, { stallNumber?: string; items: (CartItem & { originalIndex: number })[] }>)

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      setNameError('Nama pemesan wajib diisi agar pesanan dapat dipanggil')
      return
    }
    if (customerName.trim().length < 2) {
      setNameError('Nama pemesan minimal 2 karakter')
      return
    }
    if (cartItems.length === 0) {
      toastError('Keranjang Kosong', 'Silakan pilih menu makanan terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    try {
      const token = getToken()
      const payload = {
        tableId: activeTable?.tableId || undefined,
        customerName: customerName.trim(),
        discountCode: selectedDiscount?.discount?.code || undefined,
        discountId: selectedDiscount?.discount?.id || undefined,
        items: cartItems.map((ci) => ({
          menuId: ci.menuId,
          quantity: ci.quantity,
          notes: ci.notes?.trim() || undefined,
          specialInstructions: ci.notes?.trim() || undefined,
          optionIds: ci.selectedOptions?.map((o) => o.id) || ci.optionIds || undefined,
        })),
      }

      const res = await apiFetch<{ data: any }>('/api/orders', {
        method: 'POST',
        token: token || undefined,
        body: payload,
      })

      const orderData = res.data
      toastSuccess('Pesanan Berhasil Dibuat', `Nomor Pesanan: ${orderData.orderNumber}`)

      // Clear local cart
      if (qrToken) {
        localStorage.removeItem(`cart_${qrToken}`)
      }

      // Navigate directly to tracking page so order is loaded first
      navigate(`/track/${orderData.orderNumber}`, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim pesanan'
      toastError('Gagal Checkout', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card surface="paper" className="max-w-md w-full text-center p-8 space-y-4 rounded-[24px]">
          <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center mx-auto border border-[#e5e5e5]">
            <Icons.ShoppingBag className="w-6 h-6 text-[#737373]" />
          </div>
          <h2 className="text-lg font-bold text-[#0a0a0a]">Keranjang Belanja Kosong</h2>
          <p className="text-xs text-[#737373]">
            Anda belum menambahkan sajian makanan atau minuman ke dalam keranjang.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              if (qrToken) navigate(`/s/${qrToken}`)
              else navigate('/')
            }}
            className="w-full rounded-[16px]"
          >
            Pilih Menu Sekarang
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 lg:px-8 xl:px-10 text-[#0a0a0a]">
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-6">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (qrToken ? navigate(`/s/${qrToken}`) : navigate(-1))}
            className="text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-3 rounded-[16px] bg-white border border-[#e5e5e5] shadow-xs"
          >
            <Icons.ArrowLeft className="w-3.5 h-3.5" />
            <span>Tambah Menu Lain</span>
          </button>
          <div className="flex items-center gap-2">
            {activeTable?.foodCourtName && (
              <span className="text-xs font-bold text-[#0a0a0a] hidden sm:inline">
                {activeTable.foodCourtName} •
              </span>
            )}
            <span className="text-xs text-[#737373]">Lokasi Meja:</span>
            <Badge variant="solid" className="text-xs font-mono">
              {activeTable?.tableNumber ? `Meja ${activeTable.tableNumber}` : 'Bawa Pulang'}
            </Badge>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0a0a0a]">
            Konfirmasi Pesanan
          </h1>
          <p className="text-xs sm:text-sm text-[#737373] mt-1">
            Beri catatan khusus pada masing-masing makanan sebelum pesanan diteruskan ke dapur stan
          </p>
        </div>

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Order Items Breakdown */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Stalls Breakdown Card */}
              <Card surface="paper" className="space-y-4 rounded-[24px]">
                <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
                  <h3 className="text-sm font-bold text-[#0a0a0a]">
                    Rincian Sajian ({totalCount} Porsi)
                  </h3>
                  <Badge variant="soft" className="text-xs font-semibold">
                    {Object.keys(groupedByTenant).length} Stan Berbeda
                  </Badge>
                </div>

                <div className="space-y-4">
                  {Object.entries(groupedByTenant).map(([tenantName, group]) => {
                    const subtotal = group.items.reduce(
                      (sum, it) => sum + it.price * it.quantity,
                      0
                    )
                    return (
                      <div
                        key={tenantName}
                        className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] space-y-3 text-xs"
                      >
                        {/* Tenant Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
                          <div className="flex items-center gap-1.5 font-bold text-[#0a0a0a]">
                            <Icons.Store className="w-4 h-4 text-[#737373]" />
                            <span className="text-sm">{tenantName}</span>
                          </div>
                          {group.stallNumber && (
                            <Badge variant="solid" className="font-mono text-[10px] bg-[#0a0a0a] text-white">
                              Kios {group.stallNumber}
                            </Badge>
                          )}
                        </div>

                        {/* Items in this tenant */}
                        <div className="space-y-3">
                          {group.items.map((it) => (
                            <div
                              key={`${it.menuId}-${it.originalIndex}`}
                              className="bg-white p-3.5 rounded-[18px] border border-[#f0f0f0] space-y-2.5 shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs sm:text-sm text-[#0a0a0a]">
                                    {it.name}
                                  </p>
                                  {it.selectedOptions && it.selectedOptions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 mb-0.5">
                                      {it.selectedOptions.map((opt, oIdx) => (
                                        <span
                                          key={opt.id || oIdx}
                                          className="text-[10px] font-medium bg-[#f5f5f5] text-[#0a0a0a] px-1.5 py-0.5 rounded-[8px] border border-[#e5e5e5]"
                                        >
                                          {opt.name}
                                          {opt.priceAdjustment > 0 && (
                                            <span className="text-[#737373] ml-1">
                                              (+{formatRupiah(opt.priceAdjustment)})
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <p className="font-mono text-xs font-semibold text-[#0a0a0a] mt-0.5">
                                    {formatRupiah(it.price)}{' '}
                                    <span className="text-[10px] text-[#737373] font-normal">/ porsi</span>
                                  </p>
                                </div>

                                {/* Stepper & Subtotal */}
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <div className="flex items-center gap-1.5 bg-[#f5f5f5] p-1 rounded-[14px] border border-[#e5e5e5]">
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange(it.originalIndex, -1)}
                                      className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#0a0a0a] hover:bg-[#e5e5e5] transition-colors cursor-pointer"
                                    >
                                      <Icons.Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono font-bold text-xs w-5 text-center">
                                      {it.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange(it.originalIndex, 1)}
                                      className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#0a0a0a] hover:bg-[#e5e5e5] transition-colors cursor-pointer"
                                    >
                                      <Icons.Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-[#0a0a0a]">
                                      {formatRupiah(it.price * it.quantity)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(it.originalIndex)}
                                      className="text-[#dc2626] hover:text-[#991b1b] p-1 cursor-pointer transition-colors"
                                      title="Hapus sajian"
                                    >
                                      <Icons.Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Per-Item Notes Input */}
                              <div className="pt-2 border-t border-[#f5f5f5] space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-[11px] font-semibold text-[#737373] flex items-center gap-1">
                                    <Icons.Edit className="w-3 h-3 text-[#737373]" />
                                    <span>Catatan Makanan Ini:</span>
                                  </label>
                                  {it.quantity > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleSplitItemPortion(it.originalIndex)}
                                      className="text-[10px] font-semibold text-[#0a0a0a] bg-[#f5f5f5] hover:bg-[#e5e5e5] px-2 py-0.5 rounded-[10px] border border-[#e5e5e5] transition-colors cursor-pointer"
                                    >
                                      Pisah {it.quantity} Porsi (Beda Catatan)
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={it.notes || ''}
                                  onChange={(e) => handleItemNoteChange(it.originalIndex, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.preventDefault()
                                  }}
                                  placeholder={`Misal: jangan pedas, kuah dipisah, ekstra sambal...`}
                                  disabled={isSubmitting}
                                  className="w-full h-8 rounded-[12px] bg-[#fafafa] text-[#0a0a0a] placeholder-[#a3a3a3] text-xs px-3 border border-[#e5e5e5] focus:border-[#0a0a0a] focus:bg-white outline-none transition-all"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Tenant Subtotal */}
                        <div className="pt-2 border-t border-[#e5e5e5] flex justify-between text-xs">
                          <span className="text-[#737373]">Subtotal Stan Ini:</span>
                          <span className="font-mono font-bold text-[#0a0a0a]">
                            {formatRupiah(subtotal)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            {/* Right Column: Customer Details, Bill Summary & Sticky CTA */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              {/* Customer Details Card */}
              <Card surface="paper" className="space-y-4 rounded-[24px]">
                <h3 className="text-sm font-bold text-[#0a0a0a] pb-2 border-b border-[#e5e5e5]">
                  Identitas Pemesan
                </h3>

                <div>
                  <Label htmlFor="checkout-name" required>
                    Nama Pemanggil / Pemesan Utama
                  </Label>
                  <Input
                    id="checkout-name"
                    placeholder="Contoh: Rizky Ramadhan"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value)
                      if (nameError) setNameError(null)
                    }}
                    error={!!nameError}
                    helperText={nameError || undefined}
                    disabled={isSubmitting}
                    className="rounded-[16px] h-11"
                  />
                  <p className="text-[11px] text-[#737373] mt-1.5">
                    Nama ini akan digunakan untuk identifikasi meja. Jika ingin membagi tagihan per orang (Split Bill), Anda dapat mengaturnya di langkah pembayaran setelah ini.
                  </p>
                </div>
              </Card>

              {/* Voucher & Promo Card */}
              <Card surface="paper" className="p-4 rounded-[24px] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[12px] bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0a0a0a]">Voucher & Diskon</h4>
                      <p className="text-[11px] text-[#737373]">
                        {selectedDiscount
                          ? 'Voucher aktif terpasang pada pesanan'
                          : 'Hemat lebih banyak dengan voucher'}
                      </p>
                    </div>
                  </div>

                  {!selectedDiscount && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="text-xs font-bold rounded-[12px] h-8 px-3 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      Pilih Promo
                    </Button>
                  )}
                </div>

                {selectedDiscount && (
                  <div className="p-3 rounded-[16px] bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="text-xs font-bold text-emerald-950 truncate">
                          {selectedDiscount.discount.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-mono font-bold">
                        Hemat {formatRupiah(selectedDiscount.discountAmount)}
                        {selectedDiscount.discount.code && ` (${selectedDiscount.discount.code})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsVoucherModalOpen(true)}
                        className="text-xs font-semibold text-emerald-700 hover:underline px-2 py-1 cursor-pointer"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDiscount(null)
                          toastSuccess('Voucher Dihapus', 'Potongan voucher telah dilepas dari pesanan.')
                        }}
                        className="text-[#737373] hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Hapus Voucher"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Bill Summary & Action Card */}
              <Card surface="paper" className="space-y-4 rounded-[24px]">
                <h3 className="text-sm font-bold text-[#0a0a0a] pb-2 border-b border-[#e5e5e5]">
                  Ringkasan Tagihan
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#737373]">
                    <span>Total Sajian:</span>
                    <span className="font-mono font-bold text-[#0a0a0a]">{totalCount} Porsi</span>
                  </div>
                  <div className="flex justify-between text-[#737373]">
                    <span>Stan Dipesan:</span>
                    <span className="font-mono font-bold text-[#0a0a0a]">{Object.keys(groupedByTenant).length} Stan</span>
                  </div>
                  <div className="flex justify-between text-[#737373]">
                    <span>Subtotal Menu:</span>
                    <span className="font-mono font-bold text-[#0a0a0a]">{formatRupiah(subtotalAmount)}</span>
                  </div>
                  {selectedDiscount && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Potongan Diskon:</span>
                      <span className="font-mono font-bold">-{formatRupiah(discountAmount)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-[#0a0a0a] block">
                        Total Tagihan Meja
                      </span>
                      <span className="text-[11px] text-[#737373]">
                        {selectedDiscount ? 'Setelah potongan voucher' : 'Termasuk seluruh pesanan stan'}
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-mono font-black text-[#0a0a0a]">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full text-base font-bold py-3.5 h-12 shadow-md gap-2 rounded-[18px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Icons.Refresh className="w-4 h-4 animate-spin" />
                      Meneruskan ke Dapur...
                    </span>
                  ) : (
                    <>
                      <span>Kirim Pesanan ke Dapur ({totalCount} Item)</span>
                      <Icons.ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </Card>
            </div>
          </div>
        </form>

        {/* Voucher Picker Modal */}
        <VoucherPickerModal
          isOpen={isVoucherModalOpen}
          onClose={() => setIsVoucherModalOpen(false)}
          foodCourtId={activeTable?.foodCourtId || ''}
          cartItems={cartItems}
          onApplyDiscount={(res) => {
            setSelectedDiscount(res)
            toastSuccess('Voucher Diterapkan', `Hemat ${formatRupiah(res.discountAmount)} pada pesanan ini!`)
          }}
          appliedDiscountId={selectedDiscount?.discount?.id}
        />
      </div>
    </div>
  )
}
