import { useState } from 'react'

interface FoodCourtCustomerHeaderProps {
  foodCourtName?: string
  foodCourtLogo?: string | null
  foodCourtAddress?: string | null
  tableNumber?: string
  className?: string
}

export function FoodCourtCustomerHeader({
  foodCourtName,
  foodCourtLogo,
  foodCourtAddress,
  tableNumber,
  className = '',
}: FoodCourtCustomerHeaderProps) {
  const [logoError, setLogoError] = useState(false)

  return (
    <div
      className={`p-4 sm:p-5 lg:p-6 rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex items-center justify-between gap-3.5 ${className}`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[18px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 overflow-hidden border border-[#e5e5e5]">
          {foodCourtLogo && !logoError ? (
            <img
              src={foodCourtLogo}
              alt={foodCourtName || 'Food Court'}
              className="w-full h-full object-cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            foodCourtName?.slice(0, 2).toUpperCase() || 'FC'
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-[#0a0a0a] truncate leading-tight">
              {foodCourtName || 'Food Court Platform'}
            </h2>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-[10px] bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
              Pemesanan Digital Meja
            </span>
          </div>
          {foodCourtAddress && (
            <p className="text-xs sm:text-sm text-[#737373] truncate mt-0.5">
              {foodCourtAddress}
            </p>
          )}
        </div>
      </div>

      {tableNumber && (
        <div className="shrink-0 flex flex-col items-end">
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#737373]">
            Meja Anda
          </span>
          <span className="mt-0.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-[18px] bg-[#0a0a0a] text-white text-xs sm:text-sm font-mono font-bold shadow-xs">
            No. {tableNumber}
          </span>
        </div>
      )}
    </div>
  )
}
