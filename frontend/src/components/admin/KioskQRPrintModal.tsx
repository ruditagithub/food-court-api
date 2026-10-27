import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
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
import type { Kiosk } from '../../types'

interface KioskQRPrintModalProps {
  kiosk: Kiosk | null
  foodCourtName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KioskQRPrintModal({
  kiosk,
  foodCourtName,
  open,
  onOpenChange,
}: KioskQRPrintModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  const fcDisplayName =
    kiosk?.foodCourt?.name || foodCourtName || 'Sentra Food Court'
  const kioskUrl = kiosk ? `${window.location.origin}/kiosk/${kiosk.deviceCode}` : ''

  useEffect(() => {
    if (!kiosk || !kioskUrl) return
    QRCode.toDataURL(kioskUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate Kiosk QR:', err))
  }, [kiosk, kioskUrl])

  if (!kiosk) return null

  const handlePrint = () => {
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
              width: 340px;
              background: #ffffff;
              border: 3px solid #0a0a0a;
              border-radius: 28px;
              padding: 32px 24px;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .fc-badge {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #737373;
              margin-bottom: 6px;
            }
            .title {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: -0.02em;
              color: #0a0a0a;
              line-height: 1.2;
              margin-bottom: 4px;
            }
            .location-tag {
              font-size: 11px;
              color: #737373;
              margin-bottom: 18px;
            }
            .badge-takeaway {
              display: inline-block;
              background: #0a0a0a;
              color: #9ef01a;
              font-size: 10px;
              font-weight: 800;
              padding: 4px 12px;
              border-radius: 9999px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              margin-bottom: 16px;
            }
            .qr-box {
              width: 220px;
              height: 220px;
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
              width: 190px;
              height: 190px;
              object-fit: contain;
              display: block;
            }
            .instruction-title {
              font-size: 13px;
              font-weight: 800;
              color: #0a0a0a;
              margin-bottom: 4px;
            }
            .instruction-desc {
              font-size: 11px;
              line-height: 1.4;
              color: #737373;
              max-width: 260px;
              margin: 0 auto;
            }
            .footer-code {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 9px;
              color: #a3a3a3;
              margin-top: 14px;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="card">
              <div class="fc-badge">${fcDisplayName}</div>
              <div class="badge-takeaway">TAKEAWAY • PESAN BAWA PULANG</div>
              <div class="title">${kiosk.kioskName}</div>
              <div class="location-tag">${kiosk.location || 'Lokasi Standee Food Court'}</div>
              <div class="qr-box">
                <img class="qr-img" src="${qrDataUrl}" alt="QR Standee Takeaway" />
              </div>
              <div class="instruction-title">Pindai QR dengan Ponsel Anda</div>
              <div class="instruction-desc">Antrean di mesin kasir sedang ramai? Scan kode QR ini untuk memesan bawa pulang langsung dari smartphone Anda.</div>
              <div class="footer-code">Device ID: ${kiosk.deviceCode}</div>
            </div>
          </div>
        </body>
      </html>
    `)
    doc.close()

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
    }, 200)
  }

  const handleDownloadImage = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-kiosk-${kiosk.deviceCode}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>Cetak QR Standee Takeaway</DialogTitle>
        <DialogDescription>
          Pratinjau kartu stiker standee fisik siap cetak untuk dipasang di meja atau samping terminal Kiosk.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Printable Card Preview */}
        <div className="p-6 rounded-[24px] bg-[#ffffff] border-2 border-[#0a0a0a] text-center space-y-3 shadow-xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#737373] font-bold">
              {fcDisplayName}
            </p>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#0a0a0a] text-[#9ef01a] text-[10px] font-extrabold uppercase tracking-wide mt-1">
              TAKEAWAY • PESAN BAWA PULANG
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] tracking-tight mt-2">
              {kiosk.kioskName}
            </h2>
            {kiosk.location && (
              <p className="text-xs text-[#737373] mt-0.5">{kiosk.location}</p>
            )}
          </div>

          <div className="w-52 h-52 mx-auto bg-[#fafafa] rounded-[22px] border border-[#e5e5e5] p-3 flex flex-col items-center justify-center relative shadow-inner overflow-hidden">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Kiosk ${kiosk.deviceCode}`}
                className="w-44 h-44 object-contain"
              />
            ) : (
              <Icons.Refresh className="w-6 h-6 animate-spin text-[#0a0a0a]" />
            )}
            <span className="text-[10px] font-mono text-[#737373] mt-1 break-all line-clamp-1 max-w-[190px]">
              {kiosk.deviceCode}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-[#0a0a0a]">
              Pindai QR dengan Ponsel Anda
            </p>
            <p className="text-[11px] text-[#737373] max-w-xs mx-auto">
              Scan kode QR di atas untuk membuka katalog menu takeaway multi-tenant langsung dari smartphone.
            </p>
          </div>

          <div className="pt-2 border-t border-[#e5e5e5] text-[10px] font-mono text-[#737373] break-all">
            {kioskUrl}
          </div>
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadImage}
          className="gap-1.5 border-[#e5e5e5]"
        >
          <Icons.Download className="w-4 h-4 text-[#0a0a0a]" />
          <span>Unduh PNG</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open(`/kiosk/${kiosk.deviceCode}`, '_blank')}
          className="gap-1.5"
        >
          <Icons.Eye className="w-4 h-4" />
          <span>Buka di Tab Baru</span>
        </Button>
        <Button type="button" variant="primary" onClick={handlePrint} className="gap-2">
          <Icons.Printer className="w-4 h-4" />
          <span>Cetak Standee</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
