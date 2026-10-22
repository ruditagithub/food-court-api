import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'
import type { Table } from '../../types'

export function TableScanResolverPage() {
  const { qrToken } = useParams<{ qrToken: string }>()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDisabled, setIsDisabled] = useState(false)

  useEffect(() => {
    if (!qrToken) {
      setErrorMessage('Token QR tidak ditemukan.')
      setIsLoading(false)
      return
    }

    const resolveScan = async () => {
      setIsLoading(true)
      try {
        const res = await apiFetch<{ data: Table }>(`/api/tables/scan/${qrToken}`)
        const table = res.data

        if (table.status === 'disabled') {
          setIsDisabled(true)
          setIsLoading(false)
          return
        }

        // Store active dining table in localStorage
        localStorage.setItem(
          'active_table',
          JSON.stringify({
            tableId: table.id,
            tableNumber: table.tableNumber,
            foodCourtId: table.foodCourtId,
            qrToken: table.qrToken,
          })
        )

        // Redirect to menu page
        navigate(`/s/${qrToken}`, { replace: true })
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'QR Code Meja Tidak Berlaku. Silakan hubungi staf food court.'
        setErrorMessage(msg)
      } finally {
        setIsLoading(false)
      }
    }

    resolveScan()
  }, [qrToken, navigate])

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <Card surface="paper" className="max-w-md w-full text-center p-8 space-y-4">
        {isLoading ? (
          <div className="py-8 space-y-3">
            <Icons.Refresh className="w-8 h-8 animate-spin mx-auto text-[#0a0a0a]" />
            <h2 className="text-base font-bold text-[#0a0a0a]">
              Mengenali Meja Makan...
            </h2>
            <p className="text-xs text-[#737373]">
              Mohon tunggu sebentar, kami sedang menghubungkan ponsel Anda ke meja.
            </p>
          </div>
        ) : isDisabled ? (
          <div className="py-4 space-y-3">
            <div className="w-12 h-12 rounded-[18px] bg-[#fff0f0] text-[#e7000b] flex items-center justify-center mx-auto">
              <Icons.AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#0a0a0a]">Meja Sedang Tidak Aktif</h2>
            <p className="text-xs text-[#737373] leading-relaxed">
              Meja ini sedang dalam pemeliharaan atau dipindahkan oleh staf. Silakan pindah ke
              meja lain yang tersedia.
            </p>
            <Button variant="primary" onClick={() => navigate('/')} className="w-full mt-2">
              Kembali ke Beranda
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            <div className="w-12 h-12 rounded-[18px] bg-[#fff0f0] text-[#e7000b] flex items-center justify-center mx-auto">
              <Icons.AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#0a0a0a]">QR Code Tidak Valid</h2>
            <p className="text-xs text-[#737373] leading-relaxed">
              {errorMessage || 'QR code meja tidak berlaku atau telah diperbarui oleh staf.'}
            </p>
            <Button variant="primary" onClick={() => navigate('/')} className="w-full mt-2">
              Kembali ke Beranda
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
