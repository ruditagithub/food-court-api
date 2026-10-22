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
import { Switch } from '../ui/Switch'
import { Icons } from '../ui/Icons'
import type { Menu } from '../../types'

interface MenuFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: Menu | null
  tenantId?: string
}

export function MenuFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  tenantId,
}: MenuFormDialogProps) {
  const isEdit = !!initialData
  const { error: toastError, success: toastSuccess } = useToast()

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('0')
  const [stock, setStock] = useState('50')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)

  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch tenant categories
  useEffect(() => {
    const fetchCats = async () => {
      if (!tenantId) return
      try {
        const res = await apiFetch<{ data: any[] }>(`/api/menus/categories/${tenantId}`)
        setCategories(res.data || [])
      } catch (err) {
        console.warn('Failed to load categories:', err)
      }
    }
    if (open && tenantId) {
      fetchCats()
    }
  }, [open, tenantId])

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setCategoryId(initialData.categoryId || '')
      setPrice(initialData.price !== undefined ? String(initialData.price) : '0')
      setStock(initialData.stock !== undefined ? String(initialData.stock) : '0')
      setDescription(initialData.description || '')
      setImageUrl(initialData.imageUrl || '')
      setIsAvailable(initialData.isAvailable ?? true)
    } else {
      setName('')
      setCategoryId('')
      setPrice('0')
      setStock('50')
      setDescription('')
      setImageUrl('')
      setIsAvailable(true)
    }
    setErrors({})
  }, [initialData, open])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nama menu minimal 2 karakter'
    const numPrice = Number(price)
    if (isNaN(numPrice) || numPrice < 0) {
      errs.price = 'Harga harus berupa angka bulat positif'
    }
    const numStock = Number(stock)
    if (isNaN(numStock) || numStock < 0) {
      errs.stock = 'Stok tidak boleh minus'
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

      const parsedPrice = Math.round(Number(price))
      const parsedStock = Math.round(Number(stock))

      if (isEdit && initialData) {
        await apiFetch(`/api/menus/${initialData.id}`, {
          method: 'PUT',
          token,
          body: {
            name: name.trim(),
            categoryId: categoryId || null,
            price: parsedPrice,
            stock: parsedStock,
            description: description.trim() || null,
            imageUrl: imageUrl.trim() || null,
            isAvailable,
          },
        })
        toastSuccess('Menu Diperbarui', `Menu "${name}" berhasil diperbarui.`)
      } else {
        await apiFetch('/api/menus', {
          method: 'POST',
          token,
          body: {
            tenantId,
            categoryId: categoryId || undefined,
            name: name.trim(),
            price: parsedPrice,
            stock: parsedStock,
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            isAvailable,
          },
        })
        toastSuccess('Menu Dibuat', `Menu "${name}" berhasil ditambahkan ke katalog.`)
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan menu'
      toastError('Gagal Menyimpan', msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Item Menu' : 'Tambah Menu Baru'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Perbarui harga, ketersediaan, atau resep sajian gerai Anda.'
            : 'Masukkan menu makanan atau minuman baru ke daftar sajian gerai Anda.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="menu-name" required>
            Nama Menu Makanan / Minuman
          </Label>
          <Input
            id="menu-name"
            placeholder="Contoh: Rawon Komplit Empal"
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
            <Label htmlFor="menu-category">Kategori Menu</Label>
            <Select
              id="menu-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Pilih Kategori (Opsional)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="menu-price" required>
              Harga Jual (Rp)
            </Label>
            <Input
              id="menu-price"
              type="number"
              placeholder="32000"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value)
                if (errors.price) setErrors((prev) => ({ ...prev, price: '' }))
              }}
              error={!!errors.price}
              helperText={errors.price}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="menu-stock">Stok Porsi Harian</Label>
            <Input
              id="menu-stock"
              type="number"
              placeholder="50"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value)
                if (errors.stock) setErrors((prev) => ({ ...prev, stock: '' }))
              }}
              error={!!errors.stock}
              helperText={errors.stock}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="menu-image">URL Foto Menu</Label>
            <Input
              id="menu-image"
              type="url"
              placeholder="https://example.com/rawon.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="menu-desc">Deskripsi Porsi & Rasa</Label>
          <textarea
            id="menu-desc"
            rows={2}
            className="w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2.5 border border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a] outline-none transition-all disabled:opacity-50"
            placeholder="Nasi rawon kuah hitam dengan daging empal gurih & telur asin"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="p-3 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5]">
          <Switch
            id="menu-is-available"
            checked={isAvailable}
            onChange={setIsAvailable}
            label="Tersedia untuk Dipesan Pelanggan"
            description="Jika dimatikan, menu akan ditandai 'Habis' pada aplikasi pemesanan meja"
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
                Menyimpan...
              </span>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Simpan Item Menu'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
