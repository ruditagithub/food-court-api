import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'
import { formatRupiah } from '../../lib/utils'
import type { Menu } from '../../types'

interface MenuItemCardProps {
  item: Menu
  tenantName?: string
  stallNumber?: string
  onSelect: (item: Menu) => void
  onQuickAdd?: (item: Menu) => void
}

export function MenuItemCard({
  item,
  tenantName,
  stallNumber,
  onSelect,
  onQuickAdd,
}: MenuItemCardProps) {
  const isAvailable = item.isAvailable && (item.stock === undefined || item.stock > 0)

  return (
    <Card
      surface="paper"
      className="!p-3.5 sm:!p-4 flex gap-3.5 items-start cursor-pointer hover:border-[#737373] transition-all group"
      onClick={() => onSelect(item)}
    >
      {/* Item Image */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] bg-[#f5f5f5] shrink-0 overflow-hidden relative border border-[#e5e5e5]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#737373]">
            <Icons.Utensils className="w-8 h-8 opacity-40" />
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
              Habis
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
        <div className="flex items-center justify-between mt-2 pt-1">
          <span className="font-mono text-sm sm:text-base font-bold text-[#0a0a0a]">
            {formatRupiah(item.price)}
          </span>

          <Button
            type="button"
            variant={isAvailable ? 'primary' : 'secondary'}
            size="sm"
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation()
              if (onQuickAdd) onQuickAdd(item)
              else onSelect(item)
            }}
            className="h-8 px-3 text-xs"
          >
            {isAvailable ? '+ Tambah' : 'Habis'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
