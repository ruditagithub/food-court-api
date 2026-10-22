import { useEffect, type ReactNode } from 'react'
import { Icons } from './Icons'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  position?: 'right' | 'bottom'
}

export function Sheet({
  open,
  onOpenChange,
  children,
  position = 'right',
}: SheetProps) {
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

  const isBottom = position === 'bottom'

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
      />

      <div
        className={`fixed z-50 bg-[#ffffff] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isBottom
            ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[24px] border-t border-[#e5e5e5]'
            : 'inset-y-0 right-0 w-full max-w-md border-l border-[#e5e5e5]'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`p-5 sm:p-6 border-b border-[#e5e5e5] flex items-center justify-between ${className}`}
    >
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

export function SheetTitle({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h3 className={`text-lg font-semibold text-[#0a0a0a] tracking-tight ${className}`}>
      {children}
    </h3>
  )
}

export function SheetDescription({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={`text-xs text-[#737373] ${className}`}>{children}</p>
}

export function SheetContent({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`p-5 sm:p-6 overflow-y-auto flex-1 ${className}`}>
      {children}
    </div>
  )
}

export function SheetFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`p-5 sm:p-6 border-t border-[#e5e5e5] bg-[#fafafa] flex flex-col gap-3 ${className}`}>
      {children}
    </div>
  )
}

export function SheetClose({
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
      className={`p-1.5 rounded-[18px] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors ${className}`}
      aria-label="Close"
    >
      <Icons.Close className="w-4 h-4" />
    </button>
  )
}
