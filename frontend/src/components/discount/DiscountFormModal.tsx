import { useState, useEffect, type FormEvent } from 'react'
import type { Discount, FoodCourt, Tenant, Role, CreateDiscountInput } from '../../types'
import { apiFetch, getToken } from '../../api/client'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Switch } from '../ui/Switch'
import { Icons } from '../ui/Icons'

interface DiscountFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (discount: Discount) => void
  discountToEdit?: Discount | null
  currentRole: Role
  defaultFoodCourtId?: string
  defaultTenantId?: string
}

export function DiscountFormModal({
  isOpen,
  onClose,
  onSaved,
  discountToEdit,
  currentRole,
  defaultFoodCourtId = '',
  defaultTenantId = '',
}: DiscountFormModalProps) {
  const isEditing = !!discountToEdit

  // Form State
  const [foodCourtId, setFoodCourtId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [scope, setScope] = useState<'FOOD_COURT' | 'TENANT'>('FOOD_COURT')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE')
  const [value, setValue] = useState<number>(10)
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('')
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0)
  const [isPublic, setIsPublic] = useState(true)
  const [usageLimit, setUsageLimit] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')

  // Options lists
  const [foodCourtsList, setFoodCourtsList] = useState<FoodCourt[]>([])
  const [tenantsList, setTenantsList] = useState<Tenant[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null)
      return
    }

    if (discountToEdit) {
      setFoodCourtId(discountToEdit.foodCourtId || '')
      setTenantId(discountToEdit.tenantId || '')
      setScope(discountToEdit.scope)
      setName(discountToEdit.name)
      setCode(discountToEdit.code || '')
      setDescription(discountToEdit.description || '')
      setType(discountToEdit.type)
      setValue(discountToEdit.value)
      setMaxDiscountAmount(discountToEdit.maxDiscountAmount ? String(discountToEdit.maxDiscountAmount) : '')
      setMinOrderAmount(discountToEdit.minOrderAmount || 0)
      setIsPublic(discountToEdit.isPublic ?? true)
      setUsageLimit(discountToEdit.usageLimit ? String(discountToEdit.usageLimit) : '')
      
      // Format to datetime-local
      const toLocalISO = (dStr: string) => {
        try {
          const d = new Date(dStr)
          const offset = d.getTimezoneOffset() * 60000
          return new Date(d.getTime() - offset).toISOString().slice(0, 16)
        } catch {
          return ''
        }
      }
      setStartDate(toLocalISO(discountToEdit.startDate))
      setEndDate(toLocalISO(discountToEdit.endDate))
      setStatus(discountToEdit.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE')
    } else {
      // Default New Discount
      const now = new Date()
      const offset = now.getTimezoneOffset() * 60000
      const localNow = new Date(now.getTime() - offset).toISOString().slice(0, 16)
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000 - offset).toISOString().slice(0, 16)

      setFoodCourtId(defaultFoodCourtId)
      setTenantId(defaultTenantId)
      setScope(currentRole === 'tenant' ? 'TENANT' : 'FOOD_COURT')
      setName('')
      setCode('')
      setDescription('')
      setType('PERCENTAGE')
      setValue(10)
      setMaxDiscountAmount('')
      setMinOrderAmount(0)
      setIsPublic(true)
      setUsageLimit('')
      setStartDate(localNow)
      setEndDate(nextMonth)
      setStatus('ACTIVE')
    }
  }, [isOpen, discountToEdit, defaultFoodCourtId, defaultTenantId, currentRole])

  // Fetch food courts for Super Admin
  useEffect(() => {
    if (!isOpen) return
    const token = getToken()

    if (currentRole === 'admin') {
      apiFetch<{ data: FoodCourt[] }>('/api/food-courts', { token: token || undefined })
        .then((res) => {
          if (res.data) {
            setFoodCourtsList(res.data)
            if (!foodCourtId && res.data.length > 0) {
              setFoodCourtId(res.data[0].id)
            }
          }
        })
        .catch(() => {})
    }
  }, [isOpen, currentRole])

  // Fetch tenants for selected food court
  useEffect(() => {
    if (!isOpen || currentRole === 'tenant') return
    const targetFcId = foodCourtId || defaultFoodCourtId
    if (!targetFcId) return

    const token = getToken()
    apiFetch<{ data: Tenant[] }>(`/api/tenants?foodCourtId=${targetFcId}`, { token: token || undefined })
      .then((res) => {
        if (res.data) {
          setTenantsList(res.data)
        }
      })
      .catch(() => {})
  }, [isOpen, foodCourtId, defaultFoodCourtId, currentRole])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!name.trim()) {
      setErrorMsg('Nama promo wajib diisi')
      return
    }

    if (!foodCourtId && currentRole === 'admin') {
      setErrorMsg('Pilih cabang Food Court terlebih dahulu')
      return
    }

    if (scope === 'TENANT' && !tenantId) {
      setErrorMsg('Pilih gerai tenant untuk promo dengan lingkup Stan')
      return
    }

    if (type === 'PERCENTAGE' && (value <= 0 || value > 100)) {
      setErrorMsg('Persentase diskon harus di antara 1% sampai 100%')
      return
    }

    if (type === 'FIXED_AMOUNT' && value <= 0) {
      setErrorMsg('Nominal potongan diskon harus lebih besar dari 0')
      return
    }

    if (!startDate || !endDate) {
      setErrorMsg('Tanggal mulai dan berakhir wajib diisi')
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setErrorMsg('Tanggal mulai harus lebih awal dari tanggal berakhir')
      return
    }

    setIsSubmitting(true)
    try {
      const token = getToken()
      const payload: CreateDiscountInput = {
        foodCourtId: foodCourtId || defaultFoodCourtId,
        tenantId: scope === 'TENANT' ? tenantId || defaultTenantId : null,
        code: code.trim() ? code.trim().toUpperCase() : null,
        name: name.trim(),
        description: description.trim() || null,
        scope,
        type,
        value: Number(value),
        maxDiscountAmount: maxDiscountAmount && Number(maxDiscountAmount) > 0 ? Number(maxDiscountAmount) : null,
        minOrderAmount: Number(minOrderAmount) || 0,
        isPublic,
        usageLimit: usageLimit && Number(usageLimit) > 0 ? Number(usageLimit) : null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status,
      }

      let res
      if (isEditing && discountToEdit) {
        res = await apiFetch<{ data: Discount }>(`/api/discounts/${discountToEdit.id}`, {
          method: 'PUT',
          token: token || undefined,
          body: payload,
        })
      } else {
        res = await apiFetch<{ data: Discount }>('/api/discounts', {
          method: 'POST',
          token: token || undefined,
          body: payload,
        })
      }

      if (res.data) {
        onSaved(res.data)
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data promo'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()} size="xl">
      <DialogClose onClick={() => !isSubmitting && onClose()} />
      <DialogHeader>
        <div className="pr-6">
          <DialogTitle>
            {isEditing ? 'Perbarui Konfigurasi Promo' : 'Buat Promo & Voucher Baru'}
          </DialogTitle>
          <p className="text-xs text-[#737373] mt-0.5">
            Atur aturan potongan harga, kuota penggunaan, dan masa berlaku voucher.
          </p>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {errorMsg && (
          <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* 1. Branch and Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentRole === 'admin' ? (
            <div>
              <Label required>Cabang Food Court</Label>
              <select
                value={foodCourtId}
                onChange={(e) => {
                  setFoodCourtId(e.target.value)
                  setTenantId('')
                }}
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-[12px] bg-white border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none"
              >
                <option value="">Pilih Cabang Food Court</option>
                {foodCourtsList.map((fc) => (
                  <option key={fc.id} value={fc.id}>
                    {fc.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {currentRole !== 'tenant' ? (
            <div>
              <Label required>Lingkup Promo</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <label className="flex items-center gap-2 text-xs text-[#0a0a0a] cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="FOOD_COURT"
                    checked={scope === 'FOOD_COURT'}
                    onChange={() => {
                      setScope('FOOD_COURT')
                      setTenantId('')
                    }}
                    disabled={isSubmitting}
                    className="accent-[#0a0a0a]"
                  />
                  <span>Semua Menu Food Court</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#0a0a0a] cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="TENANT"
                    checked={scope === 'TENANT'}
                    onChange={() => setScope('TENANT')}
                    disabled={isSubmitting}
                    className="accent-[#0a0a0a]"
                  />
                  <span>Khusus Gerai Tertentu</span>
                </label>
              </div>
            </div>
          ) : (
            <div>
              <Label>Lingkup Promo</Label>
              <div className="p-2.5 rounded-[12px] bg-[#f5f5f5] text-xs font-semibold text-[#0a0a0a]">
                Khusus Gerai Stan Anda
              </div>
            </div>
          )}
        </div>

        {/* Tenant selector if scope is TENANT and user is not tenant */}
        {scope === 'TENANT' && currentRole !== 'tenant' && (
          <div>
            <Label required>Pilih Stan Gerai</Label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-10 px-3 rounded-[12px] bg-white border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none"
            >
              <option value="">Pilih Stan Gerai</option>
              {tenantsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Kios {t.stallNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2. Basic Info: Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="promo-name" required>
              Nama Promo
            </Label>
            <Input
              id="promo-name"
              placeholder="Contoh: Diskon Jam Makan Siang 20%"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="promo-code">Kode Voucher (Opsional)</Label>
            <Input
              id="promo-code"
              placeholder="Contoh: SIANG20"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
              disabled={isSubmitting}
              className="font-mono uppercase font-semibold"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="promo-desc">Deskripsi Singkat (Opsional)</Label>
          <textarea
            id="promo-desc"
            rows={2}
            placeholder="Keterangan syarat atau deskripsi promo untuk customer..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className="w-full p-2.5 rounded-[12px] bg-white border border-[#e5e5e5] text-xs text-[#0a0a0a] outline-none resize-none"
          />
        </div>

        {/* 3. Discount Math: Type, Value, Max, Min */}
        <div className="p-4 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Tipe Potongan Diskon</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <label className="flex items-center gap-2 text-xs text-[#0a0a0a] cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="PERCENTAGE"
                    checked={type === 'PERCENTAGE'}
                    onChange={() => setType('PERCENTAGE')}
                    disabled={isSubmitting}
                    className="accent-[#0a0a0a]"
                  />
                  <span>Persentase (%)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#0a0a0a] cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="FIXED_AMOUNT"
                    checked={type === 'FIXED_AMOUNT'}
                    onChange={() => setType('FIXED_AMOUNT')}
                    disabled={isSubmitting}
                    className="accent-[#0a0a0a]"
                  />
                  <span>Nominal Tetap (Rp)</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="discount-val" required>
                {type === 'PERCENTAGE' ? 'Nilai Persentase (%)' : 'Besaran Potongan (Rp)'}
              </Label>
              <Input
                id="discount-val"
                type="number"
                min={1}
                max={type === 'PERCENTAGE' ? 100 : undefined}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                disabled={isSubmitting}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type === 'PERCENTAGE' ? (
              <div>
                <Label htmlFor="max-disc">Maksimal Potongan Rp (Opsional)</Label>
                <Input
                  id="max-disc"
                  type="number"
                  placeholder="Kosongkan jika tanpa batas"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="font-mono"
                />
              </div>
            ) : null}

            <div>
              <Label htmlFor="min-order">Minimal Belanja (Rp)</Label>
              <Input
                id="min-order"
                type="number"
                min={0}
                placeholder="0 untuk tanpa minimum belanja"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                disabled={isSubmitting}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* 4. Limits & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="usage-limit">Batas Kuota Pemakaian (Opsional)</Label>
            <Input
              id="usage-limit"
              type="number"
              placeholder="Contoh: 100"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              disabled={isSubmitting}
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="start-date" required>
              Tanggal Mulai
            </Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSubmitting}
              className="text-xs"
            />
          </div>

          <div>
            <Label htmlFor="end-date" required>
              Tanggal Berakhir
            </Label>
            <Input
              id="end-date"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isSubmitting}
              className="text-xs"
            />
          </div>
        </div>

        {/* 5. Visibility and Active Toggles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-[16px] bg-[#fafafa] border border-[#e5e5e5]">
          <div className="flex items-center gap-3">
            <Switch
              checked={isPublic}
              onChange={setIsPublic}
              disabled={isSubmitting}
            />
            <div>
              <span className="text-xs font-bold text-[#0a0a0a] block">
                Tampilkan di Daftar Voucher Publik
              </span>
              <span className="text-[11px] text-[#737373]">
                Customer dapat melihat dan mengklik voucher ini langsung di halaman pemesanan.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#737373]">Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={isSubmitting}
              className="h-8.5 px-2.5 rounded-[10px] bg-white border border-[#e5e5e5] text-xs font-bold text-[#0a0a0a]"
            >
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-bold h-10 rounded-[14px] px-4"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="text-xs font-bold h-10 rounded-[14px] px-5 gap-1.5"
          >
            {isSubmitting ? (
              <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Icons.Check className="w-3.5 h-3.5" />
            )}
            <span>{isEditing ? 'Simpan Perubahan' : 'Buat Promo Sekarang'}</span>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
