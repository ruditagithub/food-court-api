import { useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'
import { formatRupiah } from '../../lib/utils'
import type { Menu } from '../../types'

interface MenuItemCardProps {
  item: Menu & { tenantIsOpen?: boolean }
  tenantName?: string
  stallNumber?: string
  tenantIsOpen?: boolean
  inCartQuantity?: number
  onSelect: (item: Menu) => void
  onQuickAdd?: (item: Menu) => void
  onDecrease?: (item: Menu) => void
}

export function MenuItemCard({
  item,
  tenantName,
  stallNumber,
  tenantIsOpen,
  inCartQuantity = 0,
  onSelect,
  onQuickAdd,
  onDecrease,
}: MenuItemCardProps) {
  const [imgError, setImgError] = useState(false)
  const isStallOpen = tenantIsOpen !== false && item.tenantIsOpen !== false
  const hasStockLimit = typeof item.stock === 'number'
  const outOfStock = !item.isAvailable || item.status === 'OUT_OF_STOCK' || item.status === 'HIDDEN' || (hasStockLimit && item.stock <= 0)
  const remainingStock = hasStockLimit ? Math.max(0, item.stock - inCartQuantity) : 99
  const isAvailable = isStallOpen && !outOfStock && remainingStock > 0

  return (
    <Card
      surface="paper"
      className="!p-3.5 sm:!p-4 flex gap-3.5 items-start cursor-pointer hover:border-[#737373] transition-all group"
      onClick={() => onSelect(item)}
    >
      {/* Item Image */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] bg-[#f5f5f5] shrink-0 overflow-hidden relative border border-[#e5e5e5]">
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#737373]">
            <Icons.Utensils className="w-8 h-8 opacity-40" />
          </div>
        )}
        {(!isStallOpen || outOfStock) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
              {!isStallOpen ? 'Stan Tutup' : 'Habis'}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          {tenantName && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-medium text-[#737373] truncate">
                {tenantName}
              </span>
              {stallNumber && (
                <Badge variant="soft" className="text-[9px] px-1.5 py-0">
                  {stallNumber}
                </Badge>
              )}
            </div>
          )}

          <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] leading-tight line-clamp-1 group-hover:text-black">
            {item.name}
          </h3>

          {item.description && (
            <p className="text-xs text-[#737373] line-clamp-2 mt-1 leading-normal">
              {item.description}
            </p>
          )}
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between mt-2 pt-1 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm sm:text-base font-bold text-[#0a0a0a]">
              {formatRupiah(item.price)}
            </span>
          </div>

          {inCartQuantity > 0 ? (
            <div
              className="flex items-center gap-1.5 bg-[#f5f5f5] p-1 rounded-[14px] border border-[#e5e5e5]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onDecrease && onDecrease(item)}
                className="w-7 h-7 rounded-[10px] bg-white hover:bg-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center font-bold text-xs shadow-xs transition-colors cursor-pointer"
                aria-label="Kurangi porsi"
              >
                {inCartQuantity === 1 ? (
                  <Icons.Trash className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <span>-</span>
                )}
              </button>
              <span className="font-mono text-xs font-bold w-5 text-center text-[#0a0a0a]">
                {inCartQuantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!isAvailable) return
                  if (onQuickAdd) onQuickAdd(item)
                  else onSelect(item)
                }}
                disabled={!isAvailable}
                className="w-7 h-7 rounded-[10px] bg-[#0a0a0a] hover:bg-[#262626] text-white flex items-center justify-center font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tambah porsi"
              >
                +
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant={isAvailable ? 'primary' : 'secondary'}
              size="sm"
              disabled={!isAvailable}
              onClick={(e) => {
                e.stopPropagation()
                if (!isAvailable) return
                if (onQuickAdd) onQuickAdd(item)
                else onSelect(item)
              }}
              className="h-8 px-3 text-xs"
            >
              {!isStallOpen
                ? 'Tutup'
                : outOfStock
                  ? 'Habis'
                  : remainingStock <= 0
                    ? 'Maks Stok'
                    : 'Tambah'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
