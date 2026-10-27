import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { apiFetch } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { ItemDetailModal } from '../../components/customer/ItemDetailModal'
import { KioskPaymentModal } from '../../components/kiosk/KioskPaymentModal'
import { KioskOrderSuccessModal } from '../../components/kiosk/KioskOrderSuccessModal'
import { formatRupiah } from '../../lib/utils'
import type { Menu, CartItem } from '../../types'

export function KioskTerminalPage() {
  const { deviceCode } = useParams<{ deviceCode: string }>()
  const { error: toastError, success: toastSuccess } = useToast()

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [kioskData, setKioskData] = useState<any>(null)
  const [isAttractMode, setIsAttractMode] = useState(true)

  // Standby QR Code Data URL
  const [standbyQrUrl, setStandbyQrUrl] = useState<string>('')

  // Catalog Filters
  const [selectedStallId, setSelectedStallId] = useState<string>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Cart & Customer Name
  const [customerName, setCustomerName] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Item Detail Modal
  const [selectedMenuItem, setSelectedMenuItem] = useState<any | null>(null)
  const [itemDetailOpen, setItemDetailOpen] = useState(false)

  // Inactivity Guard
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleCountdown, setIdleCountdown] = useState(15)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Payment & Success States
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)

  // Fetch Kiosk Resolution Data
  const fetchKioskDetails = useCallback(async () => {
    if (!deviceCode) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await apiFetch<{ data: any }>(`/api/kiosks/resolve/${deviceCode}`)
      setKioskData(res.data)

      // Generate standby QR
      const mobileUrl = `${window.location.origin}/kiosk/${deviceCode}`
      const qrUrl = await QRCode.toDataURL(mobileUrl, {
        width: 320,
        margin: 1,
        color: { dark: '#0a0a0a', light: '#ffffff' },
      })
      setStandbyQrUrl(qrUrl)
    } catch (err: any) {
      setLoadError(err?.message || 'Terminal Kiosk tidak ditemukan atau belum aktif.')
    } finally {
      setIsLoading(false)
    }
  }, [deviceCode])

  useEffect(() => {
    fetchKioskDetails()
  }, [fetchKioskDetails])

  // Inactivity timer logic
  const resetInactivityTimer = useCallback(() => {
    if (showIdleWarning) {
      setShowIdleWarning(false)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    // Only run idle timer when user is actively interacting (not in attract mode and not in payment)
    if (!isAttractMode && !isPaymentModalOpen && !isSuccessModalOpen) {
      idleTimerRef.current = setTimeout(() => {
        // Trigger 15s warning
        setShowIdleWarning(true)
        setIdleCountdown(15)

        countdownIntervalRef.current = setInterval(() => {
          setIdleCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
              // Auto-reset back to attract mode
              setShowIdleWarning(false)
              setItemDetailOpen(false)
              setSelectedMenuItem(null)
              setCart([])
              setCustomerName('')
              setIsCartOpen(false)
              setIsAttractMode(true)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, 60000) // 60s idle threshold
    }
  }, [isAttractMode, isPaymentModalOpen, isSuccessModalOpen, showIdleWarning])

  // Global user activity listener
  useEffect(() => {
    const handleUserActivity = () => {
      resetInactivityTimer()
    }

    window.addEventListener('click', handleUserActivity)
    window.addEventListener('touchstart', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)

    return () => {
      window.removeEventListener('click', handleUserActivity)
      window.removeEventListener('touchstart', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [resetInactivityTimer])

  // Calculate totals
  const subtotal = useMemo(
    () => cart.reduce((acc, it) => acc + it.price * it.quantity, 0),
    [cart]
  )
  const taxAmount = Math.round(subtotal * 0.1) // PB1 10%
  const serviceFee = Math.round(subtotal * 0.03) // 3%
  const grandTotal = subtotal + taxAmount + serviceFee

  // Cart Operations
  const handleAddToCart = (
    item: Menu & { tenantName?: string; stallNumber?: string; tenantIsOpen?: boolean },
    quantity: number,
    notes?: string,
    selectedOptions?: Array<{ id: string; name: string; priceAdjustment: number }>
  ) => {
    resetInactivityTimer()
    const optionsCost = (selectedOptions || []).reduce((sum, opt) => sum + opt.priceAdjustment, 0)
    const effectiveUnitPrice = item.price + optionsCost

    setCart((prev) => {
      // Find matching item by menuId, options, and notes
      const existingIdx = prev.findIndex(
        (c) =>
          c.menuId === item.id &&
          c.notes === notes &&
          JSON.stringify(c.selectedOptions || []) === JSON.stringify(selectedOptions || [])
      )

      if (existingIdx >= 0) {
        const copy = [...prev]
        copy[existingIdx].quantity += quantity
        return copy
      }

      return [
        ...prev,
        {
          menuId: item.id,
          name: item.name,
          price: effectiveUnitPrice,
          quantity,
          stock: item.stock,
          notes,
          tenantId: item.tenantId,
          tenantName: item.tenantName || 'Stan Kuliner',
          stallNumber: item.stallNumber,
          imageUrl: item.imageUrl,
          selectedOptions,
          optionIds: selectedOptions?.map((o) => o.id),
        },
      ]
    })

    toastSuccess('Ditambahkan', `${quantity}x ${item.name} masuk ke pesanan bawa pulang.`)
  }

  const handleUpdateCartQty = (idx: number, delta: number) => {
    resetInactivityTimer()
    setCart((prev) => {
      const copy = [...prev]
      const nextQty = copy[idx].quantity + delta
      if (nextQty <= 0) {
        copy.splice(idx, 1)
      } else {
        copy[idx].quantity = nextQty
      }
      return copy
    })
  }

  // Handle Checkout & Order Placement
  const handleStartCheckout = async () => {
    resetInactivityTimer()
    if (!customerName.trim()) {
      toastError('Nama Diperlukan', 'Mohon isi Nama Pemesan agar dapat dipanggil saat makanan siap.')
      return
    }
    if (cart.length === 0) {
      toastError('Pesanan Kosong', 'Pilih minimal 1 menu untuk memesan.')
      return
    }

    setIsPlacingOrder(true)
    try {
      const orderPayload = {
        orderType: 'TAKEAWAY',
        kioskId: kioskData?.kiosk?.id,
        customerName: customerName.trim(),
        notes: `[KIOSK ${kioskData?.kiosk?.deviceCode || deviceCode}] Takeaway`,
        items: cart.map((item) => ({
          menuId: item.menuId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          optionIds: item.optionIds && item.optionIds.length > 0 ? item.optionIds : undefined,
        })),
      }

      const res = await apiFetch<{ data: any }>('/api/orders', {
        method: 'POST',
        body: orderPayload,
      })

      setActiveOrder(res.data)
      setIsCartOpen(false)
      setIsPaymentModalOpen(true)
    } catch (err: any) {
      toastError('Gagal Membuat Pesanan', err?.message || 'Terjadi kesalahan saat memproses pesanan.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false)
    setIsSuccessModalOpen(true)
  }

  const handleReturnToAttract = () => {
    setIsSuccessModalOpen(false)
    setIsPaymentModalOpen(false)
    setItemDetailOpen(false)
    setSelectedMenuItem(null)
    setActiveOrder(null)
    setCart([])
    setCustomerName('')
    setIsCartOpen(false)
    setIsAttractMode(true)
    fetchKioskDetails()
  }

  // Filtered Menus
  const filteredMenus = useMemo(() => {
    if (!kioskData?.menus) return []
    return kioskData.menus.filter((m: any) => {
      const matchStall = selectedStallId === 'all' || m.tenantId === selectedStallId
      const matchCat = selectedCategoryId === 'all' || m.categoryId === selectedCategoryId
      const matchSearch =
        !searchQuery.trim() ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchStall && matchCat && matchSearch
    })
  }, [kioskData?.menus, selectedStallId, selectedCategoryId, searchQuery])

  // Initial loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <Icons.Refresh className="w-12 h-12 text-[#9ef01a] animate-spin" />
        <h2 className="text-xl font-bold font-mono tracking-wider">
          MEMULAI TERMINAL KIOSK...
        </h2>
        <p className="text-xs text-neutral-400 font-mono">Device Code: {deviceCode}</p>
      </div>
    )
  }

  // Error screen if deviceCode invalid or inactive
  if (loadError || !kioskData || kioskData?.kiosk?.status === 'INACTIVE') {
    const isInactive = kioskData?.kiosk?.status === 'INACTIVE'
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center space-y-5">
        <div
          className={`w-20 h-20 rounded-3xl ${
            isInactive
              ? 'bg-amber-950/60 border border-amber-500/30 text-amber-400'
              : 'bg-red-950/60 border border-red-500/30 text-red-400'
          } flex items-center justify-center`}
        >
          <Icons.AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black">
            {isInactive ? 'Terminal Kiosk Nonaktif' : 'Terminal Tidak Ditemukan'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            {isInactive
              ? 'Perangkat Kiosk ini sedang dinonaktifkan sementara oleh pengelola food court.'
              : loadError || 'Perangkat Kiosk ini belum terdaftar atau sedang dalam mode pemeliharaan.'}
          </p>
          <p className="text-xs font-mono text-neutral-500">Device ID: {deviceCode}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={fetchKioskDetails}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Coba Muat Ulang Terminal
        </Button>
      </div>
    )
  }

  const { kiosk, foodCourt, tenants, categories } = kioskData

  // 1. SCREENSAVER / ATTRACT SCREEN (Standby Mode)
  if (isAttractMode) {
    return (
      <div
        onClick={() => {
          setIsAttractMode(false)
          resetInactivityTimer()
        }}
        className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-between p-6 sm:p-12 cursor-pointer select-none relative overflow-hidden"
      >
        {/* Background glow effects */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#9ef01a]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#9ef01a] text-[#0a0a0a] flex items-center justify-center font-black text-xl shadow-lg">
              FC
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">{foodCourt?.name || 'Sentra Food Court'}</h2>
              <p className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                {kiosk.kioskName} • {kiosk.location || 'Lantai 1'}
              </p>
            </div>
          </div>

          <Badge variant="soft" className="bg-white/10 text-[#9ef01a] border-white/10 px-4 py-1.5 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#9ef01a] animate-pulse mr-2 inline-block" />
            TERSEDIA UNTUK DIPESAN
          </Badge>
        </div>

        {/* Center Hero: Touch to Order & Standby QR */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 my-auto z-10 py-8">
          {/* Main Touch CTA Banner */}
          <div className="text-center lg:text-left space-y-6 max-w-xl">
            <Badge className="bg-[#9ef01a] text-[#0a0a0a] text-xs font-black uppercase tracking-widest px-4 py-1.5">
              SELF-SERVICE TAKEAWAY
            </Badge>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-white">
              Pesan Makanan & <br />
              <span className="text-[#9ef01a]">Bawa Pulang Mandiri</span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
              Jelajahi seluruh stan kuliner di {foodCourt?.name}, pilih menu favorit Anda, dan bayar praktis via QRIS atau kasir.
            </p>

            {/* Glowing Big Touch Button */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-3 px-8 py-5 rounded-[28px] bg-gradient-to-r from-[#9ef01a] to-emerald-400 text-[#0a0a0a] font-black text-base sm:text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all animate-pulse">
                <Icons.Store className="w-6 h-6" />
                <span>SENTUH LAYAR UNTUK MULAI</span>
              </div>
            </div>
          </div>

          {/* Standby QR Card for Mobile Orders */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-80 sm:w-88 p-6 rounded-[32px] bg-white text-[#0a0a0a] shadow-2xl border-4 border-[#0a0a0a] text-center space-y-4"
          >
            <div>
              <span className="px-3 py-1 rounded-full bg-[#0a0a0a] text-[#9ef01a] text-[10px] font-extrabold uppercase tracking-widest inline-block">
                ANTREAN RAMAI? SCAN DARI HP
              </span>
              <h3 className="text-xl font-black tracking-tight mt-2">
                Pesan Lewat Smartphone
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Arahkan kamera ponsel Anda untuk memesan langsung tanpa mengantre di layar ini.
              </p>
            </div>

            <div className="w-52 h-52 mx-auto bg-neutral-50 rounded-2xl p-3 border border-neutral-200 flex items-center justify-center">
              {standbyQrUrl ? (
                <img src={standbyQrUrl} alt="QR Standby" className="w-44 h-44 object-contain" />
              ) : (
                <Icons.Refresh className="w-8 h-8 animate-spin" />
              )}
            </div>

            <p className="text-[10px] font-mono text-neutral-400">
              ID Kiosk: {kiosk.deviceCode}
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-white/10 pt-4 z-10 font-mono">
          <span>{foodCourt?.name} Self-Service Terminal</span>
          <span>Sentuh layar untuk membuka katalog</span>
        </div>
      </div>
    )
  }

  // 2. ORDERING MODE (TOUCHSCREEN CATALOG)
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#0a0a0a] flex flex-col select-none relative pb-28">
      {/* Top Touch Kiosk Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e5e5e5] px-6 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center font-black shadow-xs">
            FC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight">{foodCourt?.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#0a0a0a] text-[#9ef01a] text-[10px] font-extrabold uppercase">
                TAKEAWAY
              </span>
            </div>
            <p className="text-xs text-[#737373]">
              {kiosk.kioskName} • Pesan Bawa Pulang Mandiri
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative hidden md:block w-64">
            <input
              type="text"
              placeholder="Cari menu lezat..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                resetInactivityTimer()
              }}
              className="w-full h-11 pl-10 pr-4 rounded-[16px] bg-[#f5f5f5] text-xs focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
            />
            <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-3.5 pointer-events-none" />
          </div>

          {/* Reset / Return to Attract Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (cart.length > 0) {
                if (confirm('Batalkan pesanan dan kembali ke layar standby?')) {
                  handleReturnToAttract()
                }
              } else {
                handleReturnToAttract()
              }
            }}
            className="rounded-[16px] h-11 text-xs font-bold gap-1.5 border-[#e5e5e5]"
          >
            <Icons.Close className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Button>
        </div>
      </header>

      {/* Main Touch Catalog Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Filter Bar 1: Tenant Stalls */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#737373] font-bold block px-1">
            Pilih Stan Gerai:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setSelectedStallId('all')
                resetInactivityTimer()
              }}
              className={`px-5 py-2.5 rounded-[18px] text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedStallId === 'all'
                  ? 'bg-[#0a0a0a] text-white shadow-xs'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              Semua Stan Kuliner
            </button>

            {tenants?.map((t: any) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedStallId(t.id)
                  resetInactivityTimer()
                }}
                className={`px-5 py-2.5 rounded-[18px] text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  selectedStallId === t.id
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                <span>{t.name}</span>
                <span className="text-[10px] font-mono text-neutral-400">({t.stallNumber})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar 2: Categories */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#737373] font-bold block px-1">
            Kategori Hidangan:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId('all')
                resetInactivityTimer()
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-[#9ef01a] text-[#0a0a0a] shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-black border border-neutral-200'
              }`}
            >
              Semua Kategori
            </button>

            {categories?.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(c.id)
                  resetInactivityTimer()
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategoryId === c.id
                    ? 'bg-[#9ef01a] text-[#0a0a0a] shadow-xs'
                    : 'bg-white text-neutral-600 hover:text-black border border-neutral-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Food Items Touch Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenus.map((item: any) => {
            const inCartQty = cart
              .filter((c) => c.menuId === item.id)
              .reduce((sum, c) => sum + c.quantity, 0)

            const isAvailable = item.isAvailable && item.status !== 'OUT_OF_STOCK'

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isAvailable) {
                    setSelectedMenuItem({
                      ...item,
                      tenantName: item.tenant?.name,
                      stallNumber: item.tenant?.stallNumber,
                      tenantIsOpen: true,
                    })
                    setItemDetailOpen(true)
                    resetInactivityTimer()
                  }
                }}
                className={`group rounded-[26px] bg-white border border-[#e5e5e5] p-3 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-black transition-all cursor-pointer relative ${
                  !isAvailable ? 'opacity-60 grayscale cursor-not-allowed' : ''
                }`}
              >
                {/* Image & Badge */}
                <div className="w-full h-36 sm:h-44 rounded-[20px] bg-neutral-100 overflow-hidden relative mb-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <Icons.Utensils className="w-10 h-10" />
                    </div>
                  )}

                  {/* Stall tag badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-1 rounded-full bg-[#0a0a0a]/80 backdrop-blur-xs text-white text-[10px] font-bold">
                      {item.tenant?.name || 'Stan Kuliner'}
                    </span>
                  </div>

                  {inCartQty > 0 && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="w-7 h-7 rounded-full bg-[#9ef01a] text-[#0a0a0a] font-black text-xs flex items-center justify-center shadow-md">
                        {inCartQty}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1 mb-3">
                  <h3 className="font-bold text-sm sm:text-base text-[#0a0a0a] line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-[#737373] line-clamp-2 leading-snug">
                    {item.description || 'Hidangan lezat siap santap takeaway.'}
                  </p>
                </div>

                {/* Price & Add Button */}
                <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0]">
                  <div>
                    <span className="font-mono font-black text-sm sm:text-base text-[#0a0a0a] block">
                      {formatRupiah(item.price)}
                    </span>
                    {item.options && item.options.length > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600 block">
                        Ada varian opsi
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!isAvailable}
                    className="w-10 h-10 rounded-[14px] bg-[#0a0a0a] group-hover:bg-[#9ef01a] text-white group-hover:text-[#0a0a0a] flex items-center justify-center font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Icons.Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-8 max-w-4xl mx-auto z-40 bg-[#0a0a0a] text-white p-4 sm:p-5 rounded-[30px] shadow-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#9ef01a] text-[#0a0a0a] flex items-center justify-center font-black text-lg shrink-0 shadow-md">
              {cart.reduce((sum, it) => sum + it.quantity, 0)}
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
                Total Belanja Takeaway ({cart.length} Jenis Menu)
              </span>
              <span className="font-mono font-black text-2xl text-white">
                {formatRupiah(grandTotal)}
              </span>
              <span className="text-[10px] text-neutral-400 ml-2 font-mono">
                (Termasuk PB1 10% & Layanan)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCartOpen(true)
                resetInactivityTimer()
              }}
              className="flex-1 sm:flex-none h-12 px-5 rounded-[20px] text-xs font-bold border-white/20 text-white hover:bg-white/10"
            >
              Lihat Rincian
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsCartOpen(true)
                resetInactivityTimer()
              }}
              className="flex-1 sm:flex-none h-12 px-6 rounded-[20px] text-xs font-black gap-2 bg-[#9ef01a] text-[#0a0a0a] hover:bg-[#8ee015] shadow-lg cursor-pointer"
            >
              <span>Lanjut Bayar</span>
              <Icons.ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Slide-in Cart / Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-lg bg-white h-full flex flex-col justify-between p-6 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center font-bold">
                    <Icons.ShoppingBag className="w-5 h-5 text-[#9ef01a]" />
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-[#0a0a0a]">Pesanan Takeaway Anda</h2>
                    <p className="text-xs text-[#737373]">{foodCourt?.name}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black cursor-pointer"
                >
                  <Icons.Close className="w-5 h-5" />
                </button>
              </div>

              {/* Customer Name Input (Required) */}
              <div className="my-5 p-4 rounded-[22px] bg-neutral-50 border-2 border-neutral-200 space-y-2">
                <label htmlFor="customerName" className="text-xs font-bold text-neutral-800 block">
                  Nama Pemesan (Untuk Panggilan Dapur) <span className="text-red-500">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  placeholder="Ketik nama Anda (misal: Budi / Maya)..."
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value)
                    resetInactivityTimer()
                  }}
                  className="w-full h-12 px-4 rounded-[16px] bg-white border border-neutral-300 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
                />
                <p className="text-[11px] text-neutral-500">
                  Nama ini akan dipanggil oleh pelayan stan saat makanan Anda selesai dibungkus.
                </p>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#737373] font-bold block">
                Daftar Menu ({cart.length} Item):
              </span>

              {cart.map((item, idx) => (
                <div
                  key={`${item.menuId}-${idx}`}
                  className="p-3.5 rounded-[20px] bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-bold text-sm text-[#0a0a0a] block truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 block">
                      {item.tenantName} ({item.stallNumber})
                    </span>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <span className="text-[10px] text-emerald-700 block">
                        + {item.selectedOptions.map((o) => o.name).join(', ')}
                      </span>
                    )}
                    {item.notes && (
                      <span className="text-[10px] text-neutral-500 italic block">
                        Catatan: "{item.notes}"
                      </span>
                    )}
                    <span className="font-mono font-bold text-xs text-[#0a0a0a] block pt-1">
                      {formatRupiah(item.price * item.quantity)}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-full border border-neutral-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateCartQty(idx, -1)}
                      className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-xs w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateCartQty(idx, 1)}
                      className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary & Proceed */}
            <div className="pt-4 border-t border-[#e5e5e5] space-y-3">
              <div className="space-y-1.5 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal Pesanan:</span>
                  <span className="font-mono font-semibold text-black">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pajak Restoran PB1 (10%):</span>
                  <span className="font-mono">{formatRupiah(taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Biaya Layanan Kiosk (3%):</span>
                  <span className="font-mono">{formatRupiah(serviceFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-black pt-2 border-t border-neutral-200">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-xl text-emerald-700">{formatRupiah(grandTotal)}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleStartCheckout}
                disabled={isPlacingOrder || !customerName.trim()}
                className="w-full h-14 rounded-[22px] text-sm font-black gap-2 bg-[#0a0a0a] hover:bg-[#262626] cursor-pointer"
              >
                {isPlacingOrder ? (
                  <Icons.Refresh className="w-5 h-5 animate-spin text-[#9ef01a]" />
                ) : (
                  <Icons.CreditCard className="w-5 h-5 text-[#9ef01a]" />
                )}
                <span>
                  {isPlacingOrder ? 'Mempersiapkan Pembayaran...' : `Bayar ${formatRupiah(grandTotal)}`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Item Options & Detail Picker */}
      <ItemDetailModal
        item={selectedMenuItem}
        open={itemDetailOpen}
        onOpenChange={setItemDetailOpen}
        onAddToCart={handleAddToCart}
      />

      {/* Modal: Payment (QRIS / Cashier) */}
      {activeOrder && (
        <KioskPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          orderId={activeOrder.id}
          orderNumber={activeOrder.orderNumber}
          customerName={customerName}
          totalAmount={activeOrder.totalAmount || grandTotal}
          subtotal={activeOrder.subtotal || subtotal}
          taxAmount={activeOrder.taxAmount || taxAmount}
          serviceFee={activeOrder.serviceFee || serviceFee}
          kioskName={kiosk.kioskName}
          onPaidSuccess={handlePaymentSuccess}
        />
      )}

      {/* Modal: Order Success & Standby Return */}
      {activeOrder && (
        <KioskOrderSuccessModal
          isOpen={isSuccessModalOpen}
          orderNumber={activeOrder.orderNumber}
          customerName={customerName}
          totalAmount={activeOrder.totalAmount || grandTotal}
          items={cart.map((c) => ({
            name: c.name,
            quantity: c.quantity,
            price: c.price,
            notes: c.notes,
          }))}
          kioskName={kiosk.kioskName}
          foodCourtName={foodCourt?.name}
          onReturnHome={handleReturnToAttract}
        />
      )}

      {/* Inactivity Safety Guard Alert Modal (15s prompt) */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Icons.Clock className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="font-black text-xl text-[#0a0a0a]">Apakah Anda Masih di Sini?</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Layar tidak disentuh selama 60 detik. Pesanan akan diatur ulang dalam:
              </p>
              <div className="font-mono font-black text-4xl text-amber-600 my-3">
                {idleCountdown} detik
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={resetInactivityTimer}
              className="w-full h-12 rounded-[18px] text-xs font-black bg-[#0a0a0a] hover:bg-neutral-800"
            >
              Saya Masih Memesan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
