import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/class-names'

type ButtonVariant = 'primary' | 'ghost' | 'outline'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseStyles =
  'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60'

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-sand text-ink hover:bg-[#cfbea0] hover:text-ink',
  ghost: 'border border-white/20 bg-transparent text-parchment hover:border-white/40 hover:bg-white/5',
  outline: 'border border-white/15 text-parchment hover:bg-white/5',
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={cn(baseStyles, variantStyles[variant], className)} {...props} />
}
