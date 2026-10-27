import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Icons } from '../ui/Icons'
import { formatRupiah } from '../../lib/utils'

interface FoodCourtWithdrawalModalProps {
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
    bankName: string
    bankAccountNumber: string
    bankAccountHolder: string
  }) => Promise<void>
}

const POPULAR_BANKS = [
  'BCA',
  'Bank Mandiri',
  'BRI',
  'BNI',
  'Bank Jago',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
  'Permata Bank',
]

const QUICK_AMOUNTS = [50000, 100000, 250000, 500000, 1000000]

export function FoodCourtWithdrawalModal({
  isOpen,
  onClose,
  currentBalance,
  defaultBank,
  onSubmit,
}: FoodCourtWithdrawalModalProps) {
  const [amount, setAmount] = useState<number>(0)
  const [bankName, setBankName] = useState('BCA')
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

    if (amount < 50000) {
      setError('Nominal penarikan dana cabang minimal Rp 50.000')
      return
    }

    if (amount > currentBalance) {
      setError(`Saldo cabang tidak mencukupi (Maksimal: ${formatRupiah(currentBalance)})`)
      return
    }

    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountHolder.trim()) {
      setError('Informasi rekening transfer bank tujuan harus diisi lengkap')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        amount,
        bankName,
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Gagal mengajukan penarikan dana cabang')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} size="lg">
      <div className="relative">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>Tarik Saldo Bersih Cabang Food Court</DialogTitle>
          <DialogDescription>
            Pencairan dana saldo operasional food court ke rekening manajemen bank resmi melalui verifikasi Super Admin.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-5 p-3.5 rounded-[18px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <Icons.AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Info Card: Current Balance */}
          <div className="p-4 rounded-[22px] bg-[#fafafa] border border-[#e5e5e5] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
                Saldo Bersih Cabang Siap Ditarik
              </span>
              <span className="font-heading text-xl font-bold tracking-tight text-[#0a0a0a]">
                {formatRupiah(currentBalance)}
              </span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Transfer Bank
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-semibold text-[#0a0a0a]">
              Nominal Penarikan (Rp) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#737373]">
                Rp
              </span>
              <Input
                id="amount"
                type="number"
                min={50000}
                max={currentBalance}
                step={1000}
                value={amount || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0
                  setAmount(val)
                  setError(null)
                }}
                placeholder="50.000"
                className="pl-11 font-mono font-bold text-base rounded-[18px]"
                required
              />
            </div>
            <p className="text-[11px] text-[#737373]">
              Batas minimum pencairan dana kas cabang adalah <strong>Rp 50.000</strong>.
            </p>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={val > currentBalance}
                  onClick={() => handleQuickAmount(val)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-full border transition-all ${
                    amount === val
                      ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                      : val > currentBalance
                        ? 'bg-[#f5f5f5] text-[#a3a3a3] border-[#e5e5e5] cursor-not-allowed opacity-60'
                        : 'bg-white text-[#0a0a0a] border-[#e5e5e5] hover:border-[#a3a3a3]'
                  }`}
                >
                  +{val / 1000}rb
                </button>
              ))}
              <button
                type="button"
                disabled={currentBalance <= 0}
                onClick={handleWithdrawAll}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#f0f0f0] text-[#0a0a0a] border border-[#d4d4d4] hover:bg-[#e5e5e5] transition-all"
              >
                Tarik Semua
              </button>
            </div>
          </div>

          {/* Bank Destination Section */}
          <div className="p-4 rounded-[22px] bg-[#ffffff] border border-[#e5e5e5] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
              <Icons.Building className="w-3.5 h-3.5 text-[#737373]" />
              Rekening Bank Tujuan Pencairan
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankName" className="text-xs font-semibold text-[#0a0a0a]">
                Nama Bank / Lembaga Keuangan <span className="text-red-500">*</span>
              </Label>
              <select
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[18px] border border-[#e5e5e5] bg-white text-sm text-[#0a0a0a] focus:outline-hidden focus:border-[#0a0a0a]"
                required
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="Lainnya">Bank Lainnya</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNumber" className="text-xs font-semibold text-[#0a0a0a]">
                  Nomor Rekening <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bankAccountNumber"
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Contoh: 8881234567"
                  className="font-mono text-sm rounded-[18px]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankAccountHolder" className="text-xs font-semibold text-[#0a0a0a]">
                  Nama Pemilik Rekening <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bankAccountHolder"
                  type="text"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  placeholder="Sesuai buku tabungan"
                  className="text-sm rounded-[18px]"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-[#737373]">
              Informasi rekening ini akan disimpan sebagai rekening pencairan default cabang food court Anda.
            </p>
          </div>

          {/* Hold Notice */}
          <div className="p-3.5 rounded-[18px] bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <Icons.AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Saldo otomatis tertahan (WITHDRAWAL_HOLD)</strong> saat pengajuan dikirimkan untuk mencegah penarikan ganda. Super Admin akan memproses transfer dari rekening sentra platform.
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full px-5 text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || amount < 50000 || amount > currentBalance}
              className="rounded-full px-6 text-xs bg-[#0a0a0a] hover:bg-[#262626] text-white shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Mengirimkan...
                </>
              ) : (
                `Kirim Pengajuan (${formatRupiah(amount || 0)})`
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
