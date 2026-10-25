import { useState, useMemo } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { Icons } from '../ui/Icons'
import { MenuItemCard } from './MenuItemCard'
import type { Menu } from '../../types'

interface TenantStorefrontViewProps {
  tenant: {
    id: string
    name: string
    stallNumber: string
    description?: string | null
    coverUrl?: string | null
    isOpen?: boolean
  }
  menus: (Menu & { tenantName: string; stallNumber: string; tenantIsOpen?: boolean })[]
  getCartQuantityForMenu?: (menuId: string) => number
  onBack: () => void
  onSelectMenu: (item: any) => void
  onQuickAdd: (item: any) => void
  onDecrease?: (item: any) => void
}

export function TenantStorefrontView({
  tenant,
  menus,
  getCartQuantityForMenu,
  onBack,
  onSelectMenu,
  onQuickAdd,
  onDecrease,
}: TenantStorefrontViewProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const isStallOpen = tenant.isOpen !== false

  // Extract unique categories from menus
  const categoryList = useMemo(() => {
    const set = new Set<string>()
    menus.forEach((m: any) => {
      const catName = m.categoryName || m.category?.name
      if (catName) set.add(catName)
    })
    return Array.from(set)
  }, [menus])

  // Filter menus
  const filteredMenus = useMemo(() => {
    return menus.filter((m: any) => {
      const cat = m.categoryName || m.category?.name || ''
      const matchesCategory =
        selectedCategory === 'all' || cat === selectedCategory
      const matchesSearch = search.trim()
        ? m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
        : true
      return matchesCategory && matchesSearch
    })
  }, [menus, selectedCategory, search])

  return (
    <div className="space-y-4">
      {/* Top Navigation Bar: Back Button & Stall Number Badge */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors py-1.5 px-3 rounded-[16px] bg-white border border-[#e5e5e5] shadow-xs cursor-pointer hover:border-[#0a0a0a]"
        >
          <Icons.ArrowLeft className="w-3.5 h-3.5" />
          <span>Ganti / Pilih Stan Lain</span>
        </button>

        <Badge variant="solid" className="font-mono text-xs">
          Kios {tenant.stallNumber}
        </Badge>
      </div>

      {/* Tenant Banner Profile Card */}
      <Card surface="paper" className="p-4 sm:p-5 space-y-3 rounded-[24px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#0a0a0a] tracking-tight">
                {tenant.name}
              </h2>
              <Badge
                variant="solid"
                className={
                  isStallOpen
                    ? 'bg-[#16a34a] text-white text-[10px]'
                    : 'bg-[#737373] text-white text-[10px]'
                }
              >
                {isStallOpen ? 'BUKA' : 'TUTUP'}
              </Badge>
            </div>
            <p className="text-xs text-[#737373] mt-1 leading-relaxed">
              {tenant.description || 'Penyedia aneka sajian lezat food court.'}
            </p>
          </div>
        </div>

        {!isStallOpen && (
          <div className="p-3 rounded-[16px] bg-[#fff0f0] border border-[#fecaca] text-[#991b1b] text-xs flex items-center gap-2">
            <Icons.AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626]" />
            <span>
              Gerai ini sedang tutup sementara. Silakan pilih gerai lain yang berstatus BUKA untuk memesan.
            </span>
          </div>
        )}

        {/* Local Search in this Stall */}
        <div className="relative pt-1">
          <Input
            placeholder={`Cari menu di ${tenant.name}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
          <Icons.Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-4 pointer-events-none" />
        </div>

        {/* Category Pills if more than 1 category */}
        {categoryList.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0a0a0a] text-white'
                  : 'bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Semua ({menus.length})
            </button>
            {categoryList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0a0a0a] text-white'
                    : 'bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Menu List of this Stall */}
      <div className="space-y-3">
        {filteredMenus.length === 0 ? (
          <Card surface="paper" className="p-8 text-center text-sm text-[#737373] rounded-[24px]">
            Tidak ada sajian menu yang ditemukan di stan ini.
          </Card>
        ) : (
          filteredMenus.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              tenantName={tenant.name}
              stallNumber={tenant.stallNumber}
              tenantIsOpen={isStallOpen}
              inCartQuantity={getCartQuantityForMenu ? getCartQuantityForMenu(item.id) : 0}
              onSelect={onSelectMenu}
              onQuickAdd={onQuickAdd}
              onDecrease={onDecrease}
            />
          ))
        )}
      </div>
    </div>
  )
}
