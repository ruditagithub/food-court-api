import { useScrollReveal } from '../../hooks/useScrollReveal'

export function SocialProofBand() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 25, stagger: 0.12 })

  const metrics = [
    { value: '0 Antrean', label: 'Kasir manual dieliminasi dengan self-checkout QRIS' },
    { value: '< 3 Detik', label: 'Waktu buka katalog menu QR di browser ponsel tanpa install' },
    { value: '100% Akurat', label: 'Pesanan terdistribusi langsung ke KDS dapur tiap tenant' },
    { value: '+35%', label: 'Peningkatan kecepatan perputaran meja (table turnover)' },
  ]

  const partnerLogos = [
    'AMICI DINING COMMONS',
    'GRAND KULINER ARCADE',
    'PUJASERA NUSANTARA',
    'URBAN FOOD PARK',
    'THE HUB EATERY'
  ]

  return (
    <section ref={sectionRef} className="py-12 sm:py-16 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Metric Cards Grid — Stat Block from DESIGN.md */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12">
          {metrics.map((item, idx) => (
            <div key={idx} data-reveal className="border-l border-[#e5e5e5] pl-5">
              <div className="font-heading text-2xl sm:text-3xl lg:text-4xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
                {item.value}
              </div>
              <p className="text-xs text-[#737373] mt-1.5 leading-relaxed">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Grayscale Brands */}
        <div data-reveal className="pt-8 border-t border-[#e5e5e5]">
          <div className="text-center mb-5">
            <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider">
              Dipercaya oleh Pengelola Amici Food Court & Sentra Kuliner Modern
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-40 grayscale">
            {partnerLogos.map((brand, idx) => (
              <span key={idx} className="font-mono text-xs font-semibold tracking-wider text-[#0a0a0a]">
                {brand}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
