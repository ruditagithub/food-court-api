import { useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'

export interface TenantDirectoryCardProps {
  tenant: {
    id: string
    name: string
    stallNumber: string
    description?: string | null
    isOpen?: boolean
    logo?: string | null
    logoUrl?: string | null
    coverUrl?: string | null
    category?: string | null
    menuCount?: number
  }
  onSelectTenant: (tenant: any) => void
}

export function TenantDirectoryCard({
  tenant,
  onSelectTenant,
}: TenantDirectoryCardProps) {
  const [imgError, setImgError] = useState(false)
  const isOpen = tenant.isOpen !== false
  const imageSrc = tenant.coverUrl || tenant.logo || tenant.logoUrl

  return (
    <Card
      surface="paper"
      className="overflow-hidden p-0 transition-all duration-200 hover:shadow-md cursor-pointer border border-[#e5e5e5] group rounded-[22px]"
      onClick={() => onSelectTenant(tenant)}
    >
      {/* Banner / Cover */}
      <div className="relative h-28 sm:h-32 w-full bg-[#f0f0f0] overflow-hidden">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={tenant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#171717] to-[#262626] text-white">
            <Icons.Store className="w-9 h-9 opacity-30" />
          </div>
        )}

        {/* Stall Number Badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge variant="solid" className="bg-[#0a0a0a] text-white font-mono text-[11px] shadow-sm">
            Kios {tenant.stallNumber}
          </Badge>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          <Badge
            variant={isOpen ? 'solid' : 'soft'}
            className={
              isOpen
                ? 'bg-[#16a34a] text-white text-[10px] font-semibold shadow-sm'
                : 'bg-[#737373] text-white text-[10px]'
            }
          >
            {isOpen ? 'BUKA' : 'TUTUP'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-[#0a0a0a] truncate group-hover:text-[#2563eb] transition-colors">
              {tenant.name}
            </h3>
            <p className="text-xs text-[#737373] line-clamp-1 mt-0.5">
              {tenant.description || 'Penyedia aneka sajian lezat food court.'}
            </p>
          </div>
        </div>

        {/* Footer meta & CTA */}
        <div className="pt-2 border-t border-[#f0f0f0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#737373]">
            <Icons.Clock className="w-3.5 h-3.5 text-[#a3a3a3]" />
            <span className="text-[11px]">
              {typeof tenant.menuCount === 'number' && tenant.menuCount > 0
                ? `${tenant.menuCount} Menu • ~10-15 mnt`
                : 'Saji ~10-15 mnt'}
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-xs px-2.5 font-bold gap-1 group-hover:bg-[#0a0a0a] group-hover:text-white transition-all rounded-[14px]"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTenant(tenant)
            }}
          >
            <span>Pilih Stan</span>
            <Icons.ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
