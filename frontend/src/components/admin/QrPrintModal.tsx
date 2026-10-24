import { useState, useEffect } from 'react'
import { apiFetch, getToken, API_BASE_URL } from '../../api/client'
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
  foodCourtName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onTokenRegenerated?: () => void
}

export function QrPrintModal({
  table,
  foodCourtName,
  open,
  onOpenChange,
  onTokenRegenerated,
}: QrPrintModalProps) {
  const { error: toastError, success: toastSuccess } = useToast()
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    setImageLoaded(false)
  }, [table?.id, table?.qrToken])

  if (!table) return null

  const fcDisplayName =
    table.foodCourt?.name || foodCourtName || 'Sentra Food Court'
  const orderUrl = `${window.location.origin}/s/${table.qrToken}`
  const qrApiUrl = `${API_BASE_URL}/api/tables/${table.id}/qr?origin=${encodeURIComponent(
    window.location.origin
  )}&v=${encodeURIComponent(table.qrToken)}`

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  const handlePrint = () => {
    // Gunakan iframe terisolasi agar hasil cetak pas 1 halaman tanpa header/footer bawaan browser
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      window.print()
      return
    }

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title></title>
          <style>
            @page {
              size: auto;
              margin: 0mm;
            }
            *, *::before, *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 100%;
              height: 100%;
              background: #ffffff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0a0a0a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 24px;
            }
            .card {
              width: 320px;
              background: #ffffff;
              border: 2px solid #0a0a0a;
              border-radius: 24px;
              padding: 28px 24px;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .fc-name {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #737373;
              margin-bottom: 4px;
            }
            .table-title {
              font-size: 26px;
              font-weight: 900;
              letter-spacing: -0.02em;
              color: #0a0a0a;
              margin-bottom: 18px;
            }
            .qr-box {
              width: 208px;
              height: 208px;
              margin: 0 auto 16px auto;
              background: #fafafa;
              border: 1px solid #e5e5e5;
              border-radius: 20px;
              padding: 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-img {
              width: 160px;
              height: 160px;
              object-fit: contain;
              display: block;
            }
            .qr-token {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 9px;
              color: #737373;
              margin-top: 4px;
              word-break: break-all;
              max-width: 185px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .instruction-title {
              font-size: 12px;
              font-weight: 700;
              color: #0a0a0a;
              margin-bottom: 4px;
            }
            .instruction-desc {
              font-size: 11px;
              line-height: 1.4;
              color: #737373;
              max-width: 250px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="card">
              <div class="fc-name">${escapeHtml(fcDisplayName)}</div>
              <div class="table-title">MEJA ${escapeHtml(table.tableNumber)}</div>
              <div class="qr-box">
                <img class="qr-img" src="${qrApiUrl}" alt="QR Meja ${escapeHtml(table.tableNumber)}" />
                <div class="qr-token">${escapeHtml(table.qrToken)}</div>
              </div>
              <div class="instruction-title">Pindai QR untuk Pesan Makanan</div>
              <div class="instruction-desc">Buka kamera ponsel Anda dan arahkan ke kode QR di atas untuk memesan dari seluruh stan.</div>
            </div>
          </div>
        </body>
      </html>
    `)
    doc.close()

    const triggerPrint = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 1500)
        }
      }, 150)
    }

    const img = doc.querySelector('img')
    if (img && !img.complete) {
      img.onload = triggerPrint
      img.onerror = triggerPrint
    } else {
      triggerPrint()
    }
  }

  const handleDownloadSvg = async () => {
    try {
      const res = await fetch(qrApiUrl)
      if (!res.ok) throw new Error('Gagal mengunduh berkas QR')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `stiker-qr-meja-${table.tableNumber}.svg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
      toastSuccess(
        'QR Berhasil Diunduh',
        `Berkas stiker meja ${table.tableNumber} (.svg) siap dicetak.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunduh berkas QR'
      toastError('Gagal Mengunduh', msg)
    }
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
      setImageLoaded(false)
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
            <p className="text-xs font-mono uppercase tracking-widest text-[#737373] font-semibold">
              {fcDisplayName}
            </p>
            <h2 className="text-2xl font-black text-[#0a0a0a] tracking-tight mt-1">
              MEJA {table.tableNumber}
            </h2>
          </div>

          {/* Real Scannable Server-Side QR Code */}
          <div className="w-52 h-52 mx-auto bg-[#fafafa] rounded-[22px] border border-[#e5e5e5] p-3 flex flex-col items-center justify-center relative shadow-inner overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#737373] bg-[#fafafa] z-10">
                <Icons.Refresh className="w-6 h-6 animate-spin text-[#0a0a0a]" />
                <span className="text-[10px] font-mono">Memuat QR Barcode...</span>
              </div>
            )}
            <img
              key={table.qrToken}
              src={qrApiUrl}
              alt={`QR Code Meja ${table.tableNumber}`}
              onLoad={() => setImageLoaded(true)}
              className={`w-44 h-44 object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <span className="text-[10px] font-mono text-[#737373] mt-1 break-all line-clamp-1 max-w-[190px]">
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

          {/* Manual URL: visible in detail modal, hidden when printed */}
          <div
            data-print-hidden="true"
            className="pt-2 border-t border-[#e5e5e5] text-[10px] font-mono text-[#737373] break-all print:hidden"
          >
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

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadSvg}
          className="gap-1.5 border-[#e5e5e5]"
        >
          <Icons.Download className="w-4 h-4 text-[#0a0a0a]" />
          <span>Unduh SVG</span>
        </Button>
        <Button type="button" variant="primary" onClick={handlePrint} className="gap-2">
          <Icons.Printer className="w-4 h-4" />
          <span>Cetak Kartu Meja</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
