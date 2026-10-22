import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { apiFetch } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card } from '../../components/ui/Card'
import { Icons } from '../../components/ui/Icons'
import type { LoginResponse } from '../../types'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errors: { email?: string; password?: string } = {}
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

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const response = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      const { token, user } = response.data
      login(token, user)
      toastSuccess('Berhasil Masuk', `Selamat datang kembali, ${user.name}!`)

      // Check for redirect state (e.g. from table scan or checkout)
      const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname

      if (stateFrom && !stateFrom.includes('/login')) {
        navigate(stateFrom, { replace: true })
        return
      }

      // Role-based redirection
      if (user.role === 'tenant') {
        navigate('/app/tenant/kds', { replace: true })
      } else if (user.role === 'admin-food-court') {
        navigate('/app/admin/food-court', { replace: true })
      } else if (user.role === 'admin') {
        navigate('/app/super-admin/food-courts', { replace: true })
      } else {
        // Customer
        navigate('/app/profile', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk ke akun'
      toastError('Gagal Masuk', msg)
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
            Masuk ke Portal
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Gunakan akun staf, pengelola kios, atau pelanggan Anda
          </p>
        </div>

        {/* Login Card */}
        <Card surface="paper" className="w-full">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" required>
                Email Pengguna
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@foodcourt.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password" required className="!mb-0">
                  Kata Sandi
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password)
                      setFieldErrors((prev) => ({ ...prev, password: undefined }))
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
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  {showPassword ? (
                    <Icons.EyeOff className="w-4 h-4" />
                  ) : (
                    <Icons.Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
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
                  Memverifikasi...
                </span>
              ) : (
                'Masuk ke Akun'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e5e5e5] text-center space-y-2">
            <p className="text-xs text-[#737373]">
              Belum punya akun?{' '}
              <Link
                to="/register"
                className="text-[#0a0a0a] font-semibold underline underline-offset-2 hover:opacity-80"
              >
                Daftar sebagai Pelanggan
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
