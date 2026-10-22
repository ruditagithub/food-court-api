import { useEffect, type ReactNode } from 'react'
import { Icons } from './Icons'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog container */}
      <div className="relative z-10 w-full max-w-lg rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] p-6 shadow-2xl transition-all duration-200 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`mb-4 flex flex-col gap-1 ${className}`}>{children}</div>
}

export function DialogTitle({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2 className={`text-lg font-semibold text-[#0a0a0a] tracking-tight ${className}`}>
      {children}
    </h2>
  )
}

export function DialogDescription({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={`text-sm text-[#737373] ${className}`}>{children}</p>
}

export function DialogFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 ${className}`}>
      {children}
    </div>
  )
}

export function DialogClose({
  onClick,
  className = '',
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-5 right-5 p-1.5 rounded-[18px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors ${className}`}
      aria-label="Close"
    >
      <Icons.Close className="w-4 h-4" />
    </button>
  )
}
