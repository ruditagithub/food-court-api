import { useScrollReveal } from '../../hooks/useScrollReveal'
import { IconQrCode, IconMobile, IconKitchen, IconArrowRight } from '../ui/Icons'

export function WorkflowSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.15 })

  const steps = [
    {
      number: '01',
      title: 'Scan QR di Meja',
      description: 'Pengunjung duduk di meja mana pun dan memindai QR code dengan kamera ponsel. Menu seluruh tenant langsung terbuka di browser tanpa download aplikasi.',
      icon: IconQrCode,
      tag: 'Customer Flow'
    },
    {
      number: '02',
      title: 'Pesan Multi-Kios & 1x Bayar',
      description: 'Pilih kopi dari Tenant A dan makanan dari Tenant B dalam 1 keranjang bersama. Bayar sekali lewat QRIS atau e-wallet via Midtrans.',
      icon: IconMobile,
      tag: 'Unified Checkout'
    },
    {
      number: '03',
      title: 'Routing Otomatis ke KDS',
      description: 'Pesanan dipecah otomatis ke layar dapur (KDS) masing-masing kios. Koki memasak, menekan selesai, dan pembeli menerima notifikasi siap ambil.',
      icon: IconKitchen,
      tag: 'Kitchen Sync'
    }
  ]

  return (
    <section id="cara-kerja" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-2">
            ALUR KERJA OPERASIONAL
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Dari meja makan hingga meja saji dalam 3 langkah.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2.5 leading-relaxed">
            Eliminasi kertas nota hilang, hilangkan antrean berdiri di kasir sentral, dan sinkronkan dapur tenant secara otomatis.
          </p>
        </div>

        {/* 3 Columns Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div
                key={idx}
                data-reveal
                className="bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col justify-between hover:border-[#0a0a0a]/30 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-heading text-3xl text-[#737373] font-semibold">{step.number}</span>
                    <span className="p-2.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a]">
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>

                  <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5] mb-2.5">
                    {step.tag}
                  </span>

                  <h3 className="font-heading text-lg text-[#0a0a0a] mb-2 font-semibold">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#e5e5e5] flex items-center text-xs font-medium text-[#0a0a0a] gap-1">
                  Selengkapnya <IconArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
