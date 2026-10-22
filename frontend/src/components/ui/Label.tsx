import type { LabelHTMLAttributes, ReactNode } from 'react'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode
  required?: boolean
}

export function Label({ children, required, className = '', ...props }: LabelProps) {
  return (
    <label
      className={`block text-xs font-mono uppercase tracking-wider text-[#737373] mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-[#e7000b] ml-1">*</span>}
    </label>
  )
}
