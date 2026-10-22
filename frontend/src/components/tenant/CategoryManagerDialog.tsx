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
import { Badge } from '../ui/Badge'
import { Icons } from '../ui/Icons'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId?: string
  onCategoriesChanged?: () => void
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  tenantId,
  onCategoriesChanged,
}: CategoryManagerDialogProps) {
  const { error: toastError, success: toastSuccess } = useToast()
  const [categories, setCategories] = useState<any[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCategories = async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const res = await apiFetch<{ data: any[] }>(`/api/menus/categories/${tenantId}`)
      setCategories(res.data || [])
    } catch (err) {
      console.warn('Failed to load categories:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && tenantId) {
      fetchCategories()
    }
  }, [open, tenantId])

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    if (!tenantId) {
      toastError('Gagal', 'ID stan tenant tidak terdeteksi')
      return
    }

    setIsSubmitting(true)
    try {
      const token = getToken()
      await apiFetch('/api/menus/categories', {
        method: 'POST',
        token: token || undefined,
        body: {
          tenantId,
          name: newCategoryName.trim(),
        },
      })
      toastSuccess('Kategori Dibuat', `Kategori "${newCategoryName}" berhasil ditambahkan.`)
      setNewCategoryName('')
      fetchCategories()
      onCategoriesChanged?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat kategori'
      toastError('Gagal Menambah Kategori', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>Kelola Kategori Menu</DialogTitle>
        <DialogDescription>
          Buat dan rapikan pengelompokan menu gerai Anda (misal: Makanan Utama, Minuman Segar, Camilan)
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Form add category */}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-cat-name" className="sr-only">
              Nama Kategori Baru
            </Label>
            <Input
              id="new-cat-name"
              placeholder="Contoh: Paket Hemat / Kopi"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" variant="primary" disabled={isSubmitting || !newCategoryName.trim()}>
            {isSubmitting ? 'Menyimpan...' : 'Tambah'}
          </Button>
        </form>

        {/* Existing categories list */}
        <div className="pt-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#737373] block mb-2">
            Kategori Aktif ({categories.length})
          </span>

          {isLoading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#737373]">
              <Icons.Refresh className="w-4 h-4 animate-spin" />
              Memuat kategori...
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-[#737373] py-4 text-center">
              Belum ada kategori yang dibuat. Tambahkan kategori pertama Anda di atas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {categories.map((cat) => (
                <Badge key={cat.id} variant="soft" className="px-3 py-1 text-xs">
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
