import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { IconArrowRight, IconCheck } from '../ui/Icons'

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<'customer' | 'kds' | 'admin'>('customer')
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('[data-hero-tag]', {
        opacity: 0,
        y: 15,
        duration: 0.5,
        delay: 0.15
      })
      .from('[data-hero-title]', {
        opacity: 0,
        y: 25,
        duration: 0.7
      }, '-=0.35')
      .from('[data-hero-desc]', {
        opacity: 0,
        y: 20,
        duration: 0.6
      }, '-=0.45')
      .from('[data-hero-cta]', {
        opacity: 0,
        y: 15,
        stagger: 0.08,
        duration: 0.5
      }, '-=0.4')
      .from('[data-hero-summary]', {
        opacity: 0,
        x: 20,
        duration: 0.7
      }, '-=0.5')
      .from('[data-hero-mockup]', {
        opacity: 0,
        y: 30,
        duration: 0.8
      }, '-=0.4')
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={heroRef} className="pt-10 sm:pt-16 pb-12 sm:pb-20 border-b border-[#e5e5e5] relative overflow-hidden bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Capsule Tag */}
        <div data-hero-tag className="flex items-center justify-start mb-5">
          <Badge variant="soft">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e7000b] animate-pulse" />
            AMICI MULTI-TENANT OS
          </Badge>
        </div>

        {/* Clinical Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          
          {/* Left Column: 48px/600 Engineered Headline */}
          <div className="lg:col-span-7">
            <h1 data-hero-title className="font-display text-3xl sm:text-4xl lg:text-[48px] leading-[1.1] text-[#0a0a0a] mb-5">
              Satu meja. Satu QR.<br />
              Seluruh gerai dalam satu pesanan.
            </h1>
            <p data-hero-desc className="text-sm sm:text-base text-[#737373] leading-relaxed max-w-xl mb-6">
              Platform pemesanan mandiri digital untuk sentra kuliner modern. Pelanggan memesan dari banyak kios sekaligus dalam satu keranjang dan satu pembayaran Midtrans — otomatis terdistribusi ke layar dapur (KDS) tiap gerai.
            </p>

            {/* 18px Radius Action Buttons */}
            <div data-hero-cta className="flex flex-wrap items-center gap-3">
              <a href="#simulator">
                <Button variant="primary" size="lg">
                  Uji Coba Simulasi
                  <IconArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="#kalkulator">
                <Button variant="outline" size="lg">
                  Kalkulator ROI
                </Button>
              </a>
            </div>

            {/* Micro Specs */}
            <div data-hero-cta className="mt-6 flex flex-wrap items-center gap-5 text-xs text-[#737373] font-mono">
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" /> Zero install app
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" /> Midtrans QRIS
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" /> Real-time KDS
              </span>
            </div>
          </div>

          {/* Right Column: Stat Block Card */}
          <div data-hero-summary className="lg:col-span-5 bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="text-[11px] font-mono text-[#737373] uppercase tracking-wider mb-2">
              EFISIENSI OPERASIONAL
            </div>
            <div className="font-heading text-xl text-[#0a0a0a] mb-2 font-semibold">
              Dari meja ke kompor dalam 2 detik.
            </div>
            <p className="text-xs sm:text-sm text-[#737373] leading-relaxed mb-5">
              Tanpa pelayan bolak-balik mencatat nota, tanpa antrean kasir sentral. Pengunjung langsung duduk, pesan menu lintas kios, dan memantau status masak.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e5e5e5]">
              <div>
                <div className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] font-semibold">0 Menit</div>
                <div className="text-[11px] text-[#737373] font-mono mt-0.5">Antrean Kasir Fisik</div>
              </div>
              <div>
                <div className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] font-semibold">+35%</div>
                <div className="text-[11px] text-[#737373] font-mono mt-0.5">Table Turnover</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Hero Showcase Frame */}
        <div data-hero-mockup className="w-full">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#737373] uppercase tracking-wider">
                Live Interface Preview:
              </span>
              <div className="inline-flex rounded-[18px] bg-[#ffffff] p-1 border border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => setActiveTab('customer')}
                  className={`text-xs px-3 py-1 rounded-[18px] font-medium transition-all ${
                    activeTab === 'customer'
                      ? 'bg-[#0a0a0a] text-[#fafafa]'
                      : 'text-[#737373] hover:text-[#0a0a0a]'
                  }`}
                >
                  Pelanggan (Meja 04)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kds')}
                  className={`text-xs px-3 py-1 rounded-[18px] font-medium transition-all ${
                    activeTab === 'kds'
                      ? 'bg-[#0a0a0a] text-[#fafafa]'
                      : 'text-[#737373] hover:text-[#0a0a0a]'
                  }`}
                >
                  Layar KDS Dapur
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className={`text-xs px-3 py-1 rounded-[18px] font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-[#0a0a0a] text-[#fafafa]'
                      : 'text-[#737373] hover:text-[#0a0a0a]'
                  }`}
                >
                  Admin Amici
                </button>
              </div>
            </div>

            <div className="text-xs font-mono text-[#737373]">
              Status: <span className="text-[#0a0a0a] font-medium">● Elysia Core Ready</span>
            </div>
          </div>

          {/* Card Body */}
          <Card surface="paper" className="relative overflow-hidden">
            {activeTab === 'customer' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Mobile Preview Frame */}
                <div className="md:col-span-5 bg-[#fafafa] rounded-[18px] p-4 border border-[#e5e5e5]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#e5e5e5] text-xs">
                    <span className="font-mono text-[#737373]">AMICI FOOD COURT</span>
                    <span className="px-2 py-0.5 rounded-[18px] bg-[#ffffff] font-mono text-[#0a0a0a] border border-[#e5e5e5]">MEJA 04</span>
                  </div>

                  {/* Multi-tenant Cart Items */}
                  <div className="mt-3 space-y-2">
                    <div className="text-[11px] font-mono text-[#737373] uppercase tracking-wide">
                      Keranjang Gabungan (2 Kios)
                    </div>

                    <div className="p-2.5 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[#0a0a0a]">Nasi Goreng Wagyu</div>
                        <div className="text-[#737373] text-[11px]">Kios A • Dapur Nusantara</div>
                      </div>
                      <div className="font-mono font-medium text-[#0a0a0a]">Rp 45.000</div>
                    </div>

                    <div className="p-2.5 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[#0a0a0a]">Iced Salted Caramel Latte</div>
                        <div className="text-[#737373] text-[11px]">Kios B • Roastery Kopi</div>
                      </div>
                      <div className="font-mono font-medium text-[#0a0a0a]">Rp 28.000</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#e5e5e5] flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[#737373]">Total (1x Checkout)</div>
                      <div className="font-mono text-sm font-semibold text-[#0a0a0a]">Rp 73.000</div>
                    </div>
                    <span className="px-3 py-1.5 rounded-[18px] bg-[#0a0a0a] text-[#fafafa] text-xs font-medium flex items-center gap-1.5">
                      Bayar QRIS
                      <IconArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="md:col-span-7 space-y-3">
                  <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block">
                    PENGALAMAN PELANGGAN MANDIRI
                  </span>
                  <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a] font-semibold">
                    Pesan menu dari seluruh kios, bayar dalam satu transaksi.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    Pengunjung tidak perlu mendatangi tiap kios satu per satu. Pembayaran instan via QRIS Midtrans secara otomatis memecah order ke masing-masing layar dapur tenant.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Scan Meja QR
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Multi-Tenant Cart
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Self-Checkout Midtrans
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kds' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Kitchen Screen Frame */}
                <div className="md:col-span-6 bg-[#fafafa] rounded-[18px] p-4 border border-[#e5e5e5]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#e5e5e5] text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#e7000b]" />
                      <span className="font-mono font-medium text-[#0a0a0a]">KDS DAPUR • NUSANTARA</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#737373]">Tiket Masuk: 2 Menit Lalu</span>
                  </div>

                  <div className="mt-3 p-3.5 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#0a0a0a]">ORDER #FC-8902</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] font-mono border border-[#e5e5e5]">
                        SEDANG DIMASAK
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#0a0a0a]">
                      1x Nasi Goreng Wagyu
                      <span className="block text-[11px] font-normal text-[#737373] mt-0.5">Catatan: Pedas sedang, tanpa acar</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e5] text-xs">
                      <span className="font-mono text-[#737373]">Tujuan: Meja 04</span>
                      <button type="button" className="px-3 py-1 rounded-[18px] bg-[#0a0a0a] text-[#fafafa] text-xs font-medium">
                        Tandai Siap Saji →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="md:col-span-6 space-y-3">
                  <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block">
                    LAYAR DAPUR DIGITAL (KDS)
                  </span>
                  <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a] font-semibold">
                    Koki hanya melihat pesanan kiosnya sendiri.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    Setiap tenant mendapatkan antrean dapur digital terisolasi. Tanpa tiket kertas hilang atau salah baca nota. Saat pesanan siap, koki cukup mengetuk tombol selesai.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Tiket Real-Time
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Kontrol Stok Habis
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Audio Alert Koki
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Admin Screen Frame */}
                <div className="md:col-span-6 bg-[#fafafa] rounded-[18px] p-4 border border-[#e5e5e5]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#e5e5e5] text-xs">
                    <span className="font-mono font-medium text-[#0a0a0a]">DASHBOARD AMICI FOOD COURT</span>
                    <span className="text-[#0a0a0a] font-mono text-[11px]">Live Sync</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 mt-3">
                    <div className="p-3 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5]">
                      <div className="text-[11px] text-[#737373] font-mono">Omzet Hari Ini</div>
                      <div className="font-heading text-xl text-[#0a0a0a] font-semibold mt-1">Rp 14.850.000</div>
                    </div>
                    <div className="p-3 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5]">
                      <div className="text-[11px] text-[#737373] font-mono">Total Transaksi</div>
                      <div className="font-heading text-xl text-[#0a0a0a] font-semibold mt-1">182 Pesanan</div>
                    </div>
                  </div>
                  <div className="mt-2.5 p-3 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-[#0a0a0a]">Okupansi Meja</div>
                      <div className="text-[#737373] text-[11px]">28 dari 32 meja aktif (87.5%)</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-[18px] bg-[#0a0a0a] text-[#fafafa] text-[11px] font-mono">
                      Cetak QR
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="md:col-span-6 space-y-3">
                  <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block">
                    MANAJEMEN SENTRA KULINER
                  </span>
                  <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a] font-semibold">
                    Pusat kendali omzet, komisi tenant, dan meja.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    Pengelola food court memiliki transparansi penuh terhadap volume penjualan seluruh gerai, rekonsiliasi otomatis, dan kemampuan menghasilkan QR meja siap cetak.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Split Payout Tenant
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ QR Code Generator
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Multi-Role RBAC
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </section>
  )
}
