import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Button } from '../ui/Button'
import { IconArrowRight } from '../ui/Icons'

export function CtaBanner() {
  const bannerRef = useScrollReveal<HTMLElement>({ y: 30 })

  return (
    <section ref={bannerRef} className="py-16 sm:py-20 bg-[#ffffff] border-b border-[#e5e5e5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div data-reveal className="bg-[#f5f5f5] rounded-[24px] p-6 sm:p-12 border border-[#e5e5e5] text-center max-w-4xl mx-auto shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-3">
            DIGITALISASI AMICI FOOD COURT
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl text-[#0a0a0a] tracking-[-0.04em] mb-4 max-w-2xl mx-auto font-semibold">
            Tingkatkan kepuasan pengunjung dan kecepatan dapur mulai hari ini.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] max-w-xl mx-auto mb-6 leading-relaxed">
            Gabungkan kemudahan scan QR mandiri, dapur terkoordinasi rapi, dan laporan keuangan transparan dalam satu sistem operasi Amici Food Court terpadu.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#simulator">
              <Button variant="primary" size="lg">
                Uji Coba Demo
                <IconArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <a href="/login">
              <Button variant="outline" size="lg">
                Masuk ke Portal Internal
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
