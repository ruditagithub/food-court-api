import { useState } from 'react'
import { Button } from '../ui/Button'
import { IconArrowRight } from '../ui/Icons'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[#f5f5f5]/90 backdrop-blur-md border-b border-[#e5e5e5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2 group">
            <span className="font-heading text-xl tracking-[-0.04em] font-semibold text-[#0a0a0a]">
              amici<span className="text-[#e7000b]">.</span>os
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#ffffff] text-[#737373] border border-[#e5e5e5]">
              Amici Food Court
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-[#737373]">
            <a href="#fitur" className="hover:text-[#0a0a0a] transition-colors">Fitur</a>
            <a href="#cara-kerja" className="hover:text-[#0a0a0a] transition-colors">Cara Kerja</a>
            <a href="#simulator" className="hover:text-[#0a0a0a] transition-colors">Simulasi Live</a>
            <a href="#kalkulator" className="hover:text-[#0a0a0a] transition-colors">Kalkulator ROI</a>
            <a href="#harga" className="hover:text-[#0a0a0a] transition-colors">Harga</a>
            <a href="#faq" className="hover:text-[#0a0a0a] transition-colors">FAQ</a>
          </nav>
        </div>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <a href="/login">
            <Button variant="secondary" size="sm">
              Masuk Internal
            </Button>
          </a>
          <a href="#simulator">
            <Button variant="primary" size="sm">
              Coba Demo
              <IconArrowRight className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#737373] hover:text-[#0a0a0a] rounded-[6px]"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#e5e5e5] bg-[#ffffff] px-4 pt-3 pb-5 space-y-3">
          <nav className="flex flex-col space-y-2.5 text-xs text-[#737373]">
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="py-1">Fitur</a>
            <a href="#cara-kerja" onClick={() => setMobileMenuOpen(false)} className="py-1">Cara Kerja</a>
            <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="py-1">Simulasi Live</a>
            <a href="#kalkulator" onClick={() => setMobileMenuOpen(false)} className="py-1">Kalkulator ROI</a>
            <a href="#harga" onClick={() => setMobileMenuOpen(false)} className="py-1">Harga</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1">FAQ</a>
          </nav>
          <div className="pt-3 border-t border-[#e5e5e5] flex flex-col gap-2">
            <a href="/login" className="w-full">
              <Button variant="secondary" size="md" className="w-full">Masuk Internal</Button>
            </a>
            <a href="#simulator" className="w-full">
              <Button variant="primary" size="md" className="w-full">Coba Demo</Button>
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
