import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`w-full rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] placeholder-[#737373] text-sm px-3.5 py-2 h-9 sm:h-10 border transition-all duration-150 outline-none
            ${
              error
                ? 'border-[#e7000b] focus:border-[#e7000b] focus:ring-1 focus:ring-[#e7000b]'
                : 'border-[#e5e5e5] hover:border-[#737373] focus:border-[#0a0a0a] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0a0a0a]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
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

Input.displayName = 'Input'
