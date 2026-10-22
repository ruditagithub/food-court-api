import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { apiFetch } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card } from '../../components/ui/Card'
import { Icons } from '../../components/ui/Icons'
import type { LoginResponse } from '../../types'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!name.trim()) {
      errors.name = 'Nama lengkap wajib diisi'
    } else if (name.trim().length < 2) {
      errors.name = 'Nama minimal 2 karakter'
    }

    if (!email.trim()) {
      errors.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Format email tidak valid'
    }

    if (!password) {
      errors.password = 'Kata sandi wajib diisi'
    } else if (password.length < 6) {
      errors.password = 'Kata sandi minimal 6 karakter'
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      // Register with fixed customer role
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          role: 'customer',
        },
      })

      toastSuccess('Pendaftaran Berhasil', 'Akun Anda berhasil dibuat. Sedang masuk otomatis...')

      // Auto-login
      try {
        const loginRes = await apiFetch<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: { email: email.trim(), password },
        })
        login(loginRes.data.token, loginRes.data.user)
        navigate('/app/profile', { replace: true })
      } catch {
        navigate('/login', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pendaftaran gagal'
      toastError('Gagal Mendaftar', msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-2 group">
            <span className="w-9 h-9 rounded-[18px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
              FC
            </span>
            <span className="font-semibold text-lg tracking-tight text-[#0a0a0a]">
              FoodCourt OS
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a]">
            Daftar Akun Pelanggan
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Pesan makanan lebih cepat, simpan pesanan dan riwayat makan
          </p>
        </div>

        {/* Register Card */}
        <Card surface="paper" className="w-full">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Nama Lengkap
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Contoh: Rizky Ramadhan"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                }}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="email" required>
                Alamat Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="rizky@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }))
                }}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password" required>
                Kata Sandi
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password)
                      setFieldErrors((prev) => ({ ...prev, password: '' }))
                  }}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#737373] hover:text-[#0a0a0a] transition-colors p-1"
                >
                  {showPassword ? (
                    <Icons.EyeOff className="w-4 h-4" />
                  ) : (
                    <Icons.Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" required>
                Ulangi Kata Sandi
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Masukkan kembali kata sandi"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword)
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                }}
                error={!!fieldErrors.confirmPassword}
                helperText={fieldErrors.confirmPassword}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Icons.Refresh className="w-4 h-4 animate-spin" />
                  Membuat Akun...
                </span>
              ) : (
                'Daftar Sekarang'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e5e5e5] text-center space-y-2">
            <p className="text-xs text-[#737373]">
              Sudah punya akun?{' '}
              <Link
                to="/login"
                className="text-[#0a0a0a] font-semibold underline underline-offset-2 hover:opacity-80"
              >
                Masuk di sini
              </Link>
            </p>
            <p className="text-xs">
              <Link
                to="/"
                className="text-[#737373] hover:text-[#0a0a0a] transition-colors"
              >
                ← Kembali ke Beranda
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
