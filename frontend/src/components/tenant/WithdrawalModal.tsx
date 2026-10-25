import { useState, useEffect } from 'react'
import { Dialog, DialogClose, DialogHeader } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Icons } from '../ui/Icons'
import { formatRupiah } from '../../lib/utils'

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  defaultBank?: {
    bankName?: string | null
    bankAccountNumber?: string | null
    bankAccountHolder?: string | null
  }
  onSubmit: (data: {
    amount: number
    paymentMethod: 'CASH' | 'TRANSFER'
    bankName?: string
    bankAccountNumber?: string
    bankAccountHolder?: string
  }) => Promise<void>
}

export function WithdrawalModal({
  isOpen,
  onClose,
  currentBalance,
  defaultBank,
  onSubmit,
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('TRANSFER')
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountHolder, setBankAccountHolder] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAmount(0)
      setError(null)
      if (defaultBank) {
        setBankName(defaultBank.bankName || 'BCA')
        setBankAccountNumber(defaultBank.bankAccountNumber || '')
        setBankAccountHolder(defaultBank.bankAccountHolder || '')
      }
    }
  }, [isOpen, defaultBank])

  const handleQuickAmount = (val: number) => {
    const clamped = Math.min(val, currentBalance)
    setAmount(clamped)
    setError(null)
  }

  const handleWithdrawAll = () => {
    setAmount(currentBalance)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (amount < 10000) {
      setError('Nominal penarikan minimal Rp 10.000')
      return
    }

    if (amount > currentBalance) {
      setError(`Saldo tidak mencukupi (Maksimal: ${formatRupiah(currentBalance)})`)
      return
    }

    if (paymentMethod === 'TRANSFER') {
      if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountHolder.trim()) {
        setError('Mohon lengkapi seluruh informasi rekening transfer')
        return
      }
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        amount,
        paymentMethod,
        bankName: paymentMethod === 'TRANSFER' ? bankName.trim() : undefined,
        bankAccountNumber: paymentMethod === 'TRANSFER' ? bankAccountNumber.trim() : undefined,
        bankAccountHolder: paymentMethod === 'TRANSFER' ? bankAccountHolder.trim() : undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Gagal mengajukan penarikan dana')
    } finally {
      setIsSubmitting(false)
    }
  }

  const remainingBalance = Math.max(0, currentBalance - amount)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()} size="lg">
      <DialogClose onClick={() => !isSubmitting && onClose()} />
      <DialogHeader>
        <div className="pr-6">
          <h2 className="text-base font-bold text-[#0a0a0a]">
            Ajukan Penarikan Saldo
          </h2>
          <p className="text-xs text-[#737373] mt-0.5">
            Cairkan pendapatan stan Anda via transfer bank atau tunai di kantor/kasir food court.
          </p>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
        {/* Current Balance Banner */}
        <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#737373] block">Saldo Aktif Stan Anda</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-emerald-700">
              {formatRupiah(currentBalance)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleWithdrawAll}
            disabled={currentBalance < 10000 || isSubmitting}
            className="px-3 py-1.5 rounded-[12px] text-xs font-bold bg-[#0a0a0a] text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Tarik Semua
          </button>
        </div>

        {/* Amount Input & Quick Chips */}
        <div className="space-y-2">
          <Label htmlFor="withdraw-amount" required>
            Nominal yang Ditarik (Rupiah)
          </Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[#737373]">
              Rp
            </span>
            <input
              id="withdraw-amount"
              type="number"
              min={10000}
              max={currentBalance}
              step={1000}
              value={amount || ''}
              onChange={(e) => {
                setAmount(Number(e.target.value))
                if (error) setError(null)
              }}
              placeholder="0"
              disabled={isSubmitting}
              className="w-full h-11 pl-11 pr-4 rounded-[16px] bg-white border border-[#e5e5e5] font-mono text-base font-bold text-[#0a0a0a] focus:border-[#0a0a0a] outline-none"
            />
          </div>

          {/* Quick Selection Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-[#737373] mr-1">Pilihan Cepat:</span>
            {[50000, 100000, 250000, 500000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                disabled={val > currentBalance || isSubmitting}
                className={`px-2.5 py-1 rounded-[12px] text-[11px] font-semibold border transition-all cursor-pointer ${
                  amount === val
                    ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                    : 'bg-white text-[#737373] border-[#e5e5e5] hover:text-[#0a0a0a] hover:border-neutral-400 disabled:opacity-40'
                }`}
              >
                {formatRupiah(val)}
              </button>
            ))}
          </div>
        </div>

        {/* Disbursement Method Toggle */}
        <div className="space-y-2">
          <Label required>Metode Pencairan Dana</Label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('TRANSFER')}
              disabled={isSubmitting}
              className={`p-3.5 rounded-[18px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                paymentMethod === 'TRANSFER'
                  ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                  : 'bg-white border-[#e5e5e5] hover:border-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0a0a0a] flex items-center gap-1.5">
                  <Icons.CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Transfer Bank</span>
                </span>
                {paymentMethod === 'TRANSFER' && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-[11px] text-[#737373]">
                Ditransfer ke rekening bank / e-wallet
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              disabled={isSubmitting}
              className={`p-3.5 rounded-[18px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                paymentMethod === 'CASH'
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-xs'
                  : 'bg-white border-[#e5e5e5] hover:border-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0a0a0a] flex items-center gap-1.5">
                  <Icons.Check className="w-4 h-4 text-emerald-600" />
                  <span>Tunai (Cash)</span>
                </span>
                {paymentMethod === 'CASH' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                )}
              </div>
              <span className="text-[11px] text-[#737373]">
                Ambil tunai di kasir/kantor pengelola
              </span>
            </button>
          </div>
        </div>

        {/* Bank Details Form if Transfer */}
        {paymentMethod === 'TRANSFER' && (
          <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] space-y-3">
            <h4 className="text-xs font-bold text-[#0a0a0a]">
              Informasi Rekening Tujuan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bank-name" required>
                  Bank / E-Wallet
                </Label>
                <Input
                  id="bank-name"
                  placeholder="Misal: BCA, BRI, Mandiri, Dana, GoPay"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 rounded-[14px]"
                />
              </div>

              <div>
                <Label htmlFor="bank-acc-no" required>
                  Nomor Rekening / No. HP
                </Label>
                <Input
                  id="bank-acc-no"
                  placeholder="Contoh: 1234567890"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 rounded-[14px] font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="bank-acc-holder" required>
                  Atas Nama Pemilik Rekening
                </Label>
                <Input
                  id="bank-acc-holder"
                  placeholder="Contoh: Budi Santoso"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 rounded-[14px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Summary calculation card */}
        <div className="p-3.5 rounded-[16px] bg-neutral-100 border border-[#e5e5e5] space-y-1.5 text-xs">
          <div className="flex justify-between text-[#737373]">
            <span>Saldo Awal:</span>
            <span className="font-mono">{formatRupiah(currentBalance)}</span>
          </div>
          <div className="flex justify-between text-red-600 font-medium">
            <span>Nominal Ditarik (Di-hold):</span>
            <span className="font-mono">-{formatRupiah(amount)}</span>
          </div>
          <div className="pt-1.5 border-t border-[#d4d4d4] flex justify-between font-bold text-[#0a0a0a]">
            <span>Sisa Saldo Setelah Pengajuan:</span>
            <span className="font-mono">{formatRupiah(remainingBalance)}</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-[14px] bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <Icons.AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e5e5e5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-[16px] h-10 px-4 text-xs font-bold"
          >
            Batal
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={amount < 10000 || amount > currentBalance || isSubmitting}
            className="rounded-[16px] h-10 px-5 text-xs font-bold gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Kirim Pengajuan</span>
                <Icons.ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
