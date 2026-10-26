import { useState } from 'react'
import { Ticket, Copy, Check, Store, Building } from 'lucide-react'
import type { Discount, Role } from '../../types'
import { formatRupiah, formatDate } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'

interface DiscountCardProps {
  discount: Discount
  currentRole?: Role
  onEdit: (discount: Discount) => void
  onToggleStatus: (discount: Discount) => void
  isUpdating?: boolean
}

export function DiscountCard({
  discount,
  currentRole: _currentRole,
  onEdit,
  onToggleStatus,
  isUpdating = false,
}: DiscountCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    if (!discount.code) return
    navigator.clipboard.writeText(discount.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = new Date(discount.endDate) < new Date()
  const isStarted = new Date(discount.startDate) <= new Date()

  const getStatusBadge = () => {
    if (discount.status === 'INACTIVE') {
      return (
        <Badge variant="soft" className="bg-neutral-100 text-neutral-600 border-neutral-200">
          Nonaktif
        </Badge>
      )
    }
    if (isExpired || discount.status === 'EXPIRED') {
      return (
        <Badge variant="soft" className="bg-rose-50 text-rose-700 border-rose-200">
          Kedaluwarsa
        </Badge>
      )
    }
    if (!isStarted) {
      return (
        <Badge variant="soft" className="bg-amber-50 text-amber-700 border-amber-200">
          Akan Datang
        </Badge>
      )
    }
    return (
      <Badge variant="solid" className="bg-emerald-600 text-white">
        Aktif
      </Badge>
    )
  }

  // Quota calculation
  const hasLimit = typeof discount.usageLimit === 'number' && discount.usageLimit > 0
  const usagePercent = hasLimit
    ? Math.min(100, Math.round((discount.usageCount / (discount.usageLimit || 1)) * 100))
    : 0

  return (
    <div className="rounded-[22px] bg-white border border-[#e5e5e5] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4">
      {/* Top Header: Scope & Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#737373] min-w-0">
            {discount.scope === 'FOOD_COURT' ? (
              <>
                <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-semibold text-indigo-900 truncate">
                  {discount.foodCourt?.name || 'Seluruh Food Court'}
                </span>
              </>
            ) : (
              <>
                <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-900 truncate">
                  {discount.tenant?.name || 'Khusus Stan'}
                </span>
              </>
            )}
          </div>
          <div className="shrink-0">{getStatusBadge()}</div>
        </div>

        {/* Promo Title & Value */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#0a0a0a]">
              {discount.type === 'PERCENTAGE'
                ? `${discount.value}% OFF`
                : `${formatRupiah(discount.value)} OFF`}
            </span>
            {discount.type === 'PERCENTAGE' && discount.maxDiscountAmount && (
              <span className="text-xs text-[#737373] font-medium">
                (Maks. {formatRupiah(discount.maxDiscountAmount)})
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm text-[#0a0a0a] mt-1 line-clamp-1" title={discount.name}>
            {discount.name}
          </h3>
          {discount.description && (
            <p className="text-xs text-[#737373] mt-0.5 line-clamp-2">
              {discount.description}
            </p>
          )}
        </div>

        {/* Voucher Code & Public tag */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {discount.code ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-[#f5f5f5] border border-[#e5e5e5] text-xs font-mono font-bold text-[#0a0a0a]">
              <Ticket className="w-3.5 h-3.5 text-[#737373]" />
              <span>{discount.code}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="ml-1 text-[#737373] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                title="Salin Kode Promo"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[8px] border border-emerald-200">
              Otomatis Publik (Tanpa Kode)
            </span>
          )}

          {discount.isPublic ? (
            <span className="text-[11px] text-[#737373] bg-[#fafafa] px-2 py-0.5 rounded-[8px] border border-[#e5e5e5]">
              Kupon Publik
            </span>
          ) : (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-[8px] border border-amber-200">
              Kupon Privat
            </span>
          )}
        </div>

        {/* Requirement & Quota Details */}
        <div className="space-y-1.5 text-xs text-[#525252] pt-2 border-t border-[#f0f0f0]">
          <div className="flex items-center justify-between">
            <span className="text-[#737373]">Min. Belanja:</span>
            <span className="font-semibold text-[#0a0a0a]">
              {discount.minOrderAmount > 0 ? formatRupiah(discount.minOrderAmount) : 'Tanpa Minimum'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#737373]">Masa Berlaku:</span>
            <span className="text-[11px] font-mono text-[#404040]">
              {formatDate(discount.startDate)} - {formatDate(discount.endDate)}
            </span>
          </div>

          {/* Quota Progress */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#737373]">Penggunaan Kuota:</span>
              <span className="font-mono font-medium text-[#0a0a0a]">
                {discount.usageCount} {hasLimit ? `/ ${discount.usageLimit}` : 'kali'}
              </span>
            </div>
            {hasLimit && (
              <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    usagePercent >= 90
                      ? 'bg-rose-500'
                      : usagePercent >= 60
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#f0f0f0]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(discount)}
          className="flex-1 text-xs font-semibold h-8.5 rounded-[12px] gap-1.5"
        >
          <Icons.Edit className="w-3.5 h-3.5" />
          <span>Edit</span>
        </Button>

        <Button
          variant={discount.status === 'ACTIVE' ? 'ghost' : 'outline'}
          size="sm"
          disabled={isUpdating}
          onClick={() => onToggleStatus(discount)}
          className={`text-xs font-semibold h-8.5 rounded-[12px] px-3 ${
            discount.status === 'ACTIVE'
              ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
              : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          {discount.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
      </div>
    </div>
  )
}
