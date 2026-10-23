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
