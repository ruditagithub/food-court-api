import { useState, type FormEvent } from 'react'
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
import type { Role } from '../../types'

interface UserRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  allowedRoles?: Role[]
}

export function UserRegisterDialog({
  open,
  onOpenChange,
  onSuccess,
  allowedRoles = ['admin-food-court', 'tenant', 'admin', 'customer'],
}: UserRegisterDialogProps) {
  const { error: toastError, success: toastSuccess } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(allowedRoles[0] || 'tenant')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nama lengkap wajib diisi'
    if (!email.trim()) {
      errs.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Format email tidak valid'
    }
    if (!password) {
      errs.password = 'Kata sandi wajib diisi'
    } else if (password.length < 6) {
      errs.password = 'Kata sandi minimal 6 karakter'
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
      await apiFetch('/api/auth/register', {
        method: 'POST',
        token: token || undefined,
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        },
      })

      toastSuccess('Pengguna Didaftarkan', `Akun ${name} dengan role ${role} berhasil dibuat`)
      setName('')
      setEmail('')
      setPassword('')
      setRole(allowedRoles[0] || 'tenant')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftarkan pengguna'
      toastError('Registrasi Gagal', msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>Daftarkan Pengguna Baru</DialogTitle>
        <DialogDescription>
          Buat akun kredensial resmi untuk pengelola food court, staf kios, atau admin.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="admin-reg-name" required>
            Nama Lengkap
          </Label>
          <Input
            id="admin-reg-name"
            placeholder="Ahmad Fauzi"
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
          <Label htmlFor="admin-reg-email" required>
            Email Kerja Akun
          </Label>
          <Input
            id="admin-reg-email"
            type="email"
            placeholder="ahmad@foodcourt.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
            }}
            error={!!errors.email}
            helperText={errors.email}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="admin-reg-password" required>
            Kata Sandi Sementara
          </Label>
          <Input
            id="admin-reg-password"
            type="password"
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
            }}
            error={!!errors.password}
            helperText={errors.password}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="admin-reg-role" required>
            Peran Akses (Role)
          </Label>
          <Select
            id="admin-reg-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isLoading}
          >
            {allowedRoles.includes('admin-food-court') && (
              <option value="admin-food-court">Admin Food Court (Pengelola)</option>
            )}
            {allowedRoles.includes('tenant') && (
              <option value="tenant">Tenant (Pemilik Kios / Dapur)</option>
            )}
            {allowedRoles.includes('admin') && (
              <option value="admin">Super Admin (Platform)</option>
            )}
            {allowedRoles.includes('customer') && (
              <option value="customer">Customer (Pelanggan)</option>
            )}
          </Select>
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
                Mendaftarkan...
              </span>
            ) : (
              'Simpan Pengguna'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
