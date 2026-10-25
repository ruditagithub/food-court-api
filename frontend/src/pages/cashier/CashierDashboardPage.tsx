import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Icons } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/Dialog'
import { CashierQRScannerModal } from '../../components/cashier/CashierQRScannerModal'
import { formatRupiah, formatDate } from '../../lib/utils'

interface CashBillItem {
  orderItemId: string
  menuName: string
  quantity: number
  allocatedAmount: number
  notes?: string | null
}

interface PendingCashBill {
  paymentGroupId: string
  orderId: string
  orderNumber: string
  tableNumber: string
  participantName: string
  items: CashBillItem[]
  subtotal: number
  serviceFee: number
  taxAmount: number
  amountDue: number
  createdAt: string
}

export function CashierDashboardPage() {
  const { user, logout } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos')
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingBills, setPendingBills] = useState<PendingCashBill[]>([])
  const [isLoadingBills, setIsLoadingBills] = useState(false)
  const [selectedBill, setSelectedBill] = useState<PendingCashBill | null>(null)

  // QR Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  // Calculator state
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  // Success Receipt Modal state
  const [confirmedReceipt, setConfirmedReceipt] = useState<any>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  // History state
  const [historyData, setHistoryData] = useState<{ summary: any; transactions: any[] }>({
    summary: { totalCashToday: 0, countToday: 0 },
    transactions: [],
  })
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Fetch pending cash bills
  const fetchPendingBills = useCallback(async (q?: string) => {
    setIsLoadingBills(true)
    try {
      const url = q ? `/api/payments/cashier/pending?q=${encodeURIComponent(q)}` : '/api/payments/cashier/pending'
      const res = await apiFetch<{ data: PendingCashBill[] }>(url)
      setPendingBills(res.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat antrean tagihan kasir'
      toastError('Error', msg)
    } finally {
      setIsLoadingBills(false)
    }
  }, [toastError])

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const res = await apiFetch<{ data: any }>('/api/payments/cashier/history')
      setHistoryData(res.data || { summary: { totalCashToday: 0, countToday: 0 }, transactions: [] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat transaksi kasir'
      toastError('Error', msg)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [toastError])

  useEffect(() => {
    if (activeTab === 'pos') {
      fetchPendingBills(searchQuery)
      const interval = setInterval(() => {
        fetchPendingBills(searchQuery)
      }, 5000)
      return () => clearInterval(interval)
    } else {
      fetchHistory()
    }
  }, [activeTab, searchQuery, fetchPendingBills, fetchHistory])

  // Select bill and reset calculator
  const handleSelectBill = (bill: PendingCashBill) => {
    setSelectedBill(bill)
    setCashReceivedInput(bill.amountDue.toString())
  }

  // Handle QR code scanner output
  const handleScanSuccess = async (decodedText: string) => {
    let cleanQuery = decodedText.trim()
    let parsedGroupId: string | undefined
    let parsedOrderNum: string | undefined

    try {
      const parsed = JSON.parse(decodedText)
      parsedGroupId = parsed.paymentGroupId
      parsedOrderNum = parsed.orderNumber
      cleanQuery = parsed.paymentGroupId || parsed.orderNumber || parsed.code || cleanQuery
    } catch {
      // plain string
    }

    const stripped = cleanQuery.toUpperCase().startsWith('CSH-') ? cleanQuery.slice(4) : cleanQuery
    const qLower = cleanQuery.toLowerCase()
    const strippedLower = stripped.toLowerCase()

    // 1. Check local pendingBills first
    const matched = pendingBills.find(
      (b) =>
        (parsedGroupId && b.paymentGroupId.toLowerCase() === parsedGroupId.toLowerCase()) ||
        (parsedOrderNum && b.orderNumber.toLowerCase() === parsedOrderNum.toLowerCase()) ||
        b.orderNumber.toLowerCase() === qLower ||
        b.orderNumber.toLowerCase() === strippedLower ||
        b.paymentGroupId.toLowerCase() === qLower ||
        b.paymentGroupId.toLowerCase() === strippedLower ||
        b.orderNumber.toLowerCase().includes(strippedLower) ||
        strippedLower.includes(b.orderNumber.toLowerCase())
    )

    if (matched) {
      handleSelectBill(matched)
      toastSuccess('Tagihan Ditemukan', `Tagihan ${matched.orderNumber} (${matched.participantName}) berhasil dimuat.`)
      return
    }

    // 2. Query lookup endpoint
    try {
      const res = await apiFetch<{ data: PendingCashBill }>(
        `/api/payments/cashier/lookup/${encodeURIComponent(cleanQuery)}`
      )
      if (res.data) {
        handleSelectBill(res.data)
        toastSuccess('Tagihan Ditemukan', `Tagihan ${res.data.orderNumber} (${res.data.participantName}) berhasil dimuat.`)
        fetchPendingBills()
        return
      }
    } catch {
      // 3. Fallback to search query filter
      setSearchQuery(cleanQuery)
      fetchPendingBills(cleanQuery)
      toastError('Tidak Ditemukan', `Tagihan "${cleanQuery}" tidak ditemukan atau sudah lunas.`)
    }
  }

  // Quick cash buttons
  const handleQuickCash = (amount: number) => {
    setCashReceivedInput(amount.toString())
  }

  // Calculate change
  const cashReceivedNum = parseInt(cashReceivedInput.replace(/\D/g, '') || '0', 10)
  const requiredDue = selectedBill?.amountDue || 0
  const cashChange = useMemo(() => {
    return cashReceivedNum - requiredDue
  }, [cashReceivedNum, requiredDue])

  // Confirm payment
  const handleConfirmPayment = async () => {
    if (!selectedBill) return
    if (cashReceivedNum < requiredDue) {
      toastError('Uang Kurang', 'Nominal uang yang diterima kurang dari total tagihan.')
      return
    }

    setIsSubmittingPayment(true)
    try {
      const res = await apiFetch<{ data: any }>('/api/payments/cashier/confirm', {
        method: 'POST',
        body: {
          orderId: selectedBill.orderId,
          paymentGroupId: selectedBill.paymentGroupId,
          cashReceived: cashReceivedNum,
        },
      })

      toastSuccess('Pembayaran Diterima', `Pembayaran untuk ${selectedBill.participantName} berhasil dilunasi.`)
      setConfirmedReceipt({
        ...res.data,
        items: selectedBill.items,
        subtotal: selectedBill.subtotal,
        serviceFee: selectedBill.serviceFee,
        taxAmount: selectedBill.taxAmount,
      })
      setIsReceiptOpen(true)
      setSelectedBill(null)
      setCashReceivedInput('')
      fetchPendingBills()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses pembayaran kasir'
      toastError('Gagal Bayar', msg)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Reprint historical receipt
  const handleReprintReceipt = async (tx: any) => {
    try {
      const res = await apiFetch<{ data: any }>(
        `/api/payments/cashier/lookup/${encodeURIComponent(tx.paymentReference || tx.orderNumber)}`
      )
      if (res.data) {
        setConfirmedReceipt({
          ...res.data,
          cashReceived: tx.cashReceived || res.data.cashReceived || res.data.amountDue,
          cashChange: tx.cashChange || res.data.cashChange || 0,
          paymentReference: tx.paymentReference || res.data.paymentReference,
        })
        setIsReceiptOpen(true)
      }
    } catch {
      setConfirmedReceipt({
        paymentReference: tx.paymentReference,
        orderNumber: tx.orderNumber,
        tableNumber: tx.tableNumber,
        participantName: tx.participantName,
        amountDue: tx.amount,
        cashReceived: tx.cashReceived,
        cashChange: tx.cashChange,
        paidAt: tx.paidAt,
        items: [],
        subtotal: tx.amount,
        serviceFee: 0,
        taxAmount: 0,
      })
      setIsReceiptOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#0a0a0a] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-[#e5e5e5] px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            POS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-[#0a0a0a] leading-tight">
                Kasir Food Court Terpadu
              </h1>
              <Badge variant="solid" className="text-[10px] bg-emerald-600 text-white font-mono">
                ONLINE
              </Badge>
            </div>
            <p className="text-xs text-[#737373]">
              Petugas Kasir: <span className="font-semibold text-[#0a0a0a]">{user?.name || 'Kasir'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="p-1 bg-[#f5f5f5] rounded-[16px] border border-[#e5e5e5] flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[12px] transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pos'
                  ? 'bg-white text-[#0a0a0a] shadow-xs'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              <Icons.CreditCard className="w-3.5 h-3.5" />
              <span>Kasir POS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[12px] transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-[#0a0a0a] shadow-xs'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              <Icons.Clock className="w-3.5 h-3.5" />
              <span>Riwayat & Rekap</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="h-8 px-2.5 text-xs rounded-[12px] gap-1 text-[#737373] hover:text-red-600"
          >
            <Icons.Logout className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'pos' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Search & Pending Cash Queue */}
            <div className="lg:col-span-5 space-y-4">
              <Card surface="paper" className="p-4 rounded-[22px] space-y-3 border border-[#e5e5e5] shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm text-[#0a0a0a] flex items-center gap-2">
                    <Icons.ShoppingBag className="w-4 h-4 text-[#737373]" />
                    <span>Antrean Tagihan Tunai</span>
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPendingBills(searchQuery)}
                    className="h-7 text-[11px] px-2 rounded-[10px] gap-1"
                  >
                    <Icons.Refresh className={`w-3 h-3 ${isLoadingBills ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </div>

                {/* Search Input & QR Camera Scanner Trigger */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
                    <Input
                      type="text"
                      placeholder="Cari No. Pesanan / Meja / Nama Tamu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-[14px]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#a3a3a3] hover:text-[#0a0a0a]"
                      >
                        <Icons.Close className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setIsScannerOpen(true)}
                    className="h-9 px-3 text-xs font-bold shrink-0 rounded-[14px] flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Scan QR Kamera"
                  >
                    <Icons.QrCode className="w-4 h-4" />
                    <span className="hidden sm:inline">Scan QR Kamera</span>
                    <span className="sm:hidden">Scan QR</span>
                  </Button>
                </div>
              </Card>

              {/* Bills List */}
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {isLoadingBills && pendingBills.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#737373]">
                    <Icons.Refresh className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0a0a0a]" />
                    <span>Memuat antrean tagihan...</span>
                  </div>
                ) : pendingBills.length === 0 ? (
                  <div className="p-8 text-center rounded-[20px] bg-white border border-[#e5e5e5] space-y-2">
                    <Icons.Check className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="font-bold text-sm text-[#0a0a0a]">Tidak Ada Tagihan Pending</p>
                    <p className="text-xs text-[#737373]">
                      Semua tagihan kasir telah lunas atau belum ada pesanan baru.
                    </p>
                  </div>
                ) : (
                  pendingBills.map((bill) => {
                    const isSelected = selectedBill?.paymentGroupId === bill.paymentGroupId

                    return (
                      <div
                        key={bill.paymentGroupId}
                        onClick={() => handleSelectBill(bill)}
                        className={`p-3.5 rounded-[18px] transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-white border-[#0a0a0a] shadow-md ring-2 ring-[#0a0a0a]/10'
                            : 'bg-white border-[#e5e5e5] hover:border-[#a3a3a3] shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="solid" className="text-[10px] font-mono py-0 px-1.5">
                                {bill.tableNumber ? `Meja ${bill.tableNumber}` : 'Bawa Pulang'}
                              </Badge>
                              <span className="font-bold text-sm text-[#0a0a0a]">
                                {bill.participantName}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-[#737373] block mt-0.5">
                              {bill.orderNumber}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-[#0a0a0a] block">
                              {formatRupiah(bill.amountDue)}
                            </span>
                            <span className="text-[10px] text-[#737373]">
                              {bill.items.length} Menu
                            </span>
                          </div>
                        </div>

                        {/* Items preview snippet */}
                        <div className="mt-2 pt-2 border-t border-[#f5f5f5] text-[11px] text-[#737373] line-clamp-1">
                          {bill.items.map((it) => `${it.quantity}x ${it.menuName}`).join(', ')}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right Column: POS Payment Processor & Calculator */}
            <div className="lg:col-span-7">
              {selectedBill ? (
                <Card surface="paper" className="p-5 sm:p-6 rounded-[24px] border border-[#e5e5e5] shadow-md space-y-5">
                  {/* Bill Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#e5e5e5]">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">
                        Detail Tagihan Aktif
                      </span>
                      <h3 className="font-black text-lg text-[#0a0a0a]">
                        {selectedBill.participantName}
                      </h3>
                      <p className="font-mono text-xs text-[#737373]">
                        {selectedBill.orderNumber} • Meja {selectedBill.tableNumber}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBill(null)}
                      className="h-7 text-xs rounded-[10px]"
                    >
                      Batal Pilih
                    </Button>
                  </div>

                  {/* Items Table */}
                  <div className="p-3.5 rounded-[16px] bg-[#fafafa] border border-[#e5e5e5] space-y-2 text-xs">
                    <span className="text-[10px] font-mono uppercase text-[#737373] block font-semibold">
                      Daftar Pesanan:
                    </span>
                    {selectedBill.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-[#0a0a0a]">
                            {it.quantity}x {it.menuName}
                          </span>
                          {it.notes && (
                            <span className="text-[10px] text-[#737373] block italic">
                              Catatan: &quot;{it.notes}&quot;
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[#737373]">
                          {formatRupiah(it.allocatedAmount)}
                        </span>
                      </div>
                    ))}

                    {/* Breakdown */}
                    <div className="pt-2 border-t border-[#e5e5e5] space-y-1 text-xs">
                      <div className="flex justify-between text-[#737373]">
                        <span>Subtotal Makanan:</span>
                        <span className="font-mono text-[#0a0a0a]">{formatRupiah(selectedBill.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#737373]">
                        <span>Biaya Layanan (3%):</span>
                        <span className="font-mono text-[#0a0a0a]">{formatRupiah(selectedBill.serviceFee)}</span>
                      </div>
                      <div className="flex justify-between text-[#737373]">
                        <span>Pajak Restoran PB1 (10%):</span>
                        <span className="font-mono text-[#0a0a0a]">{formatRupiah(selectedBill.taxAmount)}</span>
                      </div>
                      <div className="pt-2 border-t border-[#e5e5e5] flex justify-between items-center font-bold text-base">
                        <span className="text-[#0a0a0a]">Total Tagihan:</span>
                        <span className="font-mono text-xl font-black text-[#0a0a0a]">
                          {formatRupiah(selectedBill.amountDue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cash Calculator Box */}
                  <div className="p-4 rounded-[20px] bg-white border-2 border-[#0a0a0a] space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
                        Uang Tunai Diterima (Cash Received):
                      </label>
                      <span className="text-[11px] text-[#737373]">Masukkan nominal uang dari pelanggan</span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-base text-[#737373]">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={cashReceivedInput ? parseInt(cashReceivedInput.replace(/\D/g, ''), 10).toLocaleString('id-ID') : ''}
                        onChange={(e) => setCashReceivedInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        className="w-full h-12 pl-12 pr-4 rounded-[14px] bg-[#fafafa] font-mono font-black text-xl text-[#0a0a0a] border border-[#e5e5e5] focus:bg-white focus:border-[#0a0a0a] outline-none transition-all"
                      />
                    </div>

                    {/* Quick Cash Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(selectedBill.amountDue)}
                        className="py-1.5 px-2 rounded-[10px] text-xs font-bold bg-[#f5f5f5] hover:bg-[#0a0a0a] hover:text-white transition-colors border border-[#e5e5e5] cursor-pointer"
                      >
                        Uang Pas
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCash(50000)}
                        className="py-1.5 px-2 rounded-[10px] text-xs font-bold bg-[#f5f5f5] hover:bg-[#0a0a0a] hover:text-white transition-colors border border-[#e5e5e5] cursor-pointer font-mono"
                      >
                        50k
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCash(100000)}
                        className="py-1.5 px-2 rounded-[10px] text-xs font-bold bg-[#f5f5f5] hover:bg-[#0a0a0a] hover:text-white transition-colors border border-[#e5e5e5] cursor-pointer font-mono"
                      >
                        100k
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCash(200000)}
                        className="py-1.5 px-2 rounded-[10px] text-xs font-bold bg-[#f5f5f5] hover:bg-[#0a0a0a] hover:text-white transition-colors border border-[#e5e5e5] cursor-pointer font-mono"
                      >
                        200k
                      </button>
                    </div>

                    {/* Change Display */}
                    <div className="pt-2 border-t border-[#f0f0f0] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#737373]">Uang Kembalian (Change):</span>
                      <span
                        className={`font-mono text-lg font-black ${
                          cashChange >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {cashChange >= 0 ? formatRupiah(cashChange) : `Kurang ${formatRupiah(Math.abs(cashChange))}`}
                      </span>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleConfirmPayment}
                    disabled={isSubmittingPayment || cashReceivedNum < requiredDue}
                    className="w-full h-12 text-sm font-black rounded-[16px] shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmittingPayment ? (
                      <>
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        <span>Memproses Pembayaran...</span>
                      </>
                    ) : (
                      <>
                        <Icons.Check className="w-4 h-4" />
                        <span>Terima Uang & Konfirmasi Lunas</span>
                      </>
                    )}
                  </Button>
                </Card>
              ) : (
                <div className="p-12 text-center rounded-[24px] bg-white border border-[#e5e5e5] space-y-3">
                  <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto text-[#737373]">
                    <Icons.CreditCard className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-[#0a0a0a]">Pilih Tagihan untuk Diproses</h3>
                  <p className="text-xs text-[#737373] max-w-sm mx-auto">
                    Klik salah satu tagihan pada antrean di sebelah kiri, atau cari berdasarkan Nomor Pesanan pelanggan.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ===================== TAB 2: HISTORY & REKAP KAS ===================== */
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card surface="paper" className="p-5 rounded-[22px] border border-[#e5e5e5] shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#737373] uppercase tracking-wider">
                  Total Kas Masuk Hari Ini
                </span>
                <div className="font-mono text-2xl font-black text-emerald-600">
                  {formatRupiah(historyData.summary?.totalCashToday || 0)}
                </div>
                <p className="text-[11px] text-[#737373]">Penerimaan tunai yang telah diverifikasi kasir</p>
              </Card>

              <Card surface="paper" className="p-5 rounded-[22px] border border-[#e5e5e5] shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#737373] uppercase tracking-wider">
                  Jumlah Transaksi Kasir Hari Ini
                </span>
                <div className="font-mono text-2xl font-black text-[#0a0a0a]">
                  {historyData.summary?.countToday || 0} <span className="text-sm font-normal text-[#737373]">Transaksi</span>
                </div>
                <p className="text-[11px] text-[#737373]">Total pembayaran tunai yang selesai</p>
              </Card>
            </div>

            {/* Transactions Table */}
            <Card surface="paper" className="rounded-[22px] border border-[#e5e5e5] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#e5e5e5] flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#0a0a0a]">Riwayat Transaksi Kasir</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHistory}
                  className="h-7 text-xs px-2.5 rounded-[10px] gap-1"
                >
                  <Icons.Refresh className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Referensi Bayar</th>
                      <th className="py-3 px-4">No. Pesanan</th>
                      <th className="py-3 px-4">Meja</th>
                      <th className="py-3 px-4">Tamu / Pembayar</th>
                      <th className="py-3 px-4 text-right">Total Bayar</th>
                      <th className="py-3 px-4 text-right">Uang Diterima</th>
                      <th className="py-3 px-4 text-right">Kembalian</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f5]">
                    {isLoadingHistory ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-xs text-[#737373]">
                          Memuat riwayat...
                        </td>
                      </tr>
                    ) : historyData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-xs text-[#737373]">
                          Belum ada transaksi kasir yang tercatat hari ini.
                        </td>
                      </tr>
                    ) : (
                      historyData.transactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-[#fafafa]">
                          <td className="py-3 px-4 font-mono text-[11px] text-[#737373]">
                            {tx.paidAt ? formatDate(tx.paidAt) : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#0a0a0a]">
                            {tx.paymentReference}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#737373]">{tx.orderNumber}</td>
                          <td className="py-3 px-4 font-semibold text-[#0a0a0a]">
                            {tx.tableNumber ? `Meja ${tx.tableNumber}` : 'Bawa Pulang'}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0a0a0a]">{tx.participantName}</td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-[#0a0a0a]">
                            {formatRupiah(tx.amount)}
                          </td>
                          <td className="py-3 px-4 font-mono text-right text-[#737373]">
                            {formatRupiah(tx.cashReceived)}
                          </td>
                          <td className="py-3 px-4 font-mono text-right text-emerald-600 font-bold">
                            {formatRupiah(tx.cashChange)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="solid" className="text-[9px] bg-emerald-600 text-white">
                              LUNAS
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleReprintReceipt(tx)}
                              className="px-2.5 py-1 rounded-[10px] bg-[#f5f5f5] hover:bg-[#0a0a0a] hover:text-white transition-colors text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer border border-[#e5e5e5]"
                              title="Cetak Ulang Struk Thermal"
                            >
                              <Icons.Printer className="w-3 h-3" />
                              <span>Struk</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Cash Receipt Confirmation Modal */}
      {confirmedReceipt && (
        <Dialog open={isReceiptOpen} onOpenChange={(val) => !val && setIsReceiptOpen(false)} size="md">
          <style>{`
            @media print {
              @page {
                margin: 0;
                size: auto;
              }
              *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                min-height: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              .fixed,
              .relative,
              [data-lenis-prevent],
              .overflow-y-auto,
              [role="dialog"] {
                position: static !important;
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
                min-height: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              #cashier-printable-receipt,
              #cashier-printable-receipt * {
                visibility: visible !important;
              }
              #cashier-printable-receipt {
                position: absolute !important;
                left: 0 !important;
                right: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 480px !important;
                margin: 0 auto !important;
                padding: 24px !important;
                background: #ffffff !important;
                border: none !important;
                box-shadow: none !important;
              }
              button, [role="button"], dialog, .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="relative">
            <DialogClose onClick={() => setIsReceiptOpen(false)} className="no-print" />
            <DialogHeader className="text-center pb-2 no-print">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Icons.Check className="w-6 h-6" />
              </div>
              <DialogTitle className="text-base font-bold text-[#0a0a0a]">
                Pembayaran Berhasil!
              </DialogTitle>
              <p className="text-xs text-[#737373]">
                Tagihan telah lunas. Anda dapat mencetak struk thermal kasir di bawah ini.
              </p>
            </DialogHeader>

            {/* Thermal Printable Receipt Paper */}
            <div
              id="cashier-printable-receipt"
              className="p-5 rounded-[20px] bg-white border border-[#e5e5e5] shadow-sm font-mono text-xs space-y-3 my-2"
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-[#0a0a0a]">
                <h3 className="text-base font-black tracking-tight text-[#0a0a0a]">
                  FOOD COURT UTAMA
                </h3>
                <p className="text-[11px] text-[#737373]">
                  Sistem Kasir Digital Terpadu
                </p>
                <p className="text-[10px] text-[#737373]">
                  {formatDate(confirmedReceipt.paidAt || new Date().toISOString())}
                </p>
              </div>

              {/* Order & Cashier Info */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#737373]">No. Ref:</span>
                  <span className="font-bold text-[#0a0a0a]">{confirmedReceipt.paymentReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">No. Pesanan:</span>
                  <span className="font-bold text-[#0a0a0a]">{confirmedReceipt.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Meja:</span>
                  <span className="font-bold text-[#0a0a0a]">
                    {confirmedReceipt.tableNumber ? `Meja ${confirmedReceipt.tableNumber}` : 'Bawa Pulang (Takeaway)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Pelanggan:</span>
                  <span className="font-bold text-[#0a0a0a]">{confirmedReceipt.participantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Kasir:</span>
                  <span className="font-semibold text-[#0a0a0a]">{confirmedReceipt.cashierName || user?.name || 'Kasir'}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="pt-2 border-t border-dashed border-[#0a0a0a] space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                  Rincian Pesanan
                </div>
                {(confirmedReceipt.items || []).map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-[11px] gap-2">
                    <div className="min-w-0">
                      <span className="text-[#0a0a0a] font-medium block">
                        {it.quantity}x {it.menuName}
                      </span>
                      {it.notes && (
                        <span className="text-[10px] text-[#737373] block italic">
                          ({it.notes})
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-[#0a0a0a] shrink-0">
                      {formatRupiah(it.allocatedAmount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="pt-2 border-t border-dashed border-[#0a0a0a] space-y-1 text-[11px]">
                <div className="flex justify-between text-[#737373]">
                  <span>Subtotal Menu:</span>
                  <span className="text-[#0a0a0a]">{formatRupiah(confirmedReceipt.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-[#737373]">
                  <span>Biaya Layanan (3%):</span>
                  <span className="text-[#0a0a0a]">{formatRupiah(confirmedReceipt.serviceFee || 0)}</span>
                </div>
                <div className="flex justify-between text-[#737373]">
                  <span>Pajak Restoran PB1 (10%):</span>
                  <span className="text-[#0a0a0a]">{formatRupiah(confirmedReceipt.taxAmount || 0)}</span>
                </div>
                <div className="pt-1.5 border-t border-[#0a0a0a] flex justify-between font-bold text-sm text-[#0a0a0a]">
                  <span>TOTAL TAGIHAN:</span>
                  <span>{formatRupiah(confirmedReceipt.amountDue)}</span>
                </div>
                <div className="flex justify-between text-[#737373] pt-1">
                  <span>Tunai Diterima:</span>
                  <span className="font-bold text-[#0a0a0a]">{formatRupiah(confirmedReceipt.cashReceived)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-emerald-600">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(confirmedReceipt.cashChange)}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-3 border-t border-dashed border-[#0a0a0a] text-center space-y-1 text-[10px] text-[#737373]">
                <p className="font-semibold text-[#0a0a0a]">Terima Kasih Atas Kunjungan Anda!</p>
                <p>Simpan struk ini sebagai bukti pembayaran yang sah.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 no-print">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 h-10 text-xs font-bold rounded-[14px] gap-1.5 border-[#0a0a0a]"
              >
                <Icons.Printer className="w-4 h-4" />
                <span>Cetak Struk Thermal</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsReceiptOpen(false)}
                className="flex-1 h-10 text-xs font-bold rounded-[14px]"
              >
                Selesai (Kasir Siap)
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Cashier Camera QR Scanner Modal */}
      <CashierQRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  )
}
