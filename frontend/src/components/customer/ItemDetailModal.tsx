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
  item: (Menu & { tenantName?: string; stallNumber?: string }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (
    item: Menu & { tenantName?: string; stallNumber?: string },
    quantity: number,
    notes?: string
  ) => void
}

export function ItemDetailModal({
  item,
  open,
  onOpenChange,
  onAddToCart,
}: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setQuantity(1)
      setNotes('')
    }
  }, [open, item])

  if (!item) return null

  const isAvailable = item.isAvailable && (item.stock === undefined || item.stock > 0)
  const totalPrice = item.price * quantity

  const handleAdd = () => {
    onAddToCart(item, quantity, notes.trim() || undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />

      {/* Item Image Hero */}
      <div className="w-full h-48 -mt-6 -mx-6 mb-4 bg-[#f5f5f5] overflow-hidden relative border-b border-[#e5e5e5]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#737373]">
            <Icons.Utensils className="w-12 h-12 opacity-30" />
          </div>
        )}
      </div>

      <DialogHeader>
        {item.tenantName && (
          <div className="flex items-center gap-1.5 text-xs text-[#737373] mb-1">
            <span className="font-semibold text-[#0a0a0a]">{item.tenantName}</span>
            {item.stallNumber && (
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[12px] bg-[#f5f5f5]">
                {item.stallNumber}
              </span>
            )}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="text-xl">{item.name}</DialogTitle>
          <span className="font-mono text-lg font-bold text-[#0a0a0a] shrink-0">
            {formatRupiah(item.price)}
          </span>
        </div>
        {item.description && (
          <DialogDescription className="mt-1 leading-relaxed">
            {item.description}
          </DialogDescription>
        )}
      </DialogHeader>

      <div className="space-y-4 my-2">
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
              onClick={() => setQuantity((q) => q + 1)}
              disabled={!isAvailable}
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
          <span>+ Tambah ke Pesanan</span>
          <span className="font-mono">{formatRupiah(totalPrice)}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
