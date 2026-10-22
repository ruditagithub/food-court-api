import { Icons } from '../ui/Icons'

interface FoodCourtContextPillProps {
  foodCourtName?: string
  stallNumber?: string
  className?: string
}

export function FoodCourtContextPill({
  foodCourtName,
  stallNumber,
  className = '',
}: FoodCourtContextPillProps) {
  if (!foodCourtName) return null

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[18px] bg-[#ffffff] border border-[#e5e5e5] text-xs shadow-xs ${className}`}
    >
      <Icons.Building className="w-3.5 h-3.5 text-[#737373] shrink-0" />
      <span className="font-semibold text-[#0a0a0a] truncate max-w-[180px] sm:max-w-[240px]">
        {foodCourtName}
      </span>
      {stallNumber && (
        <>
          <span className="text-[#e5e5e5]">•</span>
          <span className="font-mono text-[#737373] font-medium">{stallNumber}</span>
        </>
      )}
    </div>
  )
}
