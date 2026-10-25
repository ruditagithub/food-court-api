import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode'
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'

export interface CashierQRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (decodedText: string) => void
}

export function CashierQRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: CashierQRScannerModalProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')

  const qrReaderRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scannerContainerId = 'cashier-qr-reader-container'

  // Initialize and enumerate cameras
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return
        if (devices && devices.length > 0) {
          setCameras(devices)
          // Prefer back camera if available
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          )
          setSelectedCameraId(backCam ? backCam.id : devices[0].id)
        } else {
          setScanError('Tidak ada perangkat kamera yang terdeteksi pada sistem ini.')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('Camera enumeration error:', err)
        setScanError('Izin akses kamera ditolak atau tidak didukung pada browser ini.')
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Start / stop scanner based on selectedCameraId & isOpen
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return

    const qrScanner = new Html5Qrcode(scannerContainerId, {
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      verbose: false,
    })
    qrReaderRef.current = qrScanner
    let active = true

    const startScanner = async () => {
      try {
        setScanError(null)
        await qrScanner.start(
          selectedCameraId,
          {
            fps: 30,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
              const qrboxSize = Math.floor(minEdge * 0.85)
              return {
                width: qrboxSize,
                height: qrboxSize,
              }
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!active) return
            // Stop scanning and trigger success callback
            qrScanner
              .stop()
              .catch(() => {})
              .finally(() => {
                setIsScanning(false)
                onScanSuccess(decodedText)
                onClose()
              })
          },
          () => {
            // Frame scan failure (ignorable)
          }
        )
        if (active) {
          setIsScanning(true)
          // Attempt continuous autofocus if supported by camera device
          try {
            const capabilities = qrScanner.getRunningTrackCapabilities() as any
            if (capabilities?.focusMode?.includes('continuous')) {
              await qrScanner.applyVideoConstraints({
                advanced: [{ focusMode: 'continuous' } as any],
              })
            }
          } catch {
            // ignore if not supported
          }
        } else {
          // If unmounted or closed while start() was resolving, shut down camera immediately
          qrScanner
            .stop()
            .catch(() => {})
            .then(() => qrScanner.clear())
            .catch(() => {})
        }
      } catch (err: unknown) {
        if (!active) return
        console.error('Failed to start camera:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setScanError(`Gagal membuka kamera: ${msg}`)
        setIsScanning(false)
      }
    }

    startScanner()

    return () => {
      active = false
      if (qrScanner.isScanning) {
        qrScanner
          .stop()
          .then(() => qrScanner.clear())
          .catch(() => {})
      } else {
        try {
          qrScanner.clear()
        } catch {
          // ignore
        }
      }
      qrReaderRef.current = null
      setIsScanning(false)
    }
  }, [isOpen, selectedCameraId, onScanSuccess, onClose])

  // Switch camera handler
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    setSelectedCameraId(cameras[nextIndex].id)
  }

  // File upload scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setScanError(null)
      // If camera is actively streaming, pause/stop it first to prevent html5-qrcode crash
      if (qrReaderRef.current && isScanning) {
        await qrReaderRef.current.stop().catch(() => {})
        setIsScanning(false)
      }
      const scanner =
        qrReaderRef.current ||
        new Html5Qrcode(scannerContainerId, {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        })
      const decodedText = await scanner.scanFile(file, false)
      if (decodedText) {
        onScanSuccess(decodedText)
        onClose()
      }
    } catch (err: unknown) {
      console.error('File scan error:', err)
      setScanError('QR Code tidak terdeteksi pada gambar yang diunggah.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Manual code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    onScanSuccess(manualCode.trim())
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} size="md">
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Icons.QrCode className="w-5 h-5 text-[#0a0a0a]" />
          <DialogTitle>Scan QR Code Tagihan Meja</DialogTitle>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Camera Scanner Viewport */}
        <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[400px] mx-auto rounded-[24px] overflow-hidden bg-black border-2 border-[#0a0a0a] shadow-inner flex flex-col items-center justify-center">
          {/* HTML5 QR Code Mount Element */}
          <div
            id={scannerContainerId}
            className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
          />

          {/* Scanner Overlay Visual Guide */}
          {isScanning && !scanError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[85%] h-[85%] border-2 border-white/40 rounded-[20px] relative">
                {/* Corner Accents */}
                <span className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-[10px]" />
                <span className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-[10px]" />
                <span className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-[10px]" />
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-[10px]" />

                {/* Animated Horizontal Scanline */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Error / Offline Placeholder */}
          {scanError && (
            <div className="absolute inset-0 p-4 bg-[#0a0a0a]/90 text-white flex flex-col items-center justify-center text-center space-y-2.5 z-10">
              <Icons.AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs font-medium text-[#d4d4d4] max-w-[240px] leading-relaxed">
                {scanError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScanError(null)
                  setSelectedCameraId((prev) => (prev ? `${prev}` : ''))
                }}
                className="h-8 text-xs text-white border-white/20 hover:bg-white/10 rounded-[12px]"
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Camera Controls Bar */}
          {cameras.length > 1 && isScanning && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 hover:bg-black/80 transition-all cursor-pointer"
              >
                <Icons.SwitchCamera className="w-3.5 h-3.5" />
                <span>Ganti Kamera</span>
              </button>
            </div>
          )}
        </div>

        {/* Guidance Note */}
        <p className="text-xs text-center text-[#737373]">
          Arahkan kamera ke QR Code di layar HP pelanggan (dari Struk Tunai atau Split Bill).
        </p>

        {/* Alternative: Image File Upload & Manual Code Entry */}
        <div className="p-3.5 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0a0a0a]">Atau Masukkan Manual:</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-[#0a0a0a] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Icons.Download className="w-3.5 h-3.5" />
              <span>Unggah Gambar QR</span>
            </button>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Ketik No. Pesanan / CSH-..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 h-9 rounded-[14px] bg-white text-xs px-3 border border-[#e5e5e5] focus:border-[#0a0a0a] outline-none font-mono"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!manualCode.trim()}
              className="h-9 px-3.5 text-xs font-bold shrink-0 rounded-[14px]"
            >
              Cari
            </Button>
          </form>
        </div>
      </div>
    </Dialog>
  )
}
