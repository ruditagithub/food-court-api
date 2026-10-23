import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Badge } from '../ui/Badge'

export function FaqSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.1 })
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      q: 'Apakah pengunjung harus mendownload aplikasi dari Play Store / App Store?',
      a: 'Tidak. Pengunjung hanya perlu memindai QR code di meja menggunakan kamera ponsel biasa. Menu seluruh tenant akan terbuka instan di browser web tanpa instalasi aplikasi.'
    },
    {
      q: 'Bagaimana pembagian uang pesanan (payout) jika pelanggan memesan dari beberapa kios sekaligus?',
      a: 'Semua pembayaran diproses melalui payment gateway terpadu (Midtrans). Sistem backend Amici OS secara otomatis memetakan sub-order ke masing-masing tenant dan mencatat laporan bagi hasil bersih secara akurat.'
    },
    {
      q: 'Apakah tenant membutuhkan perangkat atau tablet khusus untuk dapur?',
      a: 'Tidak. Layar Kitchen Display System (KDS) dapat diakses melalui browser di tablet Android/iPad apa pun, laptop, atau ponsel milik koki.'
    },
    {
      q: 'Bagaimana jika salah satu menu di kios habis di tengah hari?',
      a: 'Tenant cukup mengetuk tombol toggle pada aplikasi kios miliknya. Menu akan otomatis berstatus OUT OF STOCK dan tidak dapat dipilih oleh pelanggan secara real-time.'
    },
    {
      q: 'Bagaimana jika QR code di meja rusak atau kotor?',
      a: 'Pengelola Amici Food Court dapat men-generate ulang token QR code meja kapan saja melalui dashboard internal dan langsung mencetak stiker QR baru.'
    }
  ]

  return (
    <section id="faq" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <Badge variant="soft" className="mb-2">
            PERTANYAAN UMUM
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Hal yang sering ditanyakan seputar Amici Food Court.
          </h2>
        </div>

        {/* Accordion List */}
        <div className="max-w-3xl space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                data-reveal
                className="bg-[#ffffff] rounded-[18px] border border-[#e5e5e5] overflow-hidden transition-all shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
                >
                  <span className="font-heading text-sm sm:text-base text-[#0a0a0a] font-medium">{faq.q}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-[#737373] leading-relaxed border-t border-[#e5e5e5] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
