import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[18px] text-center text-sm font-sans'

  const variantStyles = {
    // Primary: #0a0a0a background, #fafafa text, no border, 18px radius
    primary: 'bg-[#0a0a0a] text-[#fafafa] hover:bg-[#171717] active:scale-[0.98]',
    // Secondary: #f5f5f5 soft gray fill, #0a0a0a text, no border
    secondary: 'bg-[#f5f5f5] text-[#0a0a0a] hover:bg-[#e5e5e5] active:scale-[0.98]',
    // Outline: transparent, #0a0a0a text, 1px solid #e5e5e5 hairline
    outline: 'bg-transparent text-[#0a0a0a] border border-[#e5e5e5] hover:bg-[#f5f5f5] active:scale-[0.98]',
    // Ghost: transparent, #0a0a0a text
    ghost: 'bg-transparent text-[#0a0a0a] hover:bg-[#f5f5f5]'
  }

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-3.5 py-2 h-9 gap-2',
    lg: 'text-sm px-5 py-2.5 h-10 gap-2'
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
