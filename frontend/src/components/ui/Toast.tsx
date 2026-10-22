import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Icons } from './Icons'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastMessage = { id, title, description, variant }
      setToasts((prev) => [...prev, newToast])

      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, description?: string) => {
      toast({ title, description, variant: 'success' })
    },
    [toast]
  )

  const error = useCallback(
    (title: string, description?: string) => {
      toast({ title, description, variant: 'destructive' })
    },
    [toast]
  )

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-[18px] border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              t.variant === 'destructive'
                ? 'bg-[#ffffff] border-[#e7000b] text-[#0a0a0a]'
                : t.variant === 'success'
                ? 'bg-[#0a0a0a] border-[#171717] text-[#fafafa]'
                : 'bg-[#ffffff] border-[#e5e5e5] text-[#0a0a0a]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.variant === 'destructive' ? (
                <Icons.AlertCircle className="w-5 h-5 text-[#e7000b]" />
              ) : t.variant === 'success' ? (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                  ✓
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#0a0a0a] mt-1.5" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-none">{t.title}</p>
              {t.description && (
                <p
                  className={`text-xs mt-1 leading-normal ${
                    t.variant === 'success' ? 'text-[#a3a3a3]' : 'text-[#737373]'
                  }`}
                >
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-xs opacity-60 hover:opacity-100 p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
