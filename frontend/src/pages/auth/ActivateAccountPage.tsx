import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { apiFetch, setToken } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Icons } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'

interface TokenData {
  email: string
  name: string
  tenantName: string
  stallNumber: string
  foodCourtName: string
}

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { error: toastError, success: toastSuccess } = useToast()

  const [isLoadingToken, setIsLoadingToken] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<TokenData | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setIsLoadingToken(false)
      setTokenError('Token aktivasi tidak ditemukan. Silakan periksa kembali tautan di email Anda.')
      return
    }

    const verify = async () => {
      try {
        const res = await apiFetch<{ valid: boolean; data: TokenData }>(
          `/api/auth/verify-activation-token?token=${encodeURIComponent(token)}`
        )
        if (res.valid && res.data) {
          setTokenData(res.data)
        } else {
          setTokenError('Tautan aktivasi tidak valid atau telah digunakan.')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Tautan aktivasi tidak valid atau telah kedaluwarsa'
        setTokenError(msg)
      } finally {
        setIsLoadingToken(false)
      }
    }

    verify()
  }, [token])

  const validate = () => {
    const errs: { password?: string; confirmPassword?: string } = {}
    if (!password) {
      errs.password = 'Kata sandi wajib diisi'
    } else if (password.length < 6) {
      errs.password = 'Kata sandi minimal 6 karakter'
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Konfirmasi kata sandi tidak cocok'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await apiFetch<{
        message: string
        data: { token: string; user: { id: string; name: string; email: string; role: string } }
      }>('/api/auth/activate-account', {
        method: 'POST',
        body: {
          token,
          password,
        },
      })

      if (res.data?.token) {
        setToken(res.data.token)
        setIsSuccess(true)
        toastSuccess('Akun Berhasil Diaktifkan!', `Selamat datang di FoodCourt OS, ${res.data.user.name}.`)
        setTimeout(() => {
          navigate('/app/tenant/profile')
        }, 1500)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengaktifkan akun'
      toastError('Aktivasi Gagal', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-4 sm:p-6 text-[#0a0a0a]">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <span className="w-10 h-10 rounded-[14px] bg-[#0a0a0a] text-white inline-flex items-center justify-center font-black text-sm mb-2 shadow-sm">
          FC
        </span>
        <h1 className="text-xl font-black tracking-tight text-[#0a0a0a]">
          FoodCourt OS
        </h1>
        <p className="text-xs text-[#737373] font-mono mt-0.5">
          Portal Aktivasi Pemilik Gerai Kuliner
        </p>
      </div>

      <Card surface="paper" className="w-full max-w-md !p-6 sm:!p-8 shadow-sm">
        {isLoadingToken ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <Icons.Refresh className="w-6 h-6 animate-spin text-[#0a0a0a]" />
            <p className="text-xs font-mono text-[#737373]">
              Memvalidasi tautan aktivasi email Anda...
            </p>
          </div>
        ) : tokenError ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#fff0f0] text-[#e7000b] flex items-center justify-center mx-auto">
              <Icons.AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0a0a0a]">
                Tautan Tidak Valid atau Kedaluwarsa
              </h2>
              <p className="text-xs text-[#737373] mt-1.5 max-w-xs mx-auto leading-relaxed">
                {tokenError}
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="outline" className="w-full text-xs">
                  Kembali ke Halaman Masuk
                </Button>
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center mx-auto">
              <Icons.Check className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0a0a0a]">
                Akun Berhasil Diaktifkan!
              </h2>
              <p className="text-xs text-[#737373] mt-1.5 leading-relaxed">
                Kata sandi baru Anda telah tersimpan. Mengalihkan langsung ke dashboard tenant Anda...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#737373] pt-2">
              <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
              <span>Membuka profil stan...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header info */}
            <div>
              <h2 className="text-lg font-black tracking-tight text-[#0a0a0a]">
                Aktivasi Akun Pemilik
              </h2>
              <p className="text-xs text-[#737373] mt-1">
                Halo, <span className="font-semibold text-[#0a0a0a]">{tokenData?.name}</span>! Buat kata sandi untuk mengaktifkan akun Anda.
              </p>
            </div>

            {/* Stall Summary Box */}
            <div className="p-3.5 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Stan Makanan:</span>
                <span className="font-bold text-[#0a0a0a]">{tokenData?.tenantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Nomor Kios:</span>
                <span className="font-mono font-bold text-[#0a0a0a]">{tokenData?.stallNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">Lokasi:</span>
                <span className="text-[#0a0a0a] font-medium">{tokenData?.foodCourtName}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#e5e5e5]">
                <span className="text-[#737373]">Email Login:</span>
                <span className="font-mono text-[#0a0a0a] font-semibold">{tokenData?.email}</span>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="act-password" required>
                  Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Input
                    id="act-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    error={!!errors.password}
                    helperText={errors.password}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-[#737373] hover:text-[#0a0a0a] text-xs font-mono"
                  >
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="act-confirm-password" required>
                  Ulangi Kata Sandi
                </Label>
                <Input
                  id="act-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ketik ulang kata sandi di atas"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: '' }))
                  }}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center gap-2 py-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Icons.Refresh className="w-4 h-4 animate-spin" />
                      <span>Mengaktifkan Akun...</span>
                    </>
                  ) : (
                    <span>Aktifkan Akun & Masuk</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>
    </div>
  )
}
