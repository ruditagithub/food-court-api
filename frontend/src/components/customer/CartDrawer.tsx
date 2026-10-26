import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetFooter,
  SheetClose,
} from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'
import { formatRupiah } from '../../lib/utils'
import type { CartItem } from '../../pages/customer/CustomerMenuPage'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CartItem[]
  onUpdateQuantity: (index: number, newQty: number) => void
  onRemoveItem: (index: number) => void
  onCheckout: () => void
}

export function CartDrawer({
  open,
  onOpenChange,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  // Group items by tenantName
  const groupedByTenant = items.reduce((acc, item, index) => {
    const key = item.tenantName || 'Tenant Kios'
    if (!acc[key]) {
      acc[key] = {
        stallNumber: item.stallNumber,
        items: [],
      }
    }
    acc[key].items.push({ ...item, originalIndex: index })
    return acc
  }, {} as Record<string, { stallNumber?: string; items: (CartItem & { originalIndex: number })[] }>)

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange} position="right">
      <SheetHeader>
        <div className="flex items-center justify-between">
          <SheetTitle className="flex items-center gap-2">
            <span>Keranjang Belanja</span>
            <span className="w-6 h-6 rounded-full bg-[#f5f5f5] text-[#0a0a0a] text-xs font-mono font-bold flex items-center justify-center">
              {totalCount}
            </span>
          </SheetTitle>
          <SheetClose onClick={() => onOpenChange(false)} />
        </div>
        <SheetDescription>
          Pesanan Anda dikelompokkan berdasarkan stan gerai dapur masing-masing
        </SheetDescription>
      </SheetHeader>

      <SheetContent>
        {items.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#737373] space-y-3">
            <Icons.ShoppingBag className="w-10 h-10 mx-auto opacity-30 text-[#0a0a0a]" />
            <p>Keranjang belanja Anda masih kosong.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByTenant).map(([tenantName, group]) => {
              const subtotalStall = group.items.reduce(
                (sum, it) => sum + it.price * it.quantity,
                0
              )
              return (
                <div
                  key={tenantName}
                  className="rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] p-3.5 space-y-3"
                >
                  {/* Stall Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icons.Store className="w-4 h-4 text-[#737373] shrink-0" />
                      <span className="font-bold text-xs text-[#0a0a0a] truncate">
                        {tenantName}
                      </span>
                    </div>
                    {group.stallNumber && (
                      <span className="font-mono text-[10px] text-[#737373] bg-[#f5f5f5] px-2 py-0.5 rounded-[10px]">
                        {group.stallNumber}
                      </span>
                    )}
                  </div>

                  {/* Stall items */}
                  <div className="space-y-2.5">
                    {group.items.map((item) => (
                      <div
                        key={`${item.menuId}-${item.originalIndex}`}
                        className="flex items-start justify-between gap-3 text-xs bg-white p-2.5 rounded-[14px] border border-[#e5e5e5]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#0a0a0a] leading-snug">
                            {item.name}
                          </p>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.selectedOptions.map((opt, oIdx) => (
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
                          <p className="font-mono text-[#737373] text-[11px] mt-1">
                            {formatRupiah(item.price)}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-[#0a0a0a] italic bg-[#f5f5f5] px-2 py-0.5 rounded-[8px] mt-1 line-clamp-2">
                              "{item.notes}"
                            </p>
                          )}
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="inline-flex items-center gap-1 rounded-[14px] bg-[#f5f5f5] p-0.5 border border-[#e5e5e5]">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  onUpdateQuantity(item.originalIndex, item.quantity - 1)
                                } else {
                                  onRemoveItem(item.originalIndex)
                                }
                              }}
                              className="w-5 h-5 rounded-full bg-white hover:bg-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold px-1.5 text-center min-w-[18px]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(item.originalIndex, item.quantity + 1)
                              }
                              className="w-5 h-5 rounded-full bg-[#0a0a0a] hover:bg-[#171717] text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-[#0a0a0a]">
                            {formatRupiah(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtotal stall */}
                  <div className="flex justify-between text-[11px] pt-1 text-[#737373]">
                    <span>Subtotal Stan</span>
                    <span className="font-mono font-bold text-[#0a0a0a]">
                      {formatRupiah(subtotalStall)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SheetContent>

      {items.length > 0 && (
        <SheetFooter>
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-sm text-[#737373]">Total Keseluruhan</span>
            <span className="text-lg font-mono font-black text-[#0a0a0a]">
              {formatRupiah(totalAmount)}
            </span>
          </div>
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => {
              onOpenChange(false)
              onCheckout()
            }}
            className="w-full gap-2 font-bold"
          >
            <span>Lanjut ke Pembayaran</span>
            <Icons.ArrowRight className="w-4 h-4" />
          </Button>
        </SheetFooter>
      )}
    </Sheet>
  )
}
