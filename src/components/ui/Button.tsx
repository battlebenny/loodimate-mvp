import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  // Same recipe as Loodi-collec's Button, with Mate's module accent instead of the brand orange.
  primary: 'bg-accent-strong text-white hover:bg-accent-hover active:bg-accent-hover',
  secondary: 'border border-surface-subtle bg-surface text-ink hover:bg-surface-subtle active:bg-surface-subtle',
  ghost: 'text-ink-soft hover:bg-surface-subtle hover:text-ink active:bg-surface-subtle active:text-ink',
  // Destructive confirmation (delete), on the shared Loodi danger tokens.
  danger: 'bg-danger text-white hover:bg-[var(--color-theme-status-danger-solid-hover)] active:bg-[var(--color-theme-status-danger-solid-hover)]',
}

export function Button({ variant = 'primary', className = '', busy, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] px-6 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
