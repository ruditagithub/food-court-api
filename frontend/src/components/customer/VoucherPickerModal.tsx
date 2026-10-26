import { useState, useEffect } from 'react'
import { Ticket, Check, Building, Store, AlertCircle } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { formatRupiah, formatDate } from '../../lib/utils'
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Icons } from '../ui/Icons'
import type { Discount, DiscountCalculationResult } from '../../types'
import type { CartItem } from '../../pages/customer/CustomerMenuPage'

interface VoucherPickerModalProps {
  isOpen: boolean
  onClose: () => void
  foodCourtId: string
  cartItems: CartItem[]
  onApplyDiscount: (result: DiscountCalculationResult) => void
  appliedDiscountId?: string
}

export function VoucherPickerModal({
  isOpen,
  onClose,
  foodCourtId,
  cartItems,
  onApplyDiscount,
  appliedDiscountId,
}: VoucherPickerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [publicVouchers, setPublicVouchers] = useState<Discount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Calculate current cart subtotal
  const currentSubtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  // Fetch public vouchers
  useEffect(() => {
    if (!isOpen || !foodCourtId) return
    setErrorMsg(null)
    setIsLoading(true)

    const tenantIds = Array.from(
      new Set(cartItems.map((ci) => ci.tenantId).filter(Boolean))
    )
    const tenantQuery = tenantIds.length > 0 ? `&tenantId=${encodeURIComponent(tenantIds.join(','))}` : ''

    apiFetch<{ data: Discount[] }>(
      `/api/discounts/public?foodCourtId=${encodeURIComponent(foodCourtId)}${tenantQuery}`
    )
      .then((res) => {
        setPublicVouchers(res.data || [])
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Gagal memuat voucher promo'
        setErrorMsg(msg)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen, foodCourtId, cartItems])

  // Execute validation
  const executeValidate = async (params: { discountCode?: string; discountId?: string }) => {
    setIsValidating(true)
    setErrorMsg(null)

    try {
      const payload = {
        foodCourtId,
        discountCode: params.discountCode || undefined,
        discountId: params.discountId || undefined,
        items: cartItems.map((ci) => ({
          menuId: ci.menuId,
          quantity: ci.quantity,
          optionIds: ci.selectedOptions?.map((o: any) => o.id) || undefined,
        })),
      }

      const res = await apiFetch<{ data: DiscountCalculationResult }>('/api/discounts/validate', {
        method: 'POST',
        body: payload,
      })

      if (res.data) {
        onApplyDiscount(res.data)
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Voucher tidak dapat digunakan'
      setErrorMsg(msg)
    } finally {
      setIsValidating(false)
    }
  }

  const handleApplyManualCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    executeValidate({ discountCode: manualCode.trim().toUpperCase() })
  }

  const handleSelectPublicVoucher = (voucher: Discount) => {
    executeValidate({ discountId: voucher.id })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isValidating && onClose()} size="lg">
      <DialogClose onClick={() => !isValidating && onClose()} />
      <DialogHeader>
        <div className="pr-6">
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600" />
            <span>Pilih Promo & Kupon</span>
          </DialogTitle>
          <p className="text-xs text-[#737373] mt-0.5">
            Gunakan voucher publik atau masukkan kode promo untuk potongan harga.
          </p>
        </div>
      </DialogHeader>

      <div className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {/* 1. Manual Promo Code Input */}
        <form onSubmit={handleApplyManualCode} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Ticket className="w-4 h-4 text-[#737373] absolute left-3 top-2.5 pointer-events-none" />
              <Input
                placeholder="Punya kode kupon? Masukkan di sini..."
                value={manualCode}
                onChange={(e) => {
                  setErrorMsg(null)
                  setManualCode(e.target.value.toUpperCase().replace(/\s+/g, ''))
                }}
                disabled={isValidating}
                className="pl-9 h-10 text-xs font-mono font-bold uppercase tracking-wider"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!manualCode.trim() || isValidating}
              className="text-xs font-bold h-10 rounded-[12px] px-4"
            >
              {isValidating ? (
                <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Terapkan'
              )}
            </Button>
          </div>
        </form>

        {errorMsg && (
          <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2. Public Vouchers List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
              Voucher Tersedia ({publicVouchers.length})
            </span>
            <span className="text-[11px] text-[#737373]">
              Subtotal: <strong>{formatRupiah(currentSubtotal)}</strong>
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <Icons.Refresh className="w-5 h-5 animate-spin text-[#737373] mx-auto" />
              <p className="text-xs text-[#737373]">Mencari promo yang berlaku...</p>
            </div>
          ) : publicVouchers.length === 0 ? (
            <div className="p-8 rounded-[20px] bg-[#fafafa] border border-dashed border-[#e5e5e5] text-center space-y-2">
              <Ticket className="w-6 h-6 text-[#737373] mx-auto opacity-50" />
              <p className="text-xs font-semibold text-[#0a0a0a]">
                Belum ada voucher publik saat ini
              </p>
              <p className="text-[11px] text-[#737373]">
                Anda tetap dapat memasukkan kode promo khusus pada kolom di atas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {publicVouchers.map((voucher) => {
                const isSelected = appliedDiscountId === voucher.id
                const isTenantScoped = voucher.scope === 'TENANT'

                // Check tenant qualification if scoped to a tenant
                const tenantItemsTotal = isTenantScoped
                  ? cartItems
                      .filter((ci) => ci.tenantId === voucher.tenantId)
                      .reduce((sum, ci) => sum + ci.price * ci.quantity, 0)
                  : currentSubtotal

                const meetsMinOrder = tenantItemsTotal >= voucher.minOrderAmount
                const minDeficit = voucher.minOrderAmount - tenantItemsTotal

                return (
                  <div
                    key={voucher.id}
                    className={`p-4 rounded-[18px] border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                        : meetsMinOrder
                        ? 'bg-white border-[#e5e5e5] hover:border-emerald-300 shadow-2xs'
                        : 'bg-[#fafafa] border-[#e5e5e5] opacity-75'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Badge Scope */}
                      <div className="flex items-center gap-2">
                        {voucher.scope === 'FOOD_COURT' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-[6px]">
                            <Building className="w-3 h-3" />
                            <span>Semua Stan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-[6px]">
                            <Store className="w-3 h-3" />
                            <span>Khusus Stan: {voucher.tenant?.name || 'Stan'}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-[#737373] font-mono">
                          s/d {formatDate(voucher.endDate)}
                        </span>
                      </div>

                      {/* Main Value */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black font-mono text-[#0a0a0a]">
                          {voucher.type === 'PERCENTAGE'
                            ? `Diskon ${voucher.value}%`
                            : `Potongan ${formatRupiah(voucher.value)}`}
                        </span>
                        {voucher.type === 'PERCENTAGE' && voucher.maxDiscountAmount && (
                          <span className="text-[11px] text-[#737373]">
                            (Maks. {formatRupiah(voucher.maxDiscountAmount)})
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-[#0a0a0a]">
                        {voucher.name}
                      </p>

                      <div className="text-[11px] text-[#737373] space-y-0.5">
                        <p>
                          Min. transaksi:{' '}
                          <span className="font-semibold text-[#0a0a0a]">
                            {voucher.minOrderAmount > 0
                              ? formatRupiah(voucher.minOrderAmount)
                              : 'Tanpa minimum'}
                          </span>
                        </p>

                        {!meetsMinOrder && (
                          <p className="text-rose-600 font-medium">
                            {isTenantScoped
                              ? `Tambah ${formatRupiah(minDeficit)} lagi di stan ini untuk menggunakan voucher.`
                              : `Kurang ${formatRupiah(minDeficit)} untuk memakai voucher ini.`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="self-end sm:self-center shrink-0">
                      {isSelected ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-emerald-600 text-white text-xs font-bold shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Terpasang</span>
                        </div>
                      ) : (
                        <Button
                          variant={meetsMinOrder ? 'primary' : 'outline'}
                          size="sm"
                          disabled={!meetsMinOrder || isValidating}
                          onClick={() => handleSelectPublicVoucher(voucher)}
                          className="text-xs font-bold rounded-[12px] h-8.5 px-3.5"
                        >
                          Pakai Voucher
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
