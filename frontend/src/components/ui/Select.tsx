import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  helperText?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error = false, helperText, children, ...props }, ref) => {
    return (
      <div className="w-full relative">
        <select
          ref={ref}
          className={`w-full appearance-none rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] text-sm px-3.5 py-2 pr-9 h-9 sm:h-10 border transition-all duration-150 outline-none cursor-pointer
            ${
              error
                ? 'border-[#e7000b] focus:border-[#e7000b] focus:ring-1 focus:ring-[#e7000b]'
                : 'border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#737373]">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
        {helperText && (
          <p
            className={`mt-1 text-xs ${
              error ? 'text-[#e7000b]' : 'text-[#737373]'
            }`}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
