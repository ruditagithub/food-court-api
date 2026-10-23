import { useState, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { InternalSidebar } from './InternalSidebar'
import { HeaderProfilePill } from './HeaderProfilePill'
import { FoodCourtContextPill } from './FoodCourtContextPill'
import { SuperAdminRailAside } from './SuperAdminRailAside'
import { SuperAdminHeader } from './SuperAdminHeader'

interface InternalLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  foodCourtName?: string
  stallNumber?: string
  actions?: ReactNode
}

export function InternalLayout({
  children,
  title,
  subtitle,
  foodCourtName,
  stallNumber,
  actions,
}: InternalLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  // Unified Admin Shell (Sticky Aside Rail + Top Header + Bento Canvas)
  if (user?.role === 'admin' || user?.role === 'admin-food-court') {
    return (
      <div className="min-h-screen bg-[#f3f4f6] text-[#0a0a0a] flex flex-col lg:flex-row p-3 sm:p-5 lg:p-6 gap-5">
        {/* Sticky Aside Rail Dock */}
        <SuperAdminRailAside />

        {/* Mobile Drawer Backdrop & Sidebar for small screens */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-64 bg-[#fafafa] shadow-2xl h-full">
              <InternalSidebar onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 space-y-6">
          <SuperAdminHeader
            actions={actions}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            foodCourtName={foodCourtName}
          />

          {(title || subtitle) && (
            <section className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  {title && (
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-[#737373] mt-1">{subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#0a0a0a] text-[#ffffff] font-semibold">
                    {user?.role === 'admin-food-court' ? 'FOOD COURT MANAGER' : 'SUPER ADMIN'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Children View Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex text-[#0a0a0a]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <InternalSidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 bg-[#fafafa] shadow-2xl h-full">
            <InternalSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-[#ffffff] border-b border-[#e5e5e5] px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-[18px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
              aria-label="Buka navigasi"
            />

            {foodCourtName && (
              <FoodCourtContextPill
                foodCourtName={foodCourtName}
                stallNumber={stallNumber}
                className="hidden sm:inline-flex"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            {actions}
            <HeaderProfilePill />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-[#737373] mt-1">{subtitle}</p>
              )}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}
