import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  surface?: 'paper' | 'canvas' | 'surface-alt'
  className?: string
}

export function Card({
  children,
  surface = 'paper',
  className = '',
  ...props
}: CardProps) {
  const surfaceStyles = {
    paper: 'bg-[#ffffff] border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]',
    canvas: 'bg-[#f5f5f5] border border-[#e5e5e5]',
    'surface-alt': 'bg-[#fafafa] border border-[#e5e5e5]'
  }

  return (
    <div
      className={`rounded-[28px] p-5 sm:p-6 ${surfaceStyles[surface]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
