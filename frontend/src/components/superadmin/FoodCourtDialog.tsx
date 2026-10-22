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
import { Select } from '../ui/Select'
import { Icons } from '../ui/Icons'
import type { FoodCourt } from '../../types'

interface FoodCourtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: FoodCourt | null
}

export function FoodCourtDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: FoodCourtDialogProps) {
  const isEdit = !!initialData
  const { error: toastError, success: toastSuccess } = useToast()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [logo, setLogo] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Compute live slug preview
  const slugPreview = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setAddress(initialData.address || '')
      setPhone(initialData.phone || '')
      setLogo(initialData.logo || '')
      setStatus(initialData.status || 'ACTIVE')
    } else {
      setName('')
      setAddress('')
      setPhone('')
      setLogo('')
      setStatus('ACTIVE')
    }
    setErrors({})
  }, [initialData, open])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) {
      errs.name = 'Nama food court minimal 2 karakter'
    } else if (name.trim().length < 2) {
      errs.name = 'Nama food court minimal 2 karakter'
    }

    if (phone && phone.length > 30) {
      errs.phone = 'Nomor telepon maksimal 30 karakter'
    }

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

      if (isEdit && initialData) {
        await apiFetch(`/api/food-courts/${initialData.id}`, {
          method: 'PUT',
          token,
          body: {
            name: name.trim(),
            address: address.trim() || null,
            phone: phone.trim() || null,
            logo: logo.trim() || null,
            status,
          },
        })
        toastSuccess('Berhasil Diperbarui', `Data food court ${name} telah disimpan.`)
      } else {
        await apiFetch('/api/food-courts', {
          method: 'POST',
          token,
          body: {
            name: name.trim(),
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            logo: logo.trim() || undefined,
          },
        })
        toastSuccess('Berhasil Didaftarkan', `Cabang ${name} berhasil ditambahkan ke platform.`)
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      if (msg.toLowerCase().includes('slug already exists') || msg.toLowerCase().includes('conflict')) {
        setErrors((prev) => ({
          ...prev,
          name: 'Food court dengan nama / slug ini sudah ada. Gunakan nama yang berbeda.',
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
        <DialogTitle>
          {isEdit ? 'Perbarui Cabang Food Court' : 'Daftarkan Cabang Food Court'}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Perbarui informasi kontak, alamat, atau status operasional cabang.'
            : 'Masukkan identitas lokasi food court baru. URL slug publik akan di-generate otomatis.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fc-name" required>
            Nama Resmi Cabang Food Court
          </Label>
          <Input
            id="fc-name"
            placeholder="Contoh: Grand City Food Court @Lantai 2"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
            }}
            error={!!errors.name}
            helperText={errors.name}
            disabled={isLoading}
          />
          {slugPreview && (
            <p className="mt-1.5 text-xs text-[#737373] font-mono">
              Slug Publik: <span className="text-[#0a0a0a] font-semibold">{slugPreview}</span>
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="fc-address">Alamat Lengkap Lokasi</Label>
          <textarea
            id="fc-address"
            rows={2}
            className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all disabled:opacity-50"
            placeholder="Jl. Pemuda No. 10, Surabaya"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fc-phone">Nomor Telepon Kontak</Label>
            <Input
              id="fc-phone"
              type="tel"
              placeholder="081234567890"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }))
              }}
              error={!!errors.phone}
              helperText={errors.phone}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="fc-status">Status Operasional</Label>
            <Select
              id="fc-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              disabled={isLoading}
            >
              <option value="ACTIVE">Aktif (ACTIVE)</option>
              <option value="INACTIVE">Nonaktif (INACTIVE)</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="fc-logo">URL Logo / Foto Cabang</Label>
          <Input
            id="fc-logo"
            type="url"
            placeholder="https://example.com/logo.jpg"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
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
                Menyimpan Data...
              </span>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Simpan Cabang Food Court'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
