import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import { FoodCourtCustomerHeader } from '../../components/customer/FoodCourtCustomerHeader'
import { TenantDirectoryCard } from '../../components/customer/TenantDirectoryCard'
import { TenantStorefrontView } from '../../components/customer/TenantStorefrontView'
import { MenuItemCard } from '../../components/customer/MenuItemCard'
import { ItemDetailModal } from '../../components/customer/ItemDetailModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { formatRupiah } from '../../lib/utils'
import type { Menu, Table } from '../../types'

export interface CartItem {
  menuId: string
  name: string
  price: number
  quantity: number
  stock?: number
  notes?: string
  tenantId: string
  tenantName: string
  stallNumber?: string
  imageUrl?: string | null
}

export function CustomerMenuPage() {
  const { qrToken } = useParams<{ qrToken: string }>()
  const navigate = useNavigate()

  const [tableData, setTableData] = useState<Table | null>(null)
  const [stalls, setStalls] = useState<any[]>([])
  const [allMenus, setAllMenus] = useState<
    (Menu & { tenantName: string; stallNumber: string; categoryName?: string; tenantIsOpen?: boolean })[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Navigation state: which view is active
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'stalls' | 'explore'>('stalls')
  const [search, setSearch] = useState('')
  const [exploreCategory, setExploreCategory] = useState<string>('all')

  // Item detail modal
  const [selectedItem, setSelectedItem] = useState<
    (Menu & { tenantName?: string; stallNumber?: string; tenantIsOpen?: boolean }) | null
  >(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Local cart state scoped to qrToken
  const [cartQrToken, setCartQrToken] = useState<string | undefined>(qrToken)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${qrToken}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Reload cart & reset view state if qrToken URL param changes within SPA
  useEffect(() => {
    if (!qrToken || qrToken === cartQrToken) return
    setCartQrToken(qrToken)
    setSelectedTenant(null)
    setSearch('')
    setExploreCategory('all')
    try {
      const saved = localStorage.getItem(`cart_${qrToken}`)
      setCart(saved ? JSON.parse(saved) : [])
    } catch {
      setCart([])
    }
  }, [qrToken, cartQrToken])

  // Save cart to localStorage only when cartQrToken matches current qrToken
  useEffect(() => {
    if (qrToken && cartQrToken === qrToken) {
      localStorage.setItem(`cart_${qrToken}`, JSON.stringify(cart))
    }
  }, [cart, qrToken, cartQrToken])

  // Resolve Table and Food Court from QR token
  useEffect(() => {
    if (!qrToken) return

    const resolveTable = async () => {
      setIsLoading(true)
      setErrorMsg(null)

      let table: Table
      try {
        const res = await apiFetch<{ data: Table }>(`/api/tables/scan/${qrToken}`)
        table = res.data
        setTableData(table)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'QR Code tidak valid atau meja tidak ditemukan'
        setErrorMsg(msg)
        setIsLoading(false)
        return
      }

      if (table.status === 'disabled') {
        setErrorMsg('Meja ini sedang dinonaktifkan sementara oleh staf.')
        setIsLoading(false)
        return
      }

      // Store active table in localStorage for checkout
      localStorage.setItem(
        'active_table',
        JSON.stringify({
          tableId: table.id,
          tableNumber: table.tableNumber,
          foodCourtId: table.foodCourtId,
          qrToken: table.qrToken,
        })
      )

      // Fetch food court stalls & menus safely without invalidating table resolution
      try {
        const foodCourtId = table.foodCourtId
        let activeStalls: any[] = []
        try {
          const stallsRes = await apiFetch<{ data: any[] }>(`/api/food-courts/${foodCourtId}/tenant/public`)
          activeStalls = stallsRes.data || []
        } catch {
          const fallbackRes = await apiFetch<{ data: any[] }>(`/api/food-court/${foodCourtId}/tenant/public`)
          activeStalls = fallbackRes.data || []
        }

        // Fetch menus for each stall
        const menuPromises = activeStalls.map(async (stall) => {
          const isStallOpen = stall.isOpen !== false
          try {
            const menuRes = await apiFetch<{ data: any[] }>(`/api/menus/tenant/${stall.id}`)
            const rawMenus = menuRes.data || []
            return rawMenus.map((m: any) => ({
              ...m,
              tenantName: stall.name,
              stallNumber: stall.stallNumber,
              tenantIsOpen: isStallOpen,
              categoryName: m.category?.name || m.categoryName || 'Menu Pilihan',
            }))
          } catch {
            try {
              const catRes = await apiFetch<{ data: any[] }>(`/api/menus/categories/${stall.id}`)
              const categories = catRes.data || []
              const stallMenus: (Menu & {
                tenantName: string
                stallNumber: string
                categoryName?: string
                tenantIsOpen?: boolean
              })[] = []
              categories.forEach((cat: any) => {
                if (cat.menus && Array.isArray(cat.menus)) {
                  cat.menus.forEach((m: any) => {
                    stallMenus.push({
                      ...m,
                      tenantName: stall.name,
                      stallNumber: stall.stallNumber,
                      tenantIsOpen: isStallOpen,
                      categoryName: cat.name,
                    })
                  })
                }
              })
              return stallMenus
            } catch {
              return []
            }
          }
        })

        const results = await Promise.all(menuPromises)
        const stallsWithCounts = activeStalls.map((stall, idx) => ({
          ...stall,
          menuCount: results[idx]?.length || 0,
        }))
        setStalls(stallsWithCounts)
        setAllMenus(results.flat())
      } catch {
        setStalls([])
        setAllMenus([])
      } finally {
        setIsLoading(false)
      }
    }

    resolveTable()
  }, [qrToken])

  // Total quantity of a menuId currently in cart across all notes variations
  const getCartQuantityForMenu = (menuId: string) => {
    return cart
      .filter((ci) => ci.menuId === menuId)
      .reduce((sum, ci) => sum + ci.quantity, 0)
  }

  // Add to cart handler with stall open & stock cap enforcement
  const handleAddToCart = (
    item: Menu & { tenantName?: string; stallNumber?: string; tenantIsOpen?: boolean },
    quantity: number,
    notes?: string
  ) => {
    if (item.tenantIsOpen === false) return
    if (!item.isAvailable || item.status === 'OUT_OF_STOCK' || item.status === 'HIDDEN') return

    setCart((prev) => {
      const alreadyInCart = prev
        .filter((ci) => ci.menuId === item.id)
        .reduce((sum, ci) => sum + ci.quantity, 0)
      const maxStock = typeof item.stock === 'number' ? item.stock : 99
      const allowedToAdd = Math.max(0, Math.min(quantity, maxStock - alreadyInCart))
      if (allowedToAdd <= 0) return prev

      const existingIndex = prev.findIndex(
        (ci) => ci.menuId === item.id && (ci.notes || '') === (notes || '')
      )
      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + allowedToAdd,
          stock: typeof item.stock === 'number' ? item.stock : updated[existingIndex].stock,
        }
        return updated
      } else {
        return [
          ...prev,
          {
            menuId: item.id,
            name: item.name,
            price: item.price,
            quantity: allowedToAdd,
            stock: typeof item.stock === 'number' ? item.stock : undefined,
            notes,
            tenantId: item.tenantId,
            tenantName: item.tenantName || 'Tenant Kios',
            stallNumber: item.stallNumber,
            imageUrl: item.imageUrl,
          },
        ]
      }
    })
  }

  // Quick add (1 qty)
  const handleQuickAdd = (item: Menu & { tenantName?: string; stallNumber?: string; tenantIsOpen?: boolean }) => {
    handleAddToCart(item, 1)
  }

  // Decrease quantity by 1 or remove if 1
  const handleDecreaseCart = (item: Menu) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.menuId === item.id)
      if (existingIndex === -1) return prev
      const currentItem = prev[existingIndex]
      if (currentItem.quantity <= 1) {
        return prev.filter((_, idx) => idx !== existingIndex)
      }
      const updated = [...prev]
      updated[existingIndex] = {
        ...currentItem,
        quantity: currentItem.quantity - 1,
      }
      return updated
    })
  }

  // Remove menu item completely from cart
  const handleRemoveFromCart = (menuId: string) => {
    setCart((prev) => prev.filter((ci) => ci.menuId !== menuId))
  }

  // Filtered stalls
  const filteredStalls = useMemo(() => {
    if (!search.trim()) return stalls
    const q = search.toLowerCase()
    return stalls.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.stallNumber && s.stallNumber.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    )
  }, [stalls, search])

  // Open-stall menus for Explore tab (per Spec 3.1: menus from stalls that are currently open)
  const openStallMenus = useMemo(() => {
    return allMenus.filter((m) => m.tenantIsOpen !== false)
  }, [allMenus])

  // Unique categories across open stalls for Explore tab
  const exploreCategories = useMemo(() => {
    const set = new Set<string>()
    openStallMenus.forEach((m) => {
      if (m.categoryName) set.add(m.categoryName)
    })
    return Array.from(set)
  }, [openStallMenus])

  // Filtered menus for explore tab
  const filteredExploreMenus = useMemo(() => {
    const q = search.trim().toLowerCase()
    return openStallMenus.filter((m) => {
      const matchesCat =
        exploreCategory === 'all' || (m.categoryName || '') === exploreCategory
      const matchesSearch = !q
        ? true
        : m.name.toLowerCase().includes(q) ||
          m.tenantName.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
      return matchesCat && matchesSearch
    })
  }, [openStallMenus, search, exploreCategory])

  // Menus for selected tenant
  const tenantMenus = useMemo(() => {
    if (!selectedTenant) return []
    return allMenus.filter((m) => m.tenantId === selectedTenant.id)
  }, [allMenus, selectedTenant])

  // Cart summary calculations
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const uniqueTenantNames = useMemo(() => {
    return Array.from(new Set(cart.map((c) => c.tenantName)))
  }, [cart])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <Icons.Refresh className="w-8 h-8 animate-spin text-[#0a0a0a] mb-2" />
        <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
          Menyiapkan Gerai Meja Anda...
        </p>
      </div>
    )
  }

  if (errorMsg || !tableData) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card surface="paper" className="max-w-md w-full text-center p-8 space-y-4 rounded-[24px]">
          <div className="w-12 h-12 rounded-[18px] bg-[#fff0f0] text-[#e7000b] flex items-center justify-center mx-auto">
            <Icons.AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0a0a0a]">Meja Tidak Ditemukan</h2>
          <p className="text-sm text-[#737373]">
            {errorMsg || 'QR code meja tidak valid atau sudah kadaluarsa.'}
          </p>
          <Button variant="primary" onClick={() => navigate('/')} className="w-full">
            Kembali ke Beranda
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-28 text-[#0a0a0a]">
      {/* Mobile-first centered container */}
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Customer Header with Food Court brand & table number */}
        <FoodCourtCustomerHeader
          foodCourtName={tableData.foodCourt?.name}
          foodCourtLogo={tableData.foodCourt?.logo}
          foodCourtAddress={tableData.foodCourt?.address}
          tableNumber={tableData.tableNumber}
        />

        {/* Conditional View: Storefront View OR Hub Directory */}
        {selectedTenant ? (
          <TenantStorefrontView
            tenant={selectedTenant}
            menus={tenantMenus}
            getCartQuantityForMenu={getCartQuantityForMenu}
            onBack={() => setSelectedTenant(null)}
            onSelectMenu={(selected) => {
              setSelectedItem({
                ...selected,
                tenantName: selectedTenant.name,
                stallNumber: selectedTenant.stallNumber,
                tenantIsOpen: selectedTenant.isOpen !== false,
              })
              setDetailModalOpen(true)
            }}
            onQuickAdd={(selected) => {
              handleQuickAdd({
                ...selected,
                tenantName: selectedTenant.name,
                stallNumber: selectedTenant.stallNumber,
                tenantIsOpen: selectedTenant.isOpen !== false,
              })
            }}
            onDecrease={handleDecreaseCart}
          />
        ) : (
          <div className="space-y-4">
            {/* Global Search Input */}
            <div className="relative">
              <Input
                placeholder="Cari makanan, minuman, atau gerai stan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 text-xs sm:text-sm rounded-[18px]"
              />
              <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3.5 pointer-events-none" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-[#737373] hover:text-[#0a0a0a] text-xs"
                >
                  <Icons.Close className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Navigation Tab Switcher: Direktori Stan vs Eksplor Menu */}
            <div className="flex p-1 rounded-[20px] bg-[#e5e5e5] gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('stalls')}
                className={`flex-1 py-2 px-3 rounded-[16px] text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'stalls'
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'text-[#525252] hover:text-[#0a0a0a]'
                }`}
              >
                <Icons.Store className="w-3.5 h-3.5" />
                <span>Daftar Stan ({stalls.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className={`flex-1 py-2 px-3 rounded-[16px] text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'explore'
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'text-[#525252] hover:text-[#0a0a0a]'
                }`}
              >
                <Icons.Utensils className="w-3.5 h-3.5" />
                <span>Eksplor Semua Menu ({openStallMenus.length})</span>
              </button>
            </div>

            {/* Content Tab 1: Stalls Directory Grid */}
            {activeTab === 'stalls' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#737373] font-semibold">
                    Pilih Gerai Kuliner
                  </h2>
                  <span className="text-[11px] text-[#737373]">
                    {filteredStalls.length} stan tersedia
                  </span>
                </div>

                {filteredStalls.length === 0 ? (
                  <Card surface="paper" className="p-8 text-center text-sm text-[#737373] rounded-[24px]">
                    Tidak ada stan yang cocok dengan kata kunci &quot;{search}&quot;.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredStalls.map((stall) => (
                      <TenantDirectoryCard
                        key={stall.id}
                        tenant={stall}
                        onSelectTenant={(t) => setSelectedTenant(t)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Content Tab 2: Explore All Menus */}
            {activeTab === 'explore' && (
              <div className="space-y-3">
                {exploreCategories.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setExploreCategory('all')}
                      className={`px-3 py-1.5 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        exploreCategory === 'all'
                          ? 'bg-[#0a0a0a] text-white'
                          : 'bg-white text-[#737373] border border-[#e5e5e5] hover:text-[#0a0a0a]'
                      }`}
                    >
                      Semua ({openStallMenus.length})
                    </button>
                    {exploreCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExploreCategory(cat)}
                        className={`px-3 py-1.5 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          exploreCategory === cat
                            ? 'bg-[#0a0a0a] text-white'
                            : 'bg-white text-[#737373] border border-[#e5e5e5] hover:text-[#0a0a0a]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#737373] font-semibold">
                    Semua Sajian Food Court
                  </h2>
                  <span className="text-[11px] text-[#737373]">
                    {filteredExploreMenus.length} sajian
                  </span>
                </div>

                {filteredExploreMenus.length === 0 ? (
                  <Card surface="paper" className="p-8 text-center text-sm text-[#737373] rounded-[24px]">
                    Tidak ada sajian yang cocok dengan kata kunci &quot;{search}&quot;.
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredExploreMenus.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        tenantName={item.tenantName}
                        stallNumber={item.stallNumber}
                        tenantIsOpen={item.tenantIsOpen}
                        inCartQuantity={getCartQuantityForMenu(item.id)}
                        onSelect={(selected) => {
                          setSelectedItem({
                            ...selected,
                            tenantName: item.tenantName,
                            stallNumber: item.stallNumber,
                            tenantIsOpen: item.tenantIsOpen,
                          })
                          setDetailModalOpen(true)
                        }}
                        onQuickAdd={(selected) => {
                          handleQuickAdd({
                            ...selected,
                            tenantName: item.tenantName,
                            stallNumber: item.stallNumber,
                            tenantIsOpen: item.tenantIsOpen,
                          })
                        }}
                        onDecrease={handleDecreaseCart}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        open={detailModalOpen}
        inCartQuantity={selectedItem ? getCartQuantityForMenu(selectedItem.id) : 0}
        onOpenChange={setDetailModalOpen}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
      />

      {/* Floating Universal Multi-Tenant Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-[#f5f5f5] via-[#f5f5f5]/90 to-transparent pointer-events-none">
          <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto pointer-events-auto">
            <div className="p-3.5 sm:p-4 rounded-[26px] bg-[#0a0a0a] text-white shadow-2xl flex items-center justify-between gap-3 border border-white/10">
              <div className="flex items-center gap-3 min-w-0 pl-1">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-mono font-bold text-sm shrink-0 border border-white/10">
                  {totalCartCount}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-white/90">
                      {totalCartCount} Menu
                    </span>
                    <span className="text-white/40">•</span>
                    <Badge variant="soft" className="bg-white/10 text-white text-[10px] py-0 px-1.5 border border-white/10">
                      {uniqueTenantNames.length} Stan
                    </Badge>
                    <span className="text-[10px] text-white/60 truncate max-w-[140px] sm:max-w-[240px]">
                      ({uniqueTenantNames.join(', ')})
                    </span>
                  </div>
                  <p className="font-mono text-base font-black text-white mt-0.5 tracking-tight">
                    {formatRupiah(totalCartAmount)}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => navigate(`/checkout?qrToken=${qrToken}`)}
                className="gap-2 shrink-0 font-bold rounded-[18px] bg-white text-[#0a0a0a] hover:bg-[#e5e5e5] px-4"
              >
                <span>Lihat Pesanan</span>
                <Icons.ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
