import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import { FoodCourtCustomerHeader } from '../../components/customer/FoodCourtCustomerHeader'
import { MenuItemCard } from '../../components/customer/MenuItemCard'
import { ItemDetailModal } from '../../components/customer/ItemDetailModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icons } from '../../components/ui/Icons'
import { formatRupiah } from '../../lib/utils'
import type { Menu, Table } from '../../types'

export interface CartItem {
  menuId: string
  name: string
  price: number
  quantity: number
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
  const [allMenus, setAllMenus] = useState<(Menu & { tenantName: string; stallNumber: string })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filters
  const [selectedStallId, setSelectedStallId] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Item detail modal
  const [selectedItem, setSelectedItem] = useState<(Menu & { tenantName?: string; stallNumber?: string }) | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Local cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${qrToken}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Save cart to localStorage
  useEffect(() => {
    if (qrToken) {
      localStorage.setItem(`cart_${qrToken}`, JSON.stringify(cart))
    }
  }, [cart, qrToken])

  // Resolve Table and Food Court from QR token
  useEffect(() => {
    if (!qrToken) return

    const resolveTable = async () => {
      setIsLoading(true)
      setErrorMsg(null)
      try {
        const res = await apiFetch<{ data: Table }>(`/api/tables/scan/${qrToken}`)
        const table = res.data
        setTableData(table)

        if (table.status === 'disabled') {
          setErrorMsg('Meja ini sedang dinonaktifkan sementara oleh staf.')
          setIsLoading(false)
          return
        }

        // Fetch food court stalls
        const foodCourtId = table.foodCourtId
        const stallsRes = await apiFetch<{ data: any[] }>(`/api/food-court/${foodCourtId}/tenant/public`)
        const activeStalls = stallsRes.data || []
        setStalls(activeStalls)

        // Fetch menus for each stall
        const menuPromises = activeStalls.map(async (stall) => {
          try {
            const catRes = await apiFetch<{ data: any[] }>(`/api/menus/categories/${stall.id}`)
            const categories = catRes.data || []
            const stallMenus: (Menu & { tenantName: string; stallNumber: string })[] = []

            categories.forEach((cat: any) => {
              if (cat.menus && Array.isArray(cat.menus)) {
                cat.menus.forEach((m: any) => {
                  stallMenus.push({
                    ...m,
                    tenantName: stall.name,
                    stallNumber: stall.stallNumber,
                  })
                })
              }
            })
            return stallMenus
          } catch {
            return []
          }
        })

        const results = await Promise.all(menuPromises)
        setAllMenus(results.flat())
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'QR Code tidak valid atau meja tidak ditemukan'
        setErrorMsg(msg)
      } finally {
        setIsLoading(false)
      }
    }

    resolveTable()
  }, [qrToken])

  // Add to cart handler
  const handleAddToCart = (
    item: Menu & { tenantName?: string; stallNumber?: string },
    quantity: number,
    notes?: string
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (ci) => ci.menuId === item.id && (ci.notes || '') === (notes || '')
      )
      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex].quantity += quantity
        return updated
      } else {
        return [
          ...prev,
          {
            menuId: item.id,
            name: item.name,
            price: item.price,
            quantity,
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
  const handleQuickAdd = (item: Menu & { tenantName?: string; stallNumber?: string }) => {
    handleAddToCart(item, 1)
  }

  // Filtered menus
  const filteredMenus = useMemo(() => {
    return allMenus.filter((m) => {
      const matchesStall =
        selectedStallId === 'all' || m.tenantId === selectedStallId
      const matchesSearch = search.trim()
        ? m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.tenantName.toLowerCase().includes(search.toLowerCase())
        : true
      return matchesStall && matchesSearch
    })
  }, [allMenus, selectedStallId, search])

  // Cart total summary
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
        <Icons.Refresh className="w-8 h-8 animate-spin text-[#0a0a0a] mb-2" />
        <p className="text-xs font-mono uppercase tracking-wider text-[#737373]">
          Menyiapkan Menu Meja Anda...
        </p>
      </div>
    )
  }

  if (errorMsg || !tableData) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card surface="paper" className="max-w-md w-full text-center p-8 space-y-4">
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
    <div className="min-h-screen bg-[#f5f5f5] pb-24 text-[#0a0a0a]">
      {/* Mobile-first centered container */}
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Customer Header with Food Court brand & table number */}
        <FoodCourtCustomerHeader
          foodCourtName={tableData.foodCourt?.name}
          foodCourtLogo={tableData.foodCourt?.logo}
          foodCourtAddress={tableData.foodCourt?.address}
          tableNumber={tableData.tableNumber}
        />

        {/* Search input */}
        <div className="relative">
          <Input
            placeholder="Cari makanan, minuman, atau gerai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
          <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3.5 pointer-events-none" />
        </div>

        {/* Stalls horizontal pill scroller */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setSelectedStallId('all')}
            className={`px-3.5 py-1.5 rounded-[18px] text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              selectedStallId === 'all'
                ? 'bg-[#0a0a0a] text-white shadow-xs'
                : 'bg-[#ffffff] text-[#737373] border border-[#e5e5e5] hover:text-[#0a0a0a]'
            }`}
          >
            Semua Stan ({stalls.length})
          </button>
          {stalls.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStallId(s.id)}
              className={`px-3.5 py-1.5 rounded-[18px] text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                selectedStallId === s.id
                  ? 'bg-[#0a0a0a] text-white shadow-xs'
                  : 'bg-[#ffffff] text-[#737373] border border-[#e5e5e5] hover:text-[#0a0a0a]'
              }`}
            >
              {s.name} ({s.stallNumber})
            </button>
          ))}
        </div>

        {/* Menus Grid / List */}
        <div className="space-y-3">
          {filteredMenus.length === 0 ? (
            <Card surface="paper" className="p-8 text-center text-sm text-[#737373]">
              Tidak ada menu makanan yang cocok dengan pencarian Anda.
            </Card>
          ) : (
            filteredMenus.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                tenantName={item.tenantName}
                stallNumber={item.stallNumber}
                onSelect={(selected) => {
                  setSelectedItem({
                    ...selected,
                    tenantName: item.tenantName,
                    stallNumber: item.stallNumber,
                  })
                  setDetailModalOpen(true)
                }}
                onQuickAdd={(selected) => {
                  handleQuickAdd({
                    ...selected,
                    tenantName: item.tenantName,
                    stallNumber: item.stallNumber,
                  })
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onAddToCart={handleAddToCart}
      />

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-[#f5f5f5] via-[#f5f5f5]/90 to-transparent pointer-events-none">
          <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto pointer-events-auto">
            <div className="p-3.5 rounded-[24px] bg-[#0a0a0a] text-white shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 pl-1">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                  {totalCartCount}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#a3a3a3] leading-none">Total Belanja</p>
                  <p className="font-mono text-base font-bold text-white mt-1">
                    {formatRupiah(totalCartAmount)}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => navigate(`/checkout?qrToken=${qrToken}`)}
                className="gap-2 shrink-0 font-bold"
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
