import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

export function PricingSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })
  const [isAnnual, setIsAnnual] = useState(true)

  const plans = [
    {
      name: 'Starter Hub',
      desc: 'Cocok untuk food court mandiri atau pujasera komunitas kecil hingga 10 tenant.',
      monthlyPrice: 450000,
      annualPrice: 360000,
      features: [
        'Hingga 10 Tenant / Kios Kuliner',
        'Hingga 25 Meja dengan QR Code Dinamis',
        'Akses App Customer Mobile Web (No Install)',
        'Layar KDS Dapur untuk setiap Tenant',
        'Pembayaran Terintegrasi QRIS & Midtrans',
        'Laporan Penjualan Dasar (Harian)'
      ],
      ctaText: 'Pilih Starter Hub',
      highlighted: false
    },
    {
      name: 'Pro Sentra',
      desc: 'Pilihan terfavorit untuk sentra kuliner modern dan area komunal komersial ramai.',
      monthlyPrice: 950000,
      annualPrice: 760000,
      features: [
        'Hingga 30 Tenant / Kios Kuliner',
        'Hingga 80 Meja dengan Cetak QR Massal',
        'Fitur Pemesanan Multi-Tenant Tanpa Batas',
        'Layar KDS Dapur Real-Time dengan Audio Alert',
        'Manajemen Komisi & Payout Tenant Otomatis',
        'Analisis Okupansi Meja & Jam Sibuk',
        'Dukungan Prioritas 7 Hari Seminggu'
      ],
      ctaText: 'Mulai Uji Coba Pro',
      highlighted: true
    },
    {
      name: 'Enterprise Mall',
      desc: 'Untuk operator mall besar, airport lounge, atau grup multi-lokasi food court.',
      monthlyPrice: 2200000,
      annualPrice: 1760000,
      features: [
        'Unlimited Tenant & Kios Kuliner',
        'Unlimited Meja & Lokasi Food Court',
        'Multi-Lokasi dalam Satu Akun Super Admin',
        'Dedicated Server & Custom Domain',
        'Integrasi Akuntansi & Custom ERP API',
        'SLA Keandalan 99.9% & On-site Support'
      ],
      ctaText: 'Hubungi Tim Enterprise',
      highlighted: false
    }
  ]

  return (
    <section id="harga" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="soft" className="mb-2">
            PAKET LANGGANAN
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Paket transparan sesuai skala sentra kuliner Anda.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2">
            Tanpa biaya tersembunyi. Mulai digitalisasi Amici Food Court tanpa investasi mesin kasir mahal.
          </p>

          {/* 18px Billing Switcher */}
          <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                !isAnnual ? 'bg-[#0a0a0a] text-[#fafafa]' : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all flex items-center gap-1.5 ${
                isAnnual ? 'bg-[#0a0a0a] text-[#fafafa]' : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Tahunan
              <span className="text-[10px] bg-[#ffffff] text-[#0a0a0a] px-1.5 py-0.2 rounded-[18px] border border-[#e5e5e5]">Hemat 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, idx) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice

            return (
              <div
                key={idx}
                data-reveal
                className={`rounded-[24px] p-6 flex flex-col justify-between transition-all ${
                  plan.highlighted
                    ? 'bg-[#ffffff] border-2 border-[#0a0a0a] shadow-md relative'
                    : 'bg-[#ffffff] border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-[18px] bg-[#0a0a0a] text-[#fafafa]">
                      REKOMENDASI UTAMA
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="font-heading text-xl text-[#0a0a0a] mb-1 font-semibold">{plan.name}</h3>
                  <p className="text-xs text-[#737373] leading-relaxed mb-5">{plan.desc}</p>

                  <div className="mb-5 pb-5 border-b border-[#e5e5e5]">
                    <div className="font-heading text-3xl text-[#0a0a0a] font-semibold">
                      Rp {price.toLocaleString('id-ID')}
                      <span className="text-xs font-mono font-normal text-[#737373]"> / bln</span>
                    </div>
                    <div className="text-[11px] text-[#737373] font-mono mt-0.5">
                      {isAnnual ? 'Ditagih tahunan' : 'Ditagih setiap bulan'}
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="text-xs text-[#0a0a0a]">
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  size="md"
                  className="w-full"
                >
                  {plan.ctaText}
                </Button>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
