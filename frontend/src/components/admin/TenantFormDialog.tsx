import { useState, useEffect, type FormEvent } from 'react'
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
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Switch } from '../ui/Switch'
import { Icons } from '../ui/Icons'
import type { Tenant } from '../../types'

interface TenantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: Tenant | null
  foodCourtId?: string
}

export function TenantFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  foodCourtId,
}: TenantFormDialogProps) {
  const isEdit = !!initialData
  const { error: toastError, success: toastSuccess } = useToast()

  const [name, setName] = useState('')
  const [stallNumber, setStallNumber] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [description, setDescription] = useState('')
  const [openingTime, setOpeningTime] = useState('09:00')
  const [closingTime, setClosingTime] = useState('21:00')
  const [isOpen, setIsOpen] = useState(true)
  const [logo, setLogo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setStallNumber(initialData.stallNumber || '')
      setOwnerId(initialData.ownerId || '')
      setDescription(initialData.description || '')
      setOpeningTime(initialData.openingTime ? initialData.openingTime.slice(0, 5) : '09:00')
      setClosingTime(initialData.closingTime ? initialData.closingTime.slice(0, 5) : '21:00')
      setIsOpen(initialData.isOpen ?? true)
      setLogo(initialData.logo || '')
    } else {
      setName('')
      setStallNumber('')
      setOwnerId('')
      setDescription('')
      setOpeningTime('09:00')
      setClosingTime('21:00')
      setIsOpen(true)
      setLogo('')
    }
    setErrors({})
  }, [initialData, open])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nama stan minimal 2 karakter'
    if (!stallNumber.trim()) errs.stallNumber = 'Nomor stan wajib diisi'
    if (!isEdit && !ownerId.trim()) errs.ownerId = 'ID Akun pemilik stan (tenant) wajib diisi'
    if (description && description.length > 500) errs.description = 'Deskripsi maksimal 500 karakter'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const token = getToken()
      if (!token) throw new Error('Autentikasi diperlukan')

      const formattedOpeningTime = openingTime.length === 5 ? `${openingTime}:00` : openingTime
      const formattedClosingTime = closingTime.length === 5 ? `${closingTime}:00` : closingTime

      if (isEdit && initialData) {
        await apiFetch(`/api/tenants/${initialData.id}`, {
          method: 'PUT',
          token,
          body: {
            name: name.trim(),
            stallNumber: stallNumber.trim(),
            description: description.trim() || null,
            openingTime: formattedOpeningTime,
            closingTime: formattedClosingTime,
            isOpen,
            logo: logo.trim() || null,
          },
        })
        toastSuccess('Stan Diperbarui', `Informasi kios ${name} telah disimpan.`)
      } else {
        await apiFetch('/api/tenants', {
          method: 'POST',
          token,
          body: {
            foodCourtId: foodCourtId || undefined,
            name: name.trim(),
            stallNumber: stallNumber.trim(),
            ownerId: ownerId.trim(),
            description: description.trim() || undefined,
            openingTime: formattedOpeningTime,
            closingTime: formattedClosingTime,
            isOpen,
            logo: logo.trim() || undefined,
          },
        })
        toastSuccess('Stan Terdaftar', `Stan ${name} (Nomor: ${stallNumber}) berhasil ditambahkan.`)
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan stan'
      if (msg.toLowerCase().includes('already occupied') || msg.toLowerCase().includes('stall number')) {
        setErrors((prev) => ({
          ...prev,
          stallNumber: `Nomor stan '${stallNumber}' sudah digunakan oleh kios aktif lain di food court ini.`,
        }))
      } else {
        toastError('Gagal Menyimpan', msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Stan Tenant' : 'Daftarkan Stan Baru'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Perbarui informasi gerai makanan, jam operasional, atau nomor stan.'
            : 'Tambahkan gerai makanan atau kios baru ke cabang food court.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="tenant-name" required>
            Nama Stan / Gerai Makanan
          </Label>
          <Input
            id="tenant-name"
            placeholder="Contoh: Warung Rawon Bu Siti"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
            }}
            error={!!errors.name}
            helperText={errors.name}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="stall-number" required>
              Nomor Stan / Lokasi Kios
            </Label>
            <Input
              id="stall-number"
              placeholder="STAN-A01"
              value={stallNumber}
              onChange={(e) => {
                setStallNumber(e.target.value)
                if (errors.stallNumber) setErrors((prev) => ({ ...prev, stallNumber: '' }))
              }}
              error={!!errors.stallNumber}
              helperText={errors.stallNumber}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="tenant-owner-id" required={!isEdit}>
              ID Akun Pemilik (User UUID)
            </Label>
            <Input
              id="tenant-owner-id"
              placeholder="UUID akun user role tenant"
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value)
                if (errors.ownerId) setErrors((prev) => ({ ...prev, ownerId: '' }))
              }}
              error={!!errors.ownerId}
              helperText={errors.ownerId}
              disabled={isLoading || isEdit}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="tenant-desc">Deskripsi Kuliner & Spesialisasi</Label>
          <textarea
            id="tenant-desc"
            rows={2}
            className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all disabled:opacity-50"
            placeholder="Spesialis rawon daging sapi empal khas Surabaya"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tenant-open-time">Jam Buka</Label>
            <Input
              id="tenant-open-time"
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="tenant-close-time">Jam Tutup</Label>
            <Input
              id="tenant-close-time"
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="tenant-logo">URL Foto / Logo Gerai</Label>
          <Input
            id="tenant-logo"
            type="url"
            placeholder="https://example.com/logo-rawon.jpg"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="pt-2 p-3 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
          <Switch
            id="tenant-is-open"
            checked={isOpen}
            onChange={setIsOpen}
            label="Status Buka Gerai Saat Ini"
            description="Jika ditutup, pelanggan tidak dapat memesan makanan dari kios ini"
            disabled={isLoading}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Icons.Refresh className="w-4 h-4 animate-spin" />
                Menyimpan Stan...
              </span>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Simpan Stan Tenant'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
