export function Footer() {
  return (
    <footer className="py-10 bg-[#f5f5f5] text-[#737373] text-xs">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-8 border-b border-[#e5e5e5]">
          <div className="md:col-span-2 space-y-2">
            <div className="font-heading text-lg text-[#0a0a0a] font-semibold tracking-tight">
              amici<span className="text-[#e7000b]">.</span>os
            </div>
            <p className="text-xs text-[#737373] max-w-sm leading-relaxed">
              Platform sistem operasi SaaS multi-tenant untuk Amici Food Court, pusat kuliner, dan pujasera modern di Indonesia.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-[#0a0a0a] pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Elysia Core API: Operasional
            </div>
          </div>

          <div>
            <div className="font-mono text-xs text-[#0a0a0a] uppercase font-semibold mb-2.5">Navigasi</div>
            <ul className="space-y-1.5">
              <li><a href="#fitur" className="hover:text-[#0a0a0a] transition-colors">Fitur</a></li>
              <li><a href="#cara-kerja" className="hover:text-[#0a0a0a] transition-colors">Cara Kerja</a></li>
              <li><a href="#simulator" className="hover:text-[#0a0a0a] transition-colors">Simulasi Live</a></li>
              <li><a href="#kalkulator" className="hover:text-[#0a0a0a] transition-colors">Kalkulator ROI</a></li>
              <li><a href="#harga" className="hover:text-[#0a0a0a] transition-colors">Paket Harga</a></li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs text-[#0a0a0a] uppercase font-semibold mb-2.5">Akses Sistem</div>
            <ul className="space-y-1.5">
              <li><a href="/login" className="hover:text-[#0a0a0a] transition-colors">Portal Admin & Tenant</a></li>
              <li><a href="http://localhost:3000/swagger" target="_blank" rel="noreferrer" className="hover:text-[#0a0a0a] transition-colors">Dokumentasi API</a></li>
              <li><a href="#faq" className="hover:text-[#0a0a0a] transition-colors">Bantuan & FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#737373]">
          <div>
            © {new Date().getFullYear()} Amici Food Court OS. Monochromatic Developer Architecture.
          </div>
          <div className="flex gap-4 text-xs">
            <a href="#" className="hover:text-[#0a0a0a]">Privasi</a>
            <a href="#" className="hover:text-[#0a0a0a]">Ketentuan</a>
            <a href="#" className="hover:text-[#0a0a0a]">Keamanan</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
