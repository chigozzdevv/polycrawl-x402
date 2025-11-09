import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/class-names'

type CardProps = HTMLAttributes<HTMLDivElement>

type CardContentProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return <div className={cn('rounded-2xl border border-white/10 bg-[#111111]/80', className)} {...props} />
}

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn('p-5', className)} {...props} />
}
