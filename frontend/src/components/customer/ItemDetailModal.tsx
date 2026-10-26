import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Label } from '../ui/Label'
import { Icons } from '../ui/Icons'
import { formatRupiah } from '../../lib/utils'
import type { Menu } from '../../types'

interface ItemDetailModalProps {
  item: (Menu & { tenantName?: string; stallNumber?: string; tenantIsOpen?: boolean }) | null
  open: boolean
  inCartQuantity?: number
  onOpenChange: (open: boolean) => void
  onAddToCart: (
    item: Menu & { tenantName?: string; stallNumber?: string; tenantIsOpen?: boolean },
    quantity: number,
    notes?: string,
    selectedOptions?: Array<{ id: string; name: string; priceAdjustment: number }>
  ) => void
  onRemoveFromCart?: (menuId: string) => void
}

export function ItemDetailModal({
  item,
  open,
  inCartQuantity = 0,
  onOpenChange,
  onAddToCart,
  onRemoveFromCart,
}: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set())
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (open) {
      setQuantity(1)
      setNotes('')
      setSelectedOptionIds(new Set())
      setImgError(false)
    }
  }, [open, item])

  if (!item) return null

  const rawStock = typeof item.stock === 'number' ? item.stock : 99
  const maxStock = Math.max(0, rawStock - inCartQuantity)
  const isStallOpen = item.tenantIsOpen !== false
  const isAvailable =
    isStallOpen &&
    item.isAvailable &&
    item.status !== 'OUT_OF_STOCK' &&
    item.status !== 'HIDDEN' &&
    maxStock > 0

  const optionsAdjustment = (item.options || [])
    .filter((opt) => selectedOptionIds.has(opt.id))
    .reduce((sum, opt) => sum + (opt.priceAdjustment || 0), 0)

  const effectiveUnitPrice = item.price + optionsAdjustment
  const totalPrice = effectiveUnitPrice * quantity

  const handleToggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) {
        next.delete(optionId)
      } else {
        next.add(optionId)
      }
      return next
    })
  }

  const handleAdd = () => {
    if (!isAvailable) return
    const chosenOptions = (item.options || [])
      .filter((opt) => selectedOptionIds.has(opt.id))
      .map((opt) => ({
        id: opt.id,
        name: opt.name,
        priceAdjustment: opt.priceAdjustment || 0,
      }))

    onAddToCart(
      item,
      Math.min(quantity, maxStock),
      notes.trim() || undefined,
      chosenOptions.length > 0 ? chosenOptions : undefined
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />

      {/* Item Image Hero */}
      <div className="w-full h-48 -mt-6 -mx-6 mb-4 bg-[#f5f5f5] overflow-hidden relative border-b border-[#e5e5e5]">
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#737373]">
            <Icons.Utensils className="w-12 h-12 opacity-30" />
          </div>
        )}
      </div>

      <DialogHeader>
        {item.tenantName && (
          <div className="flex items-center justify-between gap-2 text-xs text-[#737373] mb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#0a0a0a]">{item.tenantName}</span>
              {item.stallNumber && (
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[12px] bg-[#f5f5f5]">
                  {item.stallNumber}
                </span>
              )}
            </div>
            {typeof item.stock === 'number' && (
              <span className="font-mono text-[11px] text-[#737373]">
                Stok: {item.stock} porsi
              </span>
            )}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="text-xl">{item.name}</DialogTitle>
          <div className="text-right shrink-0">
            <span className="font-mono text-lg font-bold text-[#0a0a0a] block">
              {formatRupiah(effectiveUnitPrice)}
            </span>
            {optionsAdjustment > 0 && (
              <span className="font-mono text-[10px] text-[#737373] block">
                Dasar {formatRupiah(item.price)} + {formatRupiah(optionsAdjustment)}
              </span>
            )}
          </div>
        </div>
        {item.description && (
          <DialogDescription className="mt-1 leading-relaxed">
            {item.description}
          </DialogDescription>
        )}
      </DialogHeader>

      <div className="space-y-4 my-2">
        {/* Pilihan Varian & Tambahan */}
        {item.options && item.options.length > 0 && (
          <div className="space-y-2.5 p-3.5 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0a0a0a]">
                Pilihan Varian & Tambahan
              </span>
              <span className="text-[11px] text-[#737373]">
                {selectedOptionIds.size > 0
                  ? `${selectedOptionIds.size} dipilih`
                  : 'Opsional'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.options.map((opt) => {
                const isSelected = selectedOptionIds.has(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleOption(opt.id)}
                    className={`flex items-center justify-between p-2.5 rounded-[14px] text-xs font-medium border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-xs'
                        : 'bg-white text-[#0a0a0a] border-[#e5e5e5] hover:border-[#737373]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-[6px] border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-white border-white text-[#0a0a0a]'
                            : 'border-[#d4d4d4] bg-[#fafafa]'
                        }`}
                      >
                        {isSelected && <Icons.Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.name}</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] ml-2 shrink-0 ${
                        isSelected ? 'text-white/90' : 'text-[#737373]'
                      }`}
                    >
                      {opt.priceAdjustment > 0
                        ? `+${formatRupiah(opt.priceAdjustment)}`
                        : 'Gratis'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quantity selector */}
        <div className="flex items-center justify-between p-3.5 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
          <span className="text-sm font-semibold text-[#0a0a0a]">Jumlah Pesanan</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || !isAvailable}
              className="w-8 h-8 rounded-full bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center font-bold text-base transition-colors disabled:opacity-40 cursor-pointer"
              aria-label="Kurangi porsi"
            >
              -
            </button>
            <span className="font-mono text-base font-bold w-8 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
              disabled={!isAvailable || quantity >= maxStock}
              className="w-8 h-8 rounded-full bg-[#0a0a0a] hover:bg-[#171717] text-white flex items-center justify-center font-bold text-base transition-colors disabled:opacity-40 cursor-pointer"
              aria-label="Tambah porsi"
            >
              +
            </button>
          </div>
        </div>

        {/* Special instructions */}
        <div>
          <Label htmlFor="special-notes">Catatan Khusus untuk Dapur</Label>
          <textarea
            id="special-notes"
            rows={2}
            className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all"
            placeholder="Contoh: Jangan terlalu pedas, kuah dipisah, ekstra sambal..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {inCartQuantity > 0 && onRemoveFromCart && (
          <button
            type="button"
            onClick={() => {
              onRemoveFromCart(item.id)
              onOpenChange(false)
            }}
            className="w-full py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-[14px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Icons.Trash className="w-3.5 h-3.5" />
            <span>Hapus {inCartQuantity} dari Keranjang</span>
          </button>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full justify-between px-5"
          disabled={!isAvailable}
          onClick={handleAdd}
        >
          <span>Tambah ke Pesanan</span>
          <span className="font-mono">{formatRupiah(totalPrice)}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
