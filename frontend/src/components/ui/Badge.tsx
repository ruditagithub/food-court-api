import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'solid' | 'soft' | 'outline' | 'ember'
  className?: string
}

export function Badge({ children, variant = 'soft', className = '' }: BadgeProps) {
  const variants = {
    // Solid: #171717 fill, #fafafa text
    solid: 'bg-[#171717] text-[#fafafa]',
    // Soft: #f5f5f5 fill, #171717 text
    soft: 'bg-[#f5f5f5] text-[#171717] border border-[#e5e5e5]',
    // Outline: transparent, #0a0a0a text, 1px hairline
    outline: 'bg-transparent text-[#0a0a0a] border border-[#e5e5e5]',
    // Ember: subtle red tag for critical/live indicator
    ember: 'bg-[#e7000b]/10 text-[#e7000b] border border-[#e7000b]/20'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[18px] text-xs font-mono tracking-tight ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
