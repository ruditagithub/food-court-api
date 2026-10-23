import { useScrollReveal } from '../../hooks/useScrollReveal'

export function ArchitectureSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.1 })

  const specs = [
    {
      title: 'ElysiaJS + Bun High-Throughput Core',
      desc: 'Pemrosesan pesanan dalam sub-milidetik, siap menangani lonjakan pesanan jam makan siang tanpa lag.',
      tag: 'Backend Core'
    },
    {
      title: 'Midtrans Self-Checkout Integration',
      desc: 'Mendukung QRIS, GoPay, OVO, ShopeePay, dan transfer bank otomatis dengan verifikasi instan tanpa kasir fisik.',
      tag: 'Payments'
    },
    {
      title: 'Sub-Order Distribution Engine',
      desc: 'Otomatisasi pemecahan keranjang belanja multi-tenant menjadi sub-order mandiri yang langsung sinkron ke KDS kios.',
      tag: 'Multi-Tenant'
    },
    {
      title: 'Real-Time KDS Kitchen Polling',
      desc: 'Sistem polling efisien dan ringan yang menjaga layar dapur selalu terhubung tanpa membebani browser di tablet.',
      tag: 'Real-Time Sync'
    }
  ]

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-2">
            ARSITEKTUR & KEANDALAN TEKNIS
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Teknologi tangguh untuk jam sibuk tanpa kendala.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
            Didesain dari nol untuk keandalan operasional tingkat enterprise dengan performa tinggi dan nol toleransi pesanan hilang.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {specs.map((spec, idx) => {
            return (
              <div
                key={idx}
                data-reveal
                className="bg-[#ffffff] rounded-[24px] p-5 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5]">
                      {spec.tag}
                    </span>
                  </div>
                  <h3 className="font-heading text-base text-[#0a0a0a] mb-1.5 font-semibold">
                    {spec.title}
                  </h3>
                  <p className="text-xs text-[#737373] leading-relaxed">
                    {spec.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
