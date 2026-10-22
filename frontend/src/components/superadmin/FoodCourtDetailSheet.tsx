import { useState, useEffect } from 'react'
import { apiFetch, getToken } from '../../api/client'
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
  SheetClose,
} from '../ui/Sheet'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'

interface FoodCourtDetailSheetProps {
  foodCourtId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (foodCourt: any) => void
}

export function FoodCourtDetailSheet({
  foodCourtId,
  open,
  onOpenChange,
  onEdit,
}: FoodCourtDetailSheetProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'tenants' | 'tables'>('tenants')

  useEffect(() => {
    if (!open || !foodCourtId) {
      setData(null)
      return
    }

    const fetchDetail = async () => {
      setIsLoading(true)
      try {
        const token = getToken()
        const res = await apiFetch<{ data: any }>(`/api/food-courts/${foodCourtId}`, {
          token: token || undefined,
        })
        setData(res.data)
      } catch (err) {
        console.error('Failed to fetch food court detail:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetail()
  }, [open, foodCourtId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader>
        <div className="flex items-center justify-between">
          <SheetTitle>Rincian Cabang Food Court</SheetTitle>
          <SheetClose onClick={() => onOpenChange(false)} />
        </div>
        <SheetDescription>
          Informasi manajer, daftar tenant aktif, dan konfigurasi meja cabang
        </SheetDescription>
      </SheetHeader>

      <SheetContent>
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Icons.Refresh className="w-6 h-6 animate-spin text-[#737373]" />
            <p className="text-xs text-[#737373]">Memuat data cabang...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-sm text-[#737373]">
            Data cabang tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Header info */}
            <div className="flex items-start gap-3.5 pb-5 border-b border-[#e5e5e5]">
              <div className="w-12 h-12 rounded-[18px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-lg shrink-0">
                {data.logo ? (
                  <img
                    src={data.logo}
                    alt={data.name}
                    className="w-full h-full object-cover rounded-[18px]"
                  />
                ) : (
                  data.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-[#0a0a0a] leading-tight">
                    {data.name}
                  </h4>
                  <Badge variant={data.status === 'ACTIVE' ? 'solid' : 'soft'}>
                    {data.status}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-[#737373] mt-1">/{data.slug}</p>
                {data.address && (
                  <p className="text-xs text-[#737373] mt-1.5 line-clamp-2">
                    📍 {data.address}
                  </p>
                )}
                {data.phone && (
                  <p className="text-xs text-[#737373] mt-0.5">
                    📞 {data.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Manager Card */}
            <div className="p-3.5 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#737373] mb-1">
                Manajer Penanggung Jawab
              </div>
              {data.manager ? (
                <div>
                  <p className="text-sm font-semibold text-[#0a0a0a]">{data.manager.name}</p>
                  <p className="text-xs text-[#737373]">{data.manager.email}</p>
                </div>
              ) : (
                <p className="text-xs text-[#737373] italic">Belum ada manajer yang ditugaskan</p>
              )}
            </div>

            {/* Quick counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-[18px] bg-[#f5f5f5] text-center">
                <span className="text-xl font-bold text-[#0a0a0a]">
                  {data.tenants?.length || 0}
                </span>
                <p className="text-[11px] font-mono uppercase text-[#737373] mt-0.5">
                  Stan Tenant
                </p>
              </div>
              <div className="p-3 rounded-[18px] bg-[#f5f5f5] text-center">
                <span className="text-xl font-bold text-[#0a0a0a]">
                  {data.tables?.length || 0}
                </span>
                <p className="text-[11px] font-mono uppercase text-[#737373] mt-0.5">
                  Meja Makan
                </p>
              </div>
            </div>

            {/* Tabs selector */}
            <div className="border-b border-[#e5e5e5] flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('tenants')}
                className={`pb-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === 'tenants'
                    ? 'border-[#0a0a0a] text-[#0a0a0a]'
                    : 'border-transparent text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                Daftar Tenant ({data.tenants?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tables')}
                className={`pb-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === 'tables'
                    ? 'border-[#0a0a0a] text-[#0a0a0a]'
                    : 'border-transparent text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                Daftar Meja ({data.tables?.length || 0})
              </button>
            </div>

            {/* Tab contents */}
            {activeTab === 'tenants' && (
              <div className="space-y-2">
                {(!data.tenants || data.tenants.length === 0) ? (
                  <p className="text-xs text-[#737373] py-4 text-center">
                    Belum ada stan tenant di cabang ini.
                  </p>
                ) : (
                  data.tenants.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-[18px] bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#0a0a0a]">{t.name}</p>
                        <p className="font-mono text-[#737373] text-[11px]">
                          Stan: {t.stallNumber}
                        </p>
                      </div>
                      <Badge variant={t.isOpen ? 'solid' : 'soft'}>
                        {t.isOpen ? 'BUKA' : 'TUTUP'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'tables' && (
              <div className="space-y-2">
                {(!data.tables || data.tables.length === 0) ? (
                  <p className="text-xs text-[#737373] py-4 text-center">
                    Belum ada meja makan terdaftar di cabang ini.
                  </p>
                ) : (
                  data.tables.map((table: any) => (
                    <div
                      key={table.id}
                      className="p-3 rounded-[18px] bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#0a0a0a]">
                          Meja {table.tableNumber}
                        </p>
                        <p className="text-[#737373] text-[11px]">
                          Kapasitas: {table.capacity} Orang
                        </p>
                      </div>
                      <Badge variant={table.status === 'available' ? 'solid' : 'soft'}>
                        {table.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {onEdit && (
              <div className="pt-4 border-t border-[#e5e5e5]">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(data)
                  }}
                >
                  <Icons.Edit className="w-4 h-4 mr-2" />
                  Edit Data Cabang
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
