import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { apiFetch } from '../../api/client'
import { AuthVisualShowcase } from '../../components/auth/AuthVisualShowcase'
import type { LoginResponse } from '../../types'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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
    setErrorMessage(null)
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

      const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname

      if (stateFrom && !stateFrom.includes('/login')) {
        navigate(stateFrom, { replace: true })
        return
      }

      if (user.role === 'tenant') {
        navigate('/app/tenant/kds', { replace: true })
      } else if (user.role === 'admin-food-court' || user.role === 'admin') {
        navigate('/app/dashboard', { replace: true })
      } else {
        navigate('/app/profile', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kombinasi email dan kata sandi salah'
      setErrorMessage(msg)
      toastError('Gagal Masuk', msg)
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('password123')
    setErrorMessage(null)
    setFieldErrors({})
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#ffffff]">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 xl:p-16">
        <div className="w-full max-w-[380px] flex flex-col items-center">
          {/* Brand Mark: Food Court Minimal Squircle */}
          <div className="w-12 h-12 rounded-[16px] bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-lg font-mono tracking-tight shadow-md mb-6">
            FC
          </div>

          {/* Headings */}
          <h1 className="font-heading text-2xl sm:text-[26px] font-bold tracking-[-0.03em] text-[#0a0a0a] text-center">
            Amici Food Court
          </h1>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 mb-7 text-center">
            Silakan masuk untuk mengelola tenant, pesanan dapur, atau kasir.
          </p>

          {/* Google Login Button */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@foodcourt.com')}
              className="w-full h-11 px-4 rounded-[14px] border border-[#e5e5e5] bg-[#ffffff] hover:border-[#0a0a0a] hover:bg-[#fafafa] transition-all flex items-center justify-center gap-3 text-sm font-medium text-[#0a0a0a] cursor-pointer shadow-2xs group"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </button>
          </div>

          {/* Divider: OR */}
          <div className="relative w-full my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e5e5]" />
            </div>
            <span className="relative bg-[#ffffff] px-3 font-mono text-[11px] text-[#737373] uppercase tracking-wider">
              ATAU EMAIL
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@foodcourt.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
                  setErrorMessage(null)
                }}
                disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-[14px] bg-[#ffffff] border border-[#e5e5e5] focus:outline-none focus:border-[#0a0a0a] text-sm text-[#0a0a0a] placeholder:text-[#a3a3a3] transition-colors"
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-[#e7000b] mt-1 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password)
                      setFieldErrors((prev) => ({ ...prev, password: undefined }))
                    setErrorMessage(null)
                  }}
                  disabled={isLoading}
                  className={`w-full h-11 pl-3.5 pr-10 rounded-[14px] bg-[#ffffff] border ${
                    errorMessage ? 'border-[#e7000b]' : 'border-[#e5e5e5]'
                  } focus:outline-none focus:border-[#0a0a0a] text-sm text-[#0a0a0a] placeholder:text-[#a3a3a3] transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#0a0a0a] p-1 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Error line matching mockup (!) */}
              {errorMessage ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#e7000b] mt-1.5">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-shrink-0 fill-[#e7000b]">
                    <path d="M8 0a8 8 0 1 0 8 8A8 8 0 0 0 8 0zm0 12a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm1-4.5a1 1 0 0 1-2 0v-4a1 1 0 0 1 2 0z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              ) : fieldErrors.password ? (
                <p className="text-[11px] text-[#e7000b] mt-1 font-medium">{fieldErrors.password}</p>
              ) : null}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#0a0a0a] font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[4px] accent-[#0a0a0a] cursor-pointer"
                />
                <span>Ingat saya</span>
              </label>

              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Silakan hubungi administrator IT untuk reset kata sandi.')
                }}
                className="text-[#0a0a0a] hover:underline font-medium transition-colors"
              >
                Lupa kata sandi?
              </a>
            </div>

            {/* Continue CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-[14px] bg-[#0a0a0a] hover:bg-[#171717] active:scale-[0.99] text-white font-medium text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
            </button>
          </form>

          {/* Bottom Footers */}
          <div className="mt-8 text-center text-xs space-y-2">
            <a
              href="#trouble"
              onClick={(e) => {
                e.preventDefault()
                fillDemoAccount('admin@foodcourt.com')
              }}
              className="text-[#737373] hover:text-[#0a0a0a] transition-colors block font-medium"
            >
              Kendala masuk akun? Hubungi Admin
            </a>
            <div className="text-[#737373]">
              Belum punya akun pelanggan?{' '}
              <Link
                to="/register"
                className="text-[#0a0a0a] font-semibold underline underline-offset-2 hover:opacity-80"
              >
                Daftar di sini
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Diagram Showcase */}
      <div className="hidden lg:flex lg:w-1/2 p-6 lg:p-8 xl:p-12 items-center justify-center bg-[#ffffff]">
        <AuthVisualShowcase />
      </div>
    </div>
  )
}
