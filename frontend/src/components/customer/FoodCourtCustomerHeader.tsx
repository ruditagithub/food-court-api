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
      className={`p-4 sm:p-5 rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs flex items-center justify-between gap-3.5 ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-[18px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border border-[#e5e5e5]">
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
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a] truncate leading-tight">
            {foodCourtName || 'Food Court Platform'}
          </h2>
          {foodCourtAddress && (
            <p className="text-xs text-[#737373] truncate mt-0.5">
              {foodCourtAddress}
            </p>
          )}
        </div>
      </div>

      {tableNumber && (
        <div className="shrink-0 flex flex-col items-end">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
            Meja Anda
          </span>
          <span className="mt-0.5 px-3 py-1 rounded-[18px] bg-[#0a0a0a] text-white text-xs font-mono font-bold">
            No. {tableNumber}
          </span>
        </div>
      )}
    </div>
  )
}
