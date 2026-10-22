import { useState } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../ui/Toast'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'
import type { Table } from '../../types'

interface QrPrintModalProps {
  table: Table | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTokenRegenerated?: () => void
}

export function QrPrintModal({
  table,
  open,
  onOpenChange,
  onTokenRegenerated,
}: QrPrintModalProps) {
  const { error: toastError, success: toastSuccess } = useToast()
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  if (!table) return null

  const orderUrl = `${window.location.origin}/s/${table.qrToken}`

  const handlePrint = () => {
    window.print()
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const token = getToken()
      await apiFetch(`/api/tables/${table.id}/regenerate-qr`, {
        method: 'POST',
        token: token || undefined,
      })
      toastSuccess('Token QR Diperbarui', `Token meja ${table.tableNumber} telah di-reset.`)
      setConfirmReset(false)
      onTokenRegenerated?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset token QR'
      toastError('Gagal Reset QR', msg)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>Cetak QR Stiker Meja {table.tableNumber}</DialogTitle>
        <DialogDescription>
          Pratinjau kartu stiker meja fisik siap cetak untuk ditempel di meja makan.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Printable Physical Card Layout */}
        <div
          id="printable-table-qr"
          className="p-6 rounded-[24px] bg-[#ffffff] border-2 border-[#0a0a0a] text-center space-y-4 shadow-sm"
        >
          <div>
            <span className="w-8 h-8 rounded-[12px] bg-[#0a0a0a] text-white inline-flex items-center justify-center font-bold text-xs mb-1">
              FC
            </span>
            <p className="text-xs font-mono uppercase tracking-widest text-[#737373]">
              FoodCourt OS
            </p>
            <h2 className="text-2xl font-black text-[#0a0a0a] tracking-tight mt-1">
              MEJA {table.tableNumber}
            </h2>
          </div>

          {/* QR visual placeholder with link */}
          <div className="w-48 h-48 mx-auto bg-[#fafafa] rounded-[20px] border border-[#e5e5e5] p-4 flex flex-col items-center justify-center relative shadow-inner">
            <Icons.QrCode className="w-32 h-32 text-[#0a0a0a]" />
            <span className="text-[10px] font-mono text-[#737373] mt-1 break-all line-clamp-1 max-w-[170px]">
              {table.qrToken}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#0a0a0a]">
              Pindai QR untuk Pesan Makanan
            </p>
            <p className="text-[11px] text-[#737373] max-w-xs mx-auto">
              Buka kamera ponsel Anda dan arahkan ke kode QR di atas untuk memesan dari seluruh stan.
            </p>
          </div>

          <div className="pt-2 border-t border-[#e5e5e5] text-[10px] font-mono text-[#737373]">
            {orderUrl}
          </div>
        </div>

        {/* Security Reset Alert / Action */}
        {!confirmReset ? (
          <div className="p-3 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[#0a0a0a]">Keamanan Token QR</p>
              <p className="text-[#737373] text-[11px]">
                Reset token jika QR lama disalahgunakan pengunjung luar
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="text-[#e7000b] hover:bg-[#fff0f0] border-[#e5e5e5]"
            >
              Reset Token
            </Button>
          </div>
        ) : (
          <div className="p-3.5 rounded-[18px] bg-[#fff0f0] border border-[#e7000b]/20 space-y-2 text-xs">
            <p className="font-semibold text-[#e7000b]">
              Yakin ingin mereset token QR Meja {table.tableNumber}?
            </p>
            <p className="text-[#737373] text-[11px]">
              Stiker QR lama yang sudah tercetak tidak akan dapat digunakan lagi.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmReset(false)}
                disabled={isRegenerating}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="!bg-[#e7000b] hover:!bg-[#c50009]"
              >
                {isRegenerating ? 'Mereset...' : 'Ya, Reset Sekarang'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
        <Button variant="primary" onClick={handlePrint} className="gap-2">
          <Icons.Printer className="w-4 h-4" />
          <span>Cetak Kartu Meja</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
