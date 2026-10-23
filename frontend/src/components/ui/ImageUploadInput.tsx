import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { apiUpload, getToken } from '../../api/client'
import { useToast } from './Toast'
import { Label } from './Label'
import { Input } from './Input'
import { Badge } from './Badge'
import {
  UploadCloud,
  Trash2,
  RefreshCw,
  Link,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

export interface ImageUploadInputProps {
  value?: string
  onChange: (url: string) => void
  folder?: 'menus' | 'tenants' | 'food-courts'
  label?: string
  error?: string
  disabled?: boolean
  helperText?: string
  aspectRatio?: 'square' | 'video' | 'auto'
}

const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1 MB (1.048.576 bytes)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ImageUploadInput({
  value = '',
  onChange,
  folder = 'menus',
  label = 'Foto / Gambar',
  error,
  disabled = false,
  helperText,
  aspectRatio = 'auto',
}: ImageUploadInputProps) {
  const { error: toastError, success: toastSuccess } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const validateAndUpload = async (file: File) => {
    setLocalError(null)

    // 1. Client-Side Pre-Validation: Max 1 MB Limit
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
      const errorMsg = `Ukuran file melebihi batas 1 MB (Terdeteksi ${sizeMb} MB). Silakan kompres gambar terlebih dahulu.`
      setLocalError(errorMsg)
      toastError('File Terlalu Besar', errorMsg)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 2. Client-Side Pre-Validation: Mime Type Check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const errorMsg = 'Format file tidak didukung! Hanya file gambar JPG, PNG, atau WebP yang diizinkan.'
      setLocalError(errorMsg)
      toastError('Format Tidak Didukung', errorMsg)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 3. Upload to backend
    setIsUploading(true)
    try {
      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const res = await apiUpload<{ url: string; filename: string; size: number }>(
        formData,
        token || undefined
      )

      if (res.data?.url) {
        onChange(res.data.url)
        toastSuccess('Gambar Berhasil Diunggah', 'File tersimpan di server lokal.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah file'
      setLocalError(msg)
      toastError('Gagal Mengunggah', msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndUpload(file)
    }
  }

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && !disabled && !isUploading) {
      validateAndUpload(file)
    }
  }

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'w-24 sm:w-28 aspect-square'
      case 'video':
        return 'w-40 sm:w-52 aspect-video'
      default:
        return 'h-24 sm:h-28 w-auto'
    }
  }

  const displayError = error || localError

  return (
    <div className="space-y-2">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        {label && <Label className="!mb-0">{label}</Label>}

        <div className="flex items-center bg-[#f0f0f0] p-0.5 rounded-[10px] text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2.5 py-0.5 rounded-[8px] transition-all cursor-pointer ${
              mode === 'upload'
                ? 'bg-white text-[#0a0a0a] shadow-xs font-semibold'
                : 'text-[#737373] hover:text-[#0a0a0a]'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2.5 py-0.5 rounded-[8px] transition-all cursor-pointer ${
              mode === 'url'
                ? 'bg-white text-[#0a0a0a] shadow-xs font-semibold'
                : 'text-[#737373] hover:text-[#0a0a0a]'
            }`}
          >
            URL Manual
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        /* Manual URL Mode */
        <div className="relative">
          <Input
            type="url"
            placeholder="https://example.com/foto-makanan.webp"
            value={value}
            onChange={(e) => {
              setLocalError(null)
              onChange(e.target.value)
            }}
            disabled={disabled || isUploading}
            error={!!displayError}
            className="pl-9"
          />
          <Link className="w-4 h-4 text-[#737373] absolute left-3 top-3 pointer-events-none" />
        </div>
      ) : value ? (
        /* Preview Mode (Image Uploaded / Exists) */
        <div className="p-4 rounded-[20px] bg-[#fafafa] border border-[#e5e7eb] flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all">
          <div className="relative group overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-xs shrink-0 self-center sm:self-auto">
            <img
              src={value}
              alt="Pratinjau"
              className={`object-cover ${getAspectClass()}`}
              onError={(e) => {
                // Fallback broken image
                ;(e.currentTarget as HTMLImageElement).src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23e5e7eb"><rect width="100" height="100"/></svg>'
              }}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Badge variant="solid" className="text-[10px] bg-emerald-600 text-white gap-1 py-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Gambar Terpasang</span>
              </Badge>
              <span className="text-[10px] font-mono text-[#737373] bg-[#f0f0f0] px-2 py-0.5 rounded-[6px]">
                Maks. 1 MB
              </span>
            </div>

            <p className="text-xs font-mono text-[#737373] truncate max-w-full w-full" title={value}>
              {value}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || isUploading}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="px-3 py-1.5 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#f5f5f5] text-xs font-semibold text-[#0a0a0a] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isUploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Ganti File</span>
              </button>

              <button
                type="button"
                onClick={() => onChange('')}
                disabled={disabled || isUploading}
                className="px-3 py-1.5 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#fff0f0] text-xs font-semibold text-[#e7000b] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Dropzone Mode */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-[20px] p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
            dragActive
              ? 'border-[#0a0a0a] bg-[#f0f0f0]'
              : displayError
              ? 'border-[#e7000b] bg-[#fff5f5]'
              : 'border-[#d1d5db] bg-[#fafafa] hover:border-[#737373] hover:bg-[#f5f5f5]'
          } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />

          <div className="w-10 h-10 rounded-full bg-white border border-[#e5e7eb] shadow-xs flex items-center justify-center text-[#737373]">
            {isUploading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#0a0a0a]" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#0a0a0a]">
              {isUploading ? 'Mengunggah ke server lokal...' : 'Klik atau seret file gambar ke sini'}
            </p>
            <p className="text-[11px] text-[#737373]">
              Batas ukuran maksimal: <strong className="text-[#0a0a0a]">1 MB</strong> • Format JPG, PNG, WebP
            </p>
          </div>
        </div>
      )}

      {/* Helper text or error notification */}
      {displayError ? (
        <p className="text-xs font-medium text-[#e7000b] flex items-center gap-1.5 mt-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-[#737373] mt-1">{helperText}</p>
      ) : null}
    </div>
  )
}
