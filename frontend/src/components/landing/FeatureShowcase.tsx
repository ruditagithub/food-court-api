import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Badge } from '../ui/Badge'
import { IconCheck } from '../ui/Icons'

export function FeatureShowcase() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })
  const [activeRole, setActiveRole] = useState<'customer' | 'tenant' | 'admin'>('customer')

  const roleData = {
    customer: {
      tag: 'PELANGGAN / PENGUNJUNG',
      title: 'Pesan tanpa unduh aplikasi, tanpa antre kasir.',
      desc: 'Pengunjung cukup memindai QR code di meja untuk mengakses seluruh katalog kuliner food court secara bersamaan.',
      bullets: [
        'Katalog menu gabungan seluruh tenant dalam satu antarmuka web',
        'Keranjang belanja multi-kios dengan pemecahan item otomatis',
        'Pembayaran mandiri aman via QRIS, GoPay, OVO, ShopeePay & VA',
        'Pelacakan status pesanan real-time tanpa perlu registrasi akun',
        'Fitur catatan khusus (misal: "tanpa gula", "ekstra pedas") per item'
      ],
      previewBadge: 'Web App (Zero-Install)',
      metric: '< 10 detik',
      metricLabel: 'Waktu dari scan hingga checkout pertama'
    },
    tenant: {
      tag: 'TENANT / KIOS KULINER',
      title: 'Layar dapur digital (KDS) & kontrol stok presisi.',
      desc: 'Tenant hanya fokus memasak makanan lezat. Pesanan masuk secara visual dengan tiket waktu dan catatan koki.',
      bullets: [
        'Kitchen Display System (KDS) khusus untuk tiap gerai kios',
        'Tiket pesanan otomatis berurutan berdasarkan waktu masuk',
        'Tandai stok habis dalam satu ketukan agar tidak bisa dipesan',
        'Notifikasi audio saat pesanan baru masuk di dapur',
        'Laporan penjualan harian milik kios sendiri'
      ],
      previewBadge: 'KDS & Menu Management',
      metric: '0 Tiket Hilang',
      metricLabel: 'Semua pesanan tercatat di layar dapur'
    },
    admin: {
      tag: 'PENGELOLA AMICI FOOD COURT',
      title: 'Transparansi omzet, meja, dan bagi hasil tenant.',
      desc: 'Pusat komando terpadu untuk pemilik sentra kuliner, mall, dan pengelola area komunal.',
      bullets: [
        'Generator QR code meja dinamis dengan format siap cetak',
        'Pendaftaran dan manajemen akun pemilik kios dalam hitungan detik',
        'Rekonsiliasi transaksi harian dan otomatisasi bagi hasil/komisi',
        'Monitoring kapasitas meja dan kecepatan penyajian tenant',
        'Hak akses bertingkat: Super Admin dan Admin Food Court'
      ],
      previewBadge: 'Pusat Kontrol Terpadu',
      metric: '100% Real-Time',
      metricLabel: 'Laporan keuangan terintegrasi otomatis'
    }
  }

  const current = roleData[activeRole]

  return (
    <section id="fitur" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-2">
              SOLUSI LENGKAP 3 PIHAK
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
              Dirancang untuk kenyamanan bersama.
            </h2>
          </div>

          {/* 18px Radius Role Switcher */}
          <div className="inline-flex rounded-[18px] bg-[#f5f5f5] p-1 border border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setActiveRole('customer')}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                activeRole === 'customer'
                  ? 'bg-[#0a0a0a] text-[#fafafa]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Pelanggan
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('tenant')}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                activeRole === 'tenant'
                  ? 'bg-[#0a0a0a] text-[#fafafa]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Tenant
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                activeRole === 'admin'
                  ? 'bg-[#0a0a0a] text-[#fafafa]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Pengelola
            </button>
          </div>
        </div>

        {/* 24px Container Card */}
        <div data-reveal className="bg-[#f5f5f5] rounded-[24px] p-6 sm:p-8 border border-[#e5e5e5] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Details */}
          <div className="lg:col-span-7 space-y-4">
            <Badge variant="soft">{current.tag}</Badge>

            <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a] font-semibold">
              {current.title}
            </h3>

            <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
              {current.desc}
            </p>

            <div className="space-y-2 pt-1">
              {current.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#0a0a0a]">
                  <span className="mt-0.5 p-0.5 rounded-[6px] bg-[#0a0a0a] text-white shrink-0">
                    <IconCheck className="w-3 h-3" />
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#e5e5e5] flex items-center gap-6">
              <div>
                <div className="font-heading text-xl sm:text-2xl text-[#0a0a0a] font-semibold">{current.metric}</div>
                <div className="text-[11px] text-[#737373] font-mono">{current.metricLabel}</div>
              </div>
            </div>
          </div>

          {/* Visual Panel */}
          <div className="lg:col-span-5 bg-[#ffffff] rounded-[20px] p-5 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <span className="text-xs font-mono text-[#737373]">{current.previewBadge}</span>
              <span className="w-2 h-2 rounded-full bg-[#e7000b]" />
            </div>

            <div className="py-4 space-y-3">
              {activeRole === 'customer' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs">
                    <div className="text-[#737373]">Meja Terdeteksi</div>
                    <div className="font-mono font-medium text-xs text-[#0a0a0a]">Meja VIP-08 (Outdoor)</div>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between items-center">
                    <div>
                      <div className="font-medium text-[#0a0a0a]">Sate Ayam Madura (10 tusuk)</div>
                      <div className="text-[#737373] text-[11px]">Kios Sate Pak Kumis</div>
                    </div>
                    <div className="font-mono text-[#0a0a0a]">Rp 35.000</div>
                  </div>
                  <div className="p-2.5 rounded-[18px] bg-[#0a0a0a] text-white text-xs text-center font-medium">
                    Bayar QRIS Instant Rp 35.000
                  </div>
                </div>
              )}

              {activeRole === 'tenant' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between">
                    <span className="font-mono font-medium text-[#0a0a0a]">STATUS KIOS</span>
                    <span className="text-[#0a0a0a] font-mono font-medium">● BUKA & MENERIMA PESANAN</span>
                  </div>
                  <div className="p-2.5 rounded-[10px] border border-[#e5e5e5] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-semibold text-[#0a0a0a]">TIKET #104 (Meja 08)</span>
                      <span className="px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] font-mono text-[10px] border border-[#e5e5e5]">
                        BARU MASUK
                      </span>
                    </div>
                    <div className="text-[#737373]">1x Sate Ayam Madura (Bumbu dipisah)</div>
                  </div>
                </div>
              )}

              {activeRole === 'admin' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between">
                    <span className="text-[#737373]">Total Tenant Terdaftar</span>
                    <span className="font-mono font-medium text-[#0a0a0a]">14 Kios Aktif</span>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between">
                    <span className="text-[#737373]">Total Meja Terhubung</span>
                    <span className="font-mono font-medium text-[#0a0a0a]">40 Meja QR</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
