import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { IconCheck, IconQrCode, IconKitchen, IconArrowRight } from '../ui/Icons'

interface CartItem {
  id: string
  name: string
  tenant: string
  price: number
  qty: number
}

export function InteractiveSimulator() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })

  const [cart] = useState<CartItem[]>([
    { id: '1', name: 'Nasi Bebek Madura Sambal Hitam', tenant: 'Kios 01 • Bebek Rempah', price: 38000, qty: 1 },
    { id: '2', name: 'Es Cendol Durian Asli', tenant: 'Kios 03 • Minuman Nusantara', price: 25000, qty: 1 }
  ])

  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PAID' | 'COOKING' | 'READY'>('IDLE')

  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0)

  const handleSimulateOrder = () => {
    setOrderStatus('PAID')
    setTimeout(() => setOrderStatus('COOKING'), 1200)
    setTimeout(() => setOrderStatus('READY'), 3000)
  }

  const handleReset = () => {
    setOrderStatus('IDLE')
  }

  return (
    <section id="simulator" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="soft" className="mb-2">
            SANDBOX SIMULASI INTERAKTIF
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Coba alur pemesanan secara langsung.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
            Rasakan bagaimana sistem memproses keranjang multi-kios pelanggan dan meneruskannya ke layar dapur tenant dalam hitungan detik.
          </p>
        </div>

        {/* Dual-Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Customer View */}
          <div data-reveal className="lg:col-span-6 bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <IconQrCode className="w-4 h-4 text-[#0a0a0a]" />
                <span className="font-mono text-xs font-semibold text-[#0a0a0a]">PONSEL PELANGGAN (AMICI • MEJA 12)</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] border border-[#e5e5e5]">
                Scan Meja
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-[11px] font-mono text-[#737373]">Katalog Multi-Tenant Amici:</div>

              {cart.map((item) => (
                <div key={item.id} className="p-3 rounded-[10px] bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[#0a0a0a]">{item.name}</div>
                    <div className="text-[11px] text-[#737373]">{item.tenant}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold text-[#0a0a0a]">
                      Rp {(item.price * item.qty).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-3.5 rounded-[10px] border border-[#e5e5e5] flex items-center justify-between mt-3">
                <div>
                  <div className="text-[11px] text-[#737373]">Total (1x Bayar)</div>
                  <div className="font-heading text-lg text-[#0a0a0a] font-semibold">
                    Rp {total.toLocaleString('id-ID')}
                  </div>
                </div>

                {orderStatus === 'IDLE' ? (
                  <Button variant="primary" size="md" onClick={handleSimulateOrder}>
                    Bayar Sekarang
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset Simulasi
                  </Button>
                )}
              </div>

              {/* Status */}
              {orderStatus !== 'IDLE' && (
                <div className="mt-3 p-3 rounded-[10px] bg-[#fafafa] border border-[#e5e5e5]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono font-medium text-[#0a0a0a]">STATUS #AMICI-9912</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-[18px] bg-[#0a0a0a] text-white">{orderStatus}</span>
                  </div>
                  <div className="text-xs text-[#737373]">
                    {orderStatus === 'PAID' && '💳 Pembayaran Midtrans diverifikasi...'}
                    {orderStatus === 'COOKING' && '👨‍🍳 Koki sedang memasak pesanan Anda...'}
                    {orderStatus === 'READY' && (
                      <span className="text-[#0a0a0a] font-medium flex items-center gap-1.5">
                        <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" />
                        Makanan Siap Diambil di Kios 01 & Kios 03!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KDS View */}
          <div data-reveal className="lg:col-span-6 bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <IconKitchen className="w-4 h-4 text-[#0a0a0a]" />
                <span className="font-mono text-xs font-semibold text-[#0a0a0a]">LAYAR DAPUR KIOS 01 (BEBEK)</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5]">
                KDS Sync
              </span>
            </div>

            <div className="mt-4">
              {orderStatus === 'IDLE' ? (
                <div className="py-14 text-center text-[#737373]">
                  <p className="text-xs">Menunggu pesanan dari pelanggan...</p>
                  <p className="text-[11px] text-[#737373] mt-1">Klik "Bayar Sekarang" di sebelah kiri untuk melihat tiket.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-[10px] bg-[#f5f5f5] border border-[#e5e5e5]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#0a0a0a]">TIKET #AMICI-9912</span>
                        <span className="block text-[11px] text-[#737373]">Meja 12</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-[18px] font-mono text-[10px] bg-[#0a0a0a] text-[#fafafa]">
                        {orderStatus}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-[6px] border border-[#e5e5e5] text-xs">
                      <div className="font-semibold text-[#0a0a0a]">1x Nasi Bebek Madura Sambal Hitam</div>
                      <div className="text-[#737373] text-[11px]">Catatan: Sambal dipisah</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-[10px] bg-[#fafafa] text-[11px] text-[#737373] font-mono border border-[#e5e5e5]">
                    ✓ Tiket Es Cendol otomatis masuk ke Layar KDS Kios 03 secara independen.
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
