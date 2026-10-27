import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { KioskQRPrintModal } from '../../components/admin/KioskQRPrintModal'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/Dialog'
import { formatRupiah } from '../../lib/utils'
import type { Kiosk } from '../../types'

export function AdminKiosksPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [foodCourt, setFoodCourt] = useState<any>(null)
  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [kiosksStats, setKiosksStats] = useState<Record<string, any>>({})
  const [totalTakeawayRevenue, setTotalTakeawayRevenue] = useState(0)
  const [totalTakeawayOrders, setTotalTakeawayOrders] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Form Dialog state (Create / Edit)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null)
  const [kioskName, setKioskName] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [location, setLocation] = useState('')
  const [kioskStatus, setKioskStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // QR Standee Print Modal
  const [selectedForPrint, setSelectedForPrint] = useState<Kiosk | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState(false)

  // Delete Confirm Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [kioskToDelete, setKioskToDelete] = useState<Kiosk | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchKiosks = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const [fcRes, kiosksRes] = await Promise.all([
        apiFetch<{ data: any[] }>('/api/food-courts', { token: token || undefined }),
        apiFetch<{ data: Kiosk[] }>('/api/kiosks', { token: token || undefined }),
      ])

      if (fcRes.data && fcRes.data.length > 0) {
        setFoodCourt(fcRes.data[0])
      }
      const loadedKiosks = kiosksRes.data || []
      setKiosks(loadedKiosks)

      // Fetch stats for kiosks
      if (loadedKiosks.length > 0) {
        const statsPromises = loadedKiosks.map((k) =>
          apiFetch<{ data: any }>(`/api/kiosks/${k.id}/stats`, { token: token || undefined })
            .then((r) => r.data)
            .catch(() => null)
        )
        const statsResults = await Promise.all(statsPromises)
        const statsMap: Record<string, any> = {}
        let revenueSum = 0
        let ordersSum = 0
        statsResults.forEach((s) => {
          if (s) {
            statsMap[s.kioskId] = s
            revenueSum += s.totalRevenue || 0
            ordersSum += s.totalOrders || 0
          }
        })
        setKiosksStats(statsMap)
        setTotalTakeawayRevenue(revenueSum)
        setTotalTakeawayOrders(ordersSum)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar perangkat Kiosk'
      toastError('Gagal Memuat Data', msg)
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchKiosks()
  }, [fetchKiosks])

  const openCreateDialog = () => {
    setEditingKiosk(null)
    setKioskName('')
    const branchTag = foodCourt?.slug ? foodCourt.slug.toUpperCase().slice(0, 4) : 'FC01'
    setDeviceCode(`DEV-KSK-${branchTag}-${Math.floor(10 + Math.random() * 90)}`)
    setLocation('')
    setKioskStatus('ACTIVE')
    setFormDialogOpen(true)
  }

  const openEditDialog = (kiosk: Kiosk) => {
    setEditingKiosk(kiosk)
    setKioskName(kiosk.kioskName)
    setDeviceCode(kiosk.deviceCode)
    setLocation(kiosk.location || '')
    setKioskStatus(kiosk.status)
    setFormDialogOpen(true)
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!kioskName.trim() || !deviceCode.trim()) {
      toastError('Data Belum Lengkap', 'Nama Kiosk dan Device Code wajib diisi.')
      return
    }

    setIsSubmitting(true)
    try {
      const token = getToken()
      if (editingKiosk) {
        await apiFetch(`/api/kiosks/${editingKiosk.id}`, {
          method: 'PUT',
          token: token || undefined,
          body: {
            kioskName: kioskName.trim(),
            deviceCode: deviceCode.trim(),
            location: location.trim() || undefined,
            status: kioskStatus,
          },
        })
        toastSuccess('Kiosk Diperbarui', `Perangkat ${kioskName} berhasil diperbarui.`)
      } else {
        await apiFetch('/api/kiosks', {
          method: 'POST',
          token: token || undefined,
          body: {
            foodCourtId: foodCourt?.id,
            kioskName: kioskName.trim(),
            deviceCode: deviceCode.trim(),
            location: location.trim() || undefined,
            status: kioskStatus,
          },
        })
        toastSuccess('Kiosk Didaftarkan', `Perangkat ${kioskName} siap digunakan.`)
      }
      setFormDialogOpen(false)
      fetchKiosks()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan perangkat Kiosk'
      toastError('Gagal Menyimpan', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (kiosk: Kiosk) => {
    const nextStatus = kiosk.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    // Optimistic update
    setKiosks((prev) =>
      prev.map((k) => (k.id === kiosk.id ? { ...k, status: nextStatus } : k))
    )

    try {
      const token = getToken()
      await apiFetch(`/api/kiosks/${kiosk.id}`, {
        method: 'PUT',
        token: token || undefined,
        body: { status: nextStatus },
      })
      toastSuccess(
        'Status Kiosk Berubah',
        `${kiosk.kioskName} kini berstatus ${nextStatus === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}.`
      )
    } catch (err: unknown) {
      fetchKiosks()
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status Kiosk'
      toastError('Gagal Mengubah Status', msg)
    }
  }

  const handleDelete = async () => {
    if (!kioskToDelete) return
    setIsDeleting(true)
    try {
      const token = getToken()
      await apiFetch(`/api/kiosks/${kioskToDelete.id}`, {
        method: 'DELETE',
        token: token || undefined,
      })
      toastSuccess('Kiosk Dihapus', `Perangkat ${kioskToDelete.kioskName} telah dihapus.`)
      setDeleteDialogOpen(false)
      setKioskToDelete(null)
      fetchKiosks()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus Kiosk'
      toastError('Gagal Menghapus', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredKiosks = kiosks.filter((k) => {
    const matchSearch =
      k.kioskName.toLowerCase().includes(search.toLowerCase()) ||
      k.deviceCode.toLowerCase().includes(search.toLowerCase()) ||
      (k.location && k.location.toLowerCase().includes(search.toLowerCase()))

    const matchStatus = statusFilter === 'ALL' || k.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeCount = kiosks.filter((k) => k.status === 'ACTIVE').length

  return (
    <InternalLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a0a0a]">
                Terminal Kiosk & Takeaway Mandiri
              </h1>
              {foodCourt && (
                <Badge variant="outline" className="text-xs font-mono">
                  {foodCourt.name}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#737373] mt-1">
              Kelola perangkat layar sentuh Kiosk self-service dan standee QR pesan bungkus (takeaway) per cabang.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={openCreateDialog}
            className="rounded-[18px] px-5 h-11 text-xs font-bold gap-2 shrink-0 shadow-xs cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>Tambah Perangkat Kiosk</span>
          </Button>
        </div>

        {/* High-level Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-xs font-semibold">Total Kiosk Terdaftar</span>
              <Icons.Monitor className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <p className="font-mono text-2xl font-extrabold text-[#0a0a0a]">
                {kiosks.length} Perangkat
              </p>
              <p className="text-[11px] text-[#737373] mt-1">
                Kios fisik terpasang di cabang
              </p>
            </div>
          </Card>

          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-xs font-semibold">Kiosk Aktif Melayani</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <p className="font-mono text-2xl font-extrabold text-emerald-700">
                {activeCount} Aktif
              </p>
              <p className="text-[11px] text-[#737373] mt-1">
                {kiosks.length - activeCount} perangkat nonaktif/perbaikan
              </p>
            </div>
          </Card>

          <Card surface="paper" className="p-5 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-xs font-semibold">Total Omzet Takeaway Kiosk</span>
              <Icons.Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-mono text-2xl font-extrabold text-[#0a0a0a]">
                {formatRupiah(totalTakeawayRevenue)}
              </p>
              <p className="text-[11px] text-[#737373] mt-1 font-medium">
                {totalTakeawayOrders} pesanan takeaway diproses
              </p>
            </div>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-[20px] border border-[#e5e5e5] shadow-xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Cari nama kiosk, device ID, lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-[14px] bg-[#f5f5f5] text-xs focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]"
            />
            <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  statusFilter === status
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                {status === 'ALL'
                  ? 'Semua Status'
                  : status === 'ACTIVE'
                    ? 'Aktif Saja'
                    : 'Nonaktif Saja'}
              </button>
            ))}
          </div>
        </div>

        {/* Kiosks List Table */}
        <Card surface="paper" className="p-0 rounded-[24px] overflow-hidden border border-[#e5e5e5]">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#737373] space-y-2">
              <Icons.Refresh className="w-6 h-6 animate-spin mx-auto text-[#0a0a0a]" />
              <p>Memuat perangkat Kiosk...</p>
            </div>
          ) : filteredKiosks.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#737373] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <Icons.Monitor className="w-6 h-6" />
              </div>
              <p className="font-semibold text-[#0a0a0a]">Belum Ada Kiosk yang Didaftarkan</p>
              <p className="text-[11px] max-w-sm mx-auto">
                Pasang terminal layar sentuh mandiri agar pengunjung dapat memesan menu takeaway tanpa antre kasir.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={openCreateDialog}
                className="mt-2"
              >
                + Tambah Kiosk Sekarang
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#737373] uppercase text-[10px] tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Nama Perangkat Kiosk</th>
                    <th className="py-3 px-4">Device Code (ID Kiosk)</th>
                    <th className="py-3 px-4">Lokasi Penempatan</th>
                    <th className="py-3 px-4">Status Layanan</th>
                    <th className="py-3 px-4 text-right">Tindakan Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {filteredKiosks.map((kiosk) => (
                    <tr key={kiosk.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center shrink-0">
                            <Icons.Monitor className="w-4 h-4 text-[#9ef01a]" />
                          </div>
                          <div>
                            <span className="font-bold text-[#0a0a0a] block text-sm">
                              {kiosk.kioskName}
                            </span>
                            <span className="text-[10px] text-[#737373]">
                              {kiosk.foodCourt?.name || 'Cabang Utama'}
                            </span>
                            {kiosksStats[kiosk.id] && (
                              <span className="text-[10px] text-emerald-700 font-mono font-medium block">
                                {kiosksStats[kiosk.id].totalOrders} order • {formatRupiah(kiosksStats[kiosk.id].totalRevenue || 0)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-[#0a0a0a]">
                        <span className="px-2 py-1 rounded-[8px] bg-neutral-100 border border-neutral-200">
                          {kiosk.deviceCode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#737373]">
                        {kiosk.location || <span className="italic text-neutral-400">Belum disetel</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(kiosk)}
                          className="cursor-pointer group flex items-center gap-2 text-left"
                          title="Klik untuk mengubah status aktif"
                        >
                          <Badge
                            variant="soft"
                            className={`transition-all ${
                              kiosk.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 group-hover:bg-emerald-100'
                                : 'bg-neutral-100 text-neutral-600 border-neutral-300 group-hover:bg-neutral-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                                kiosk.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-neutral-400'
                              }`}
                            />
                            {kiosk.status === 'ACTIVE' ? 'AKTIF BEROPERASI' : 'NONAKTIF'}
                          </Badge>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Launch Terminal Button */}
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => window.open(`/kiosk/${kiosk.deviceCode}`, '_blank')}
                            className="h-8 text-xs rounded-[12px] gap-1 font-bold bg-[#0a0a0a] hover:bg-[#262626]"
                            title="Buka tampilan fullscreen layar sentuh Kiosk"
                          >
                            <Icons.Monitor className="w-3.5 h-3.5 text-[#9ef01a]" />
                            <span>Buka Kiosk</span>
                          </Button>

                          {/* Print Standee QR */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedForPrint(kiosk)
                              setPrintModalOpen(true)
                            }}
                            className="h-8 text-xs rounded-[12px] gap-1 font-semibold"
                            title="Cetak kartu standee QR fisik"
                          >
                            <Icons.Printer className="w-3.5 h-3.5" />
                            <span>Cetak QR</span>
                          </Button>

                          {/* Edit Kiosk */}
                          <button
                            type="button"
                            onClick={() => openEditDialog(kiosk)}
                            className="p-1.5 rounded-[10px] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Ubah data kiosk"
                          >
                            <Icons.Edit className="w-4 h-4" />
                          </button>

                          {/* Delete Kiosk */}
                          <button
                            type="button"
                            onClick={() => {
                              setKioskToDelete(kiosk)
                              setDeleteDialogOpen(true)
                            }}
                            className="p-1.5 rounded-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus kiosk"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal: Create / Edit Kiosk */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogClose onClick={() => setFormDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingKiosk ? 'Perbarui Perangkat Kiosk' : 'Tambah Perangkat Kiosk Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingKiosk
                ? 'Ubah nama, ID perangkat fisik, atau lokasi penempatan Kiosk.'
                : 'Daftarkan perangkat Kiosk baru untuk melayani pesanan takeaway mandiri.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kioskName">Nama Perangkat Kiosk</Label>
              <Input
                id="kioskName"
                placeholder="Contoh: Kiosk Lobby Pintu Barat"
                value={kioskName}
                onChange={(e) => setKioskName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="deviceCode">Device Code (ID Unik Kiosk)</Label>
                <button
                  type="button"
                  onClick={() => {
                    const branchTag = foodCourt?.slug ? foodCourt.slug.toUpperCase().slice(0, 4) : 'FC01'
                    setDeviceCode(`DEV-KSK-${branchTag}-${Math.floor(10 + Math.random() * 90)}`)
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Acak Kode Baru
                </button>
              </div>
              <Input
                id="deviceCode"
                placeholder="DEV-KSK-FC01-01"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                required
                className="font-mono"
              />
              <p className="text-[11px] text-[#737373]">
                Kode ini digunakan dalam URL publik terminal: <span className="font-mono">/kiosk/{deviceCode}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Lokasi Penempatan (Opsional)</Label>
              <Input
                id="location"
                placeholder="Contoh: Lantai 1 dekat eskalator utama"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status Operasional</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKioskStatus('ACTIVE')}
                  className={`flex-1 py-2 px-3 rounded-[14px] text-xs font-bold border transition-all cursor-pointer ${
                    kioskStatus === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-white text-neutral-600 border-neutral-200'
                  }`}
                >
                  Aktif Beroperasi
                </button>
                <button
                  type="button"
                  onClick={() => setKioskStatus('INACTIVE')}
                  className={`flex-1 py-2 px-3 rounded-[14px] text-xs font-bold border transition-all cursor-pointer ${
                    kioskStatus === 'INACTIVE'
                      ? 'bg-neutral-100 text-neutral-800 border-neutral-300 shadow-2xs'
                      : 'bg-white text-neutral-600 border-neutral-200'
                  }`}
                >
                  Nonaktif (Perbaikan)
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormDialogOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : editingKiosk ? 'Simpan Perubahan' : 'Daftarkan Kiosk'}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal: Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogClose onClick={() => setDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Hapus Perangkat Kiosk?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus Kiosk <strong className="text-black">{kioskToDelete?.kioskName}</strong> ({kioskToDelete?.deviceCode}). Terminal publik terkait tidak akan lagi dapat diakses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDelete}
              disabled={isDeleting}
              className="!bg-red-600 hover:!bg-red-700"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus Kiosk'}
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Modal: Print Standee QR */}
        <KioskQRPrintModal
          kiosk={selectedForPrint}
          foodCourtName={foodCourt?.name}
          open={printModalOpen}
          onOpenChange={setPrintModalOpen}
        />
      </div>
    </InternalLayout>
  )
}
