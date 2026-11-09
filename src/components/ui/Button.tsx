import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'bg-accent-strong text-white hover:brightness-95 active:brightness-90',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-subtle',
  ghost: 'bg-transparent text-ink hover:bg-surface-subtle',
}

export function Button({ variant = 'primary', className = '', busy, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
