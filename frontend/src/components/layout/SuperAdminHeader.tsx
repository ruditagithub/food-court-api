import { useState, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Building,
  ChevronDown,
  Check,
  Search,
  Bell,
  Info,
  Menu,
} from 'lucide-react'
import { HeaderProfilePill } from './HeaderProfilePill'
import { apiFetch, getToken } from '../../api/client'

interface SuperAdminHeaderProps {
  actions?: ReactNode
  onOpenMobileMenu?: () => void
  foodCourtName?: string
  selectedBranchId?: string
  onBranchChange?: (branchId: string) => void
}

export function SuperAdminHeader({
  actions,
  onOpenMobileMenu,
  foodCourtName,
  selectedBranchId: externalSelectedBranchId,
  onBranchChange,
}: SuperAdminHeaderProps) {
  const [foodCourts, setFoodCourts] = useState<any[]>([])
  const [internalBranchId, setInternalBranchId] = useState<string>('all')
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)

  const selectedBranchId = externalSelectedBranchId ?? internalBranchId

  const handleSelectBranch = (branchId: string) => {
    if (onBranchChange) {
      onBranchChange(branchId)
    } else {
      setInternalBranchId(branchId)
    }
    setIsBranchDropdownOpen(false)
  }

  useEffect(() => {
    async function loadFoodCourts() {
      try {
        const token = getToken()
        const res = await apiFetch<{ data: any[] }>('/api/food-courts', {
          token: token || undefined,
        })
        if (res?.data) {
          setFoodCourts(res.data)
        }
      } catch (err) {
        console.warn('Failed to fetch food courts for header dropdown:', err)
      }
    }
    loadFoodCourts()
  }, [])

  const activeFoodCourt =
    selectedBranchId === 'all'
      ? null
      : foodCourts.find((fc) => fc.id === selectedBranchId)

  const activeDisplayName =
    foodCourtName ||
    activeFoodCourt?.name ||
    (selectedBranchId === 'all'
      ? 'Semua Cabang (Global)'
      : foodCourts?.[0]?.name ?? 'Amici Food Court Grand City')

  return (
    <header className="flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand Logo, Name & Branch Selector */}
      <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
        {/* Mobile menu hamburger toggle */}
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-[14px] bg-[#ffffff] border border-[#e5e5e5] text-[#737373] hover:text-[#0a0a0a] shadow-xs cursor-pointer"
            aria-label="Buka Navigasi"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <Link to="/app/dashboard" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-[14px] bg-[#10b981] text-white flex items-center justify-center shadow-sm">
            <span className="font-heading font-black text-lg tracking-tight">FC</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-xl tracking-tight text-[#0a0a0a]">
              Amici Food Court
            </span>
            <span className="text-[10px] font-mono text-[#737373] leading-none">
              Super Admin Management
            </span>
          </div>
        </Link>

        {/* Interactive Branch Filter Dropdown */}
        <div className="relative ml-1 sm:ml-2">
          <button
            type="button"
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-xs font-semibold text-[#0a0a0a] transition-all shadow-xs cursor-pointer"
          >
            <Building className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="truncate max-w-[150px] sm:max-w-[200px]">
              {selectedBranchId === 'all' ? 'Semua Cabang (Global)' : activeDisplayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#737373]" />
          </button>

          {isBranchDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-[20px] bg-[#ffffff] border border-[#e5e5e5] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 text-[10px] font-mono uppercase text-[#737373] tracking-wider border-b border-[#f0f0f0] flex items-center justify-between">
                <span>Filter Cabang</span>
                <span className="text-[9px] bg-[#f5f5f5] px-1.5 py-0.5 rounded-md text-[#0a0a0a] font-bold">
                  {foodCourts.length || 1} Cabang
                </span>
              </div>
              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectBranch('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[14px] text-xs font-medium text-left transition-colors cursor-pointer ${
                    selectedBranchId === 'all'
                      ? 'bg-[#0a0a0a] text-white font-semibold'
                      : 'text-[#0a0a0a] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <span className="truncate">Semua Cabang (Global)</span>
                  {selectedBranchId === 'all' && <Check className="w-3.5 h-3.5 text-[#a3e635]" />}
                </button>
                {foodCourts.map((fc) => (
                  <button
                    key={fc.id}
                    type="button"
                    onClick={() => handleSelectBranch(fc.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[14px] text-xs font-medium text-left transition-colors cursor-pointer ${
                      selectedBranchId === fc.id
                        ? 'bg-[#0a0a0a] text-white font-semibold'
                        : 'text-[#0a0a0a] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    <span className="truncate">{fc.name}</span>
                    {selectedBranchId === fc.id && <Check className="w-3.5 h-3.5 text-[#a3e635]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Action Cluster & Page Custom Actions */}
      <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
        {actions}

        <button
          type="button"
          className="w-10 h-10 rounded-full bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-center text-[#737373] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition-all shadow-xs cursor-pointer"
          title="Cari Pesanan, Tenant, atau Cabang"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          className="relative w-10 h-10 rounded-full bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-center text-[#737373] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition-all shadow-xs cursor-pointer"
          title="Notifikasi Masuk"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#e7000b] ring-2 ring-white" />
        </button>

        <button
          type="button"
          onClick={() => alert('Status Koneksi Gateway Midtrans: Aktif (Sandbox / Production)')}
          className="w-10 h-10 rounded-full bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-center text-[#737373] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition-all shadow-xs cursor-pointer"
          title="Status Integrasi Midtrans"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* User Profile Pill */}
        <HeaderProfilePill />
      </div>
    </header>
  )
}
