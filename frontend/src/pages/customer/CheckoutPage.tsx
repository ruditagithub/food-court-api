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
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Load active table and cart
  useEffect(() => {
    try {
      const storedTable = localStorage.getItem('active_table')
      if (storedTable) {
        setActiveTable(JSON.parse(storedTable))
      }
    } catch {
      // ignore
    }

    if (qrToken) {
      try {
        const storedCart = localStorage.getItem(`cart_${qrToken}`)
        if (storedCart) {
          setCartItems(JSON.parse(storedCart))
        }
      } catch {
        // ignore
      }
    }
  }, [qrToken])

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Group by tenant
  const groupedByTenant = cartItems.reduce((acc, item) => {
    const key = item.tenantName || 'Tenant Kios'
    if (!acc[key]) {
      acc[key] = {
        stallNumber: item.stallNumber,
        items: [],
      }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { stallNumber?: string; items: CartItem[] }>)

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      setNameError('Nama pemesan wajib diisi agar pesanan dapat dipanggil')
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
        notes: notes.trim() || undefined,
        items: cartItems.map((ci) => ({
          menuId: ci.menuId,
          quantity: ci.quantity,
          notes: ci.notes || undefined,
          specialInstructions: ci.notes || undefined,
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

      // Navigate to live tracking page
      navigate(`/track/${orderData.orderNumber}?fromCheckout=true`, { replace: true })
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
        <Card surface="paper" className="max-w-md w-full text-center p-8 space-y-4">
          <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center mx-auto">
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
            className="w-full"
          >
            Pilih Menu Sekarang
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-[#737373] hover:text-[#0a0a0a] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            ← Kembali ke Menu
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737373]">Meja Anda:</span>
            <Badge variant="solid" className="text-xs font-mono">
              {activeTable?.tableNumber ? `Meja ${activeTable.tableNumber}` : 'Bawa Pulang'}
            </Badge>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a]">
            Konfirmasi Pesanan
          </h1>
          <p className="text-sm text-[#737373] mt-0.5">
            Periksa rincian sajian kuliner sebelum pesanan diteruskan ke dapur stan
          </p>
        </div>

        <form onSubmit={handleSubmitOrder} className="space-y-6">
          {/* Customer Details Card */}
          <Card surface="paper" className="space-y-4">
            <h3 className="text-sm font-bold text-[#0a0a0a] pb-2 border-b border-[#e5e5e5]">
              Identitas Pemesan
            </h3>

            <div>
              <Label htmlFor="checkout-name" required>
                Nama Pemanggil / Pemesan
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
              />
            </div>

            <div>
              <Label htmlFor="checkout-notes">Catatan Keseluruhan Pesanan</Label>
              <textarea
                id="checkout-notes"
                rows={2}
                className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all disabled:opacity-50"
                placeholder="Misal: Pesanan makan siang rombongan, tolong sendok ekstra..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </Card>

          {/* Stalls Breakdown Card */}
          <Card surface="paper" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
              <h3 className="text-sm font-bold text-[#0a0a0a]">
                Rincian Sajian ({totalCount} Porsi)
              </h3>
              <span className="text-xs text-[#737373]">
                {Object.keys(groupedByTenant).length} Stan Berbeda
              </span>
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
                    className="p-3.5 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5]">
                      <div className="flex items-center gap-1.5 font-bold text-[#0a0a0a]">
                        <Icons.Store className="w-3.5 h-3.5 text-[#737373]" />
                        <span>{tenantName}</span>
                      </div>
                      {group.stallNumber && (
                        <span className="font-mono text-[#737373] text-[10px]">
                          {group.stallNumber}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {group.items.map((it, idx) => (
                        <div
                          key={`${it.menuId}-${idx}`}
                          className="flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0a0a0a]">
                              {it.quantity}x {it.name}
                            </p>
                            {it.notes && (
                              <p className="text-[11px] text-[#737373] italic">
                                "{it.notes}"
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-[#0a0a0a] shrink-0 font-medium">
                            {formatRupiah(it.price * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#e5e5e5] flex justify-between text-[11px] text-[#737373]">
                      <span>Subtotal Stan</span>
                      <span className="font-mono font-bold text-[#0a0a0a]">
                        {formatRupiah(subtotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total Calculation */}
            <div className="pt-3 border-t border-[#e5e5e5] flex items-center justify-between">
              <span className="text-base font-bold text-[#0a0a0a]">Total Tagihan</span>
              <span className="text-xl font-mono font-black text-[#0a0a0a]">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </Card>

          {/* Checkout CTA */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full text-base font-bold py-3 h-12 shadow-md gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Icons.Refresh className="w-4 h-4 animate-spin" />
                Meneruskan ke Dapur...
              </span>
            ) : (
              <>
                <span>Kirim Pesanan ke Dapur</span>
                <Icons.ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
