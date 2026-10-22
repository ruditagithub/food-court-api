import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { IconArrowRight } from '../ui/Icons'

export function RoiCalculator() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })

  const [tables, setTables] = useState<number>(30)
  const [avgOrder, setAvgOrder] = useState<number>(65000)
  const [turnoverPerDay, setTurnoverPerDay] = useState<number>(5)

  const currentDailyRevenue = tables * turnoverPerDay * avgOrder
  const improvedDailyRevenue = tables * (turnoverPerDay * 1.25) * avgOrder
  const monthlyGain = (improvedDailyRevenue - currentDailyRevenue) * 30

  return (
    <section id="kalkulator" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <Badge variant="soft" className="mb-2">
            KALKULATOR POTENSI BISNIS
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Hitung peningkatan omzet sentra kuliner Anda.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
            Eliminasi antrean kasir mempercepat perputaran meja (table turnover). Simulasikan proyeksi pertumbuhan omzet.
          </p>
        </div>

        {/* Dual Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Controls */}
          <div data-reveal className="lg:col-span-7 bg-[#f5f5f5] rounded-[24px] p-5 sm:p-7 border border-[#e5e5e5] space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-[#0a0a0a]">Jumlah Meja Amici Food Court:</label>
                <span className="font-mono text-sm font-semibold text-[#0a0a0a]">{tables} Meja</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={tables}
                onChange={(e) => setTables(Number(e.target.value))}
                className="w-full accent-[#0a0a0a] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#737373] font-mono mt-1">
                <span>10 Meja</span>
                <span>120 Meja</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-[#0a0a0a]">Rata-rata Nilai Pesanan per Meja:</label>
                <span className="font-mono text-sm font-semibold text-[#0a0a0a]">
                  Rp {avgOrder.toLocaleString('id-ID')}
                </span>
              </div>
              <input
                type="range"
                min="30000"
                max="250000"
                step="5000"
                value={avgOrder}
                onChange={(e) => setAvgOrder(Number(e.target.value))}
                className="w-full accent-[#0a0a0a] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#737373] font-mono mt-1">
                <span>Rp 30.000</span>
                <span>Rp 250.000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-[#0a0a0a]">Perputaran Meja per Hari:</label>
                <span className="font-mono text-sm font-semibold text-[#0a0a0a]">{turnoverPerDay}x pergantian</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={turnoverPerDay}
                onChange={(e) => setTurnoverPerDay(Number(e.target.value))}
                className="w-full accent-[#0a0a0a] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#737373] font-mono mt-1">
                <span>2x</span>
                <span>12x</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div data-reveal className="lg:col-span-5 bg-[#ffffff] rounded-[24px] p-5 sm:p-7 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] space-y-5">
            <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block">
              PROYEKSI KENAIKAN OMZET
            </span>

            <div>
              <div className="text-xs text-[#737373] mb-1">Tambahan Pendapatan per Bulan (+25% Turnover)</div>
              <div className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-tight font-semibold">
                +Rp {Math.round(monthlyGain).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5e5e5] space-y-2 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-[#737373]">Omzet Harian Saat Ini:</span>
                <span className="font-mono text-[#0a0a0a]">Rp {currentDailyRevenue.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#737373]">Proyeksi Omzet Baru:</span>
                <span className="font-mono font-medium text-[#0a0a0a]">Rp {Math.round(improvedDailyRevenue).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-1">
              <a href="#harga" className="w-full">
                <Button variant="primary" size="lg" className="w-full">
                  Mulai Digitalisasi Sekarang
                  <IconArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
