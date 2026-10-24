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
import { ImageUploadInput } from '../ui/ImageUploadInput'
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
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [description, setDescription] = useState('')
  const [openingTime, setOpeningTime] = useState('09:00')
  const [closingTime, setClosingTime] = useState('21:00')
  const [isOpen, setIsOpen] = useState(false)
  const [logo, setLogo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setStallNumber(initialData.stallNumber || '')
      setOwnerName(initialData.owner?.name || '')
      setOwnerEmail(initialData.owner?.email || '')
      setDescription(initialData.description || '')
      setOpeningTime(initialData.openingTime ? initialData.openingTime.slice(0, 5) : '09:00')
      setClosingTime(initialData.closingTime ? initialData.closingTime.slice(0, 5) : '21:00')
      setIsOpen(initialData.isOpen ?? false)
      setLogo(initialData.logo || '')
    } else {
      setName('')
      setStallNumber('')
      setOwnerName('')
      setOwnerEmail('')
      setDescription('')
      setOpeningTime('09:00')
      setClosingTime('21:00')
      setIsOpen(false)
      setLogo('')
    }
    setErrors({})
  }, [initialData, open])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nama stan minimal 2 karakter'
    if (!stallNumber.trim()) errs.stallNumber = 'Nomor stan wajib diisi'
    if (!isEdit) {
      if (!ownerName.trim()) errs.ownerName = 'Nama pemilik stan wajib diisi'
      if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
        errs.ownerEmail = 'Alamat email pemilik stan wajib diisi dengan benar'
      }
    }
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
            ownerName: ownerName.trim(),
            ownerEmail: ownerEmail.trim().toLowerCase(),
            description: description.trim() || undefined,
            openingTime: formattedOpeningTime,
            closingTime: formattedClosingTime,
            isOpen,
            logo: logo.trim() || undefined,
          },
        })
        toastSuccess(
          'Stan Terdaftar & Email Dikirim',
          `Stan ${name} berhasil ditambahkan. Tautan aktivasi akun telah dikirim ke ${ownerEmail}.`
        )
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
      } else if (msg.toLowerCase().includes('sudah terdaftar sebagai pemilik')) {
        setErrors((prev) => ({
          ...prev,
          ownerEmail: msg,
        }))
      } else {
        toastError('Gagal Menyimpan', msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="3xl">
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Stan Tenant' : 'Daftarkan Stan Baru'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Perbarui informasi gerai makanan, jam operasional, atau nomor stan.'
            : 'Tambahkan gerai makanan baru. Akun pemilik dan tautan aktivasi akan dibuat otomatis.'}
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

        {/* Owner Information Section */}
        {isEdit ? (
          <div className="p-3.5 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] space-y-1.5 text-xs">
            <p className="font-semibold text-[#0a0a0a]">Informasi Akun Pemilik Stan</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-[#0a0a0a]">
                  {initialData?.owner?.name || 'Belum Terhubung'}
                </p>
                <p className="text-[11px] font-mono text-[#737373]">
                  {initialData?.owner?.email || '-'}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  initialData?.owner?.status === 'ACTIVE'
                    ? 'bg-[#dcfce7] text-[#15803d]'
                    : 'bg-[#fef9c3] text-[#a16207]'
                }`}
              >
                {initialData?.owner?.status === 'ACTIVE'
                  ? 'Akun Aktif'
                  : 'Menunggu Aktivasi'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-[20px] bg-[#fafafa] border border-[#e5e5e5] space-y-3">
            <div className="flex items-center gap-2">
              <Icons.User className="w-4 h-4 text-[#0a0a0a]" />
              <p className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
                Akun Pemilik Stan Baru
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tenant-owner-name" required>
                  Nama Lengkap Pemilik
                </Label>
                <Input
                  id="tenant-owner-name"
                  placeholder="Contoh: Budi Santoso"
                  value={ownerName}
                  onChange={(e) => {
                    setOwnerName(e.target.value)
                    if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: '' }))
                  }}
                  error={!!errors.ownerName}
                  helperText={errors.ownerName}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="tenant-owner-email" required>
                  Alamat Email Pemilik
                </Label>
                <Input
                  id="tenant-owner-email"
                  type="email"
                  placeholder="budi@warungpadang.com"
                  value={ownerEmail}
                  onChange={(e) => {
                    setOwnerEmail(e.target.value)
                    if (errors.ownerEmail) setErrors((prev) => ({ ...prev, ownerEmail: '' }))
                  }}
                  error={!!errors.ownerEmail}
                  helperText={errors.ownerEmail}
                  disabled={isLoading}
                />
              </div>
            </div>

            <p className="text-[11px] text-[#737373] flex items-center gap-1.5 pt-1">
              <span>✉️</span>
              <span>
                Tautan aktivasi mandiri dan pembuatan kata sandi akan otomatis dikirimkan ke email ini (masa aktif 7 hari).
              </span>
            </p>
          </div>
        )}

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
          <ImageUploadInput
            label="Foto / Logo Gerai Stan"
            folder="tenants"
            value={logo}
            onChange={setLogo}
            aspectRatio="square"
            disabled={isLoading}
            helperText="Rasio 1:1 persegi, format JPG, PNG, atau WebP (Maksimal 1 MB)"
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
