import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { apiFetch, getToken } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import { InternalLayout } from '../../components/layout/InternalLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Icons } from '../../components/ui/Icons'
import { QrPrintModal } from '../../components/admin/QrPrintModal'
import { DiningSessionDrawer } from '../../components/admin/DiningSessionDrawer'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/Dialog'
import type { Table, TableStatus } from '../../types'

export function AdminTablesPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [foodCourt, setFoodCourt] = useState<any>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Create table modal
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [isCreating, setIsCreating] = useState(false)

  // Drawer & QR Print modals
  const [selectedForPrint, setSelectedForPrint] = useState<Table | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [selectedForSession, setSelectedForSession] = useState<Table | null>(null)
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false)

  // Delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Table | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTables = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const fcRes = await apiFetch<{ data: any[] }>('/api/food-courts', {
        token: token || undefined,
      })

      if (fcRes.data && fcRes.data.length > 0) {
        const fc = fcRes.data[0]
        setFoodCourt(fc)

        const res = await apiFetch<{ data: Table[] }>('/api/tables', {
          token: token || undefined,
        })
        setTables(res.data || [])
      } else {
        setTables([])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar meja'
      toastError('Gagal Memuat Data', msg)
    } finally {
      setIsLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  // Change table status (available, occupied, disabled)
  const handleStatusChange = async (tableId: string, newStatus: TableStatus) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
    )

    try {
      const token = getToken()
      await apiFetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        token: token || undefined,
        body: { status: newStatus },
      })
      toastSuccess('Status Meja Diubah', `Meja sekarang berstatus ${newStatus}.`)
    } catch (err: unknown) {
      fetchTables()
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status meja'
      toastError('Gagal Mengubah Status', msg)
    }
  }

  // Create table handler
  const handleCreateTable = async (e: FormEvent) => {
    e.preventDefault()
    if (!tableNumber.trim()) {
      toastError('Validasi Gagal', 'Nomor meja wajib diisi')
      return
    }
    if (!foodCourt) {
      toastError('Gagal', 'Cabang food court tidak terdeteksi')
      return
    }

    setIsCreating(true)
    try {
      const token = getToken()
      await apiFetch('/api/tables', {
        method: 'POST',
        token: token || undefined,
        body: {
          foodCourtId: foodCourt.id,
          tableNumber: tableNumber.trim(),
          capacity: Math.max(1, Number(capacity) || 4),
        },
      })
      toastSuccess('Meja Ditambahkan', `Meja ${tableNumber} berhasil didaftarkan.`)
      setTableNumber('')
      setCapacity('4')
      setCreateDialogOpen(false)
      fetchTables()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan meja'
      toastError('Gagal Menambahkan Meja', msg)
    } finally {
      setIsCreating(false)
    }
  }

  // Delete table handler
  const handleDeleteTable = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const token = getToken()
      await apiFetch(`/api/tables/${itemToDelete.id}`, {
        method: 'DELETE',
        token: token || undefined,
      })
      toastSuccess('Meja Dihapus', `Meja ${itemToDelete.tableNumber} telah dihapus.`)
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      fetchTables()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus meja'
      toastError('Gagal Menghapus Meja', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTables = tables.filter((t) => {
    const matchesSearch = search.trim()
      ? t.tableNumber.toLowerCase().includes(search.toLowerCase())
      : true
    const matchesStatus = statusFilter ? t.status === statusFilter : true
    return matchesSearch && matchesStatus
  })

  const getStatusBadgeVariant = (st: TableStatus) => {
    switch (st) {
      case 'occupied':
        return 'solid'
      case 'available':
        return 'soft'
      case 'disabled':
        return 'outline'
      default:
        return 'soft'
    }
  }

  return (
    <InternalLayout
      title="Manajemen Meja & QR Dinamis"
      subtitle="Pantau okupansi meja makan, cetak kartu QR fisik, dan kelola sesi pelanggan"
      foodCourtName={foodCourt?.name}
      actions={
        <Button
          variant="primary"
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <Icons.Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Meja Makan</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <Card surface="paper" className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Cari nomor meja (T-01, Meja 12)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Icons.Search className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status Meja</option>
                <option value="available">Tersedia (Available)</option>
                <option value="occupied">Terisi (Occupied)</option>
                <option value="disabled">Nonaktif (Disabled)</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Visual Table Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {isLoading ? (
            <div className="col-span-full py-16 text-center text-sm text-[#737373]">
              <Icons.Refresh className="w-6 h-6 animate-spin mx-auto mb-2" />
              Memuat data meja...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm text-[#737373]">
              Belum ada meja makan terdaftar. Klik "+ Tambah Meja Makan" untuk mulai.
            </div>
          ) : (
            filteredTables.map((table) => (
              <Card
                key={table.id}
                surface="paper"
                className="!p-4 flex flex-col justify-between hover:border-[#737373] transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[#0a0a0a] tracking-tight">
                      {table.tableNumber}
                    </h3>
                    <p className="text-[11px] text-[#737373]">
                      Kapasitas: {table.capacity} Kursi
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(table.status)} className="text-[10px]">
                    {table.status}
                  </Badge>
                </div>

                {/* Status Switcher Dropdown */}
                <div className="pt-2 border-t border-[#e5e5e5]">
                  <Label htmlFor={`status-${table.id}`} className="!text-[10px] !mb-1">
                    Ubah Status:
                  </Label>
                  <Select
                    id={`status-${table.id}`}
                    value={table.status}
                    onChange={(e) => handleStatusChange(table.id, e.target.value as TableStatus)}
                    className="!h-8 !text-xs !py-1"
                  >
                    <option value="available">Tersedia (Ready)</option>
                    <option value="occupied">Terisi Tamu (In Use)</option>
                    <option value="disabled">Nonaktif (Disabled)</option>
                  </Select>
                </div>

                {/* Quick actions buttons */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    type="button"
                    title="Cetak Stiker QR"
                    onClick={() => {
                      setSelectedForPrint(table)
                      setPrintModalOpen(true)
                    }}
                    className="p-1.5 rounded-[12px] bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#0a0a0a] text-xs flex items-center gap-1 font-medium px-2 transition-colors cursor-pointer"
                  >
                    <Icons.QrCode className="w-3.5 h-3.5" />
                    <span>QR</span>
                  </button>

                  <button
                    type="button"
                    title="Riwayat Sesi Makan"
                    onClick={() => {
                      setSelectedForSession(table)
                      setSessionDrawerOpen(true)
                    }}
                    className="p-1.5 rounded-[12px] bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#0a0a0a] text-xs flex items-center gap-1 font-medium px-2 transition-colors cursor-pointer"
                  >
                    <Icons.Clock className="w-3.5 h-3.5" />
                    <span>Sesi</span>
                  </button>

                  <button
                    type="button"
                    title="Hapus Meja"
                    onClick={() => {
                      setItemToDelete(table)
                      setDeleteConfirmOpen(true)
                    }}
                    className="p-1.5 rounded-[12px] text-[#737373] hover:text-[#e7000b] hover:bg-[#fff0f0] transition-colors cursor-pointer"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create Table Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogClose onClick={() => setCreateDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Tambah Meja Makan Baru</DialogTitle>
          <DialogDescription>
            Daftarkan nomor meja makan baru. Sistem akan secara otomatis meng-generate QR Token unik.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateTable} className="space-y-4">
          <div>
            <Label htmlFor="create-tbl-num" required>
              Nomor / Kode Meja
            </Label>
            <Input
              id="create-tbl-num"
              placeholder="Contoh: T-01 / MEJA-A1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div>
            <Label htmlFor="create-tbl-cap" required>
              Kapasitas Tempat Duduk (Orang)
            </Label>
            <Input
              id="create-tbl-cap"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isCreating}>
              {isCreating ? 'Menyimpan...' : 'Simpan Meja'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* QR Print Modal */}
      <QrPrintModal
        table={selectedForPrint}
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        onTokenRegenerated={fetchTables}
      />

      {/* Dining Session History Drawer */}
      <DiningSessionDrawer
        tableId={selectedForSession?.id || null}
        tableNumber={selectedForSession?.tableNumber}
        open={sessionDrawerOpen}
        onOpenChange={setSessionDrawerOpen}
      />

      {/* Delete Confirmation Alert Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogClose onClick={() => setDeleteConfirmOpen(false)} />
        <DialogHeader>
          <DialogTitle className="text-[#e7000b]">Hapus Meja Makan?</DialogTitle>
          <DialogDescription>
            Yakin ingin menghapus Meja <strong>{itemToDelete?.tableNumber}</strong>? QR code fisik
            meja ini tidak akan dapat digunakan lagi oleh pengunjung.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteTable}
            disabled={isDeleting}
            className="!bg-[#e7000b] hover:!bg-[#c50009] !text-white"
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Meja'}
          </Button>
        </DialogFooter>
      </Dialog>
    </InternalLayout>
  )
}
