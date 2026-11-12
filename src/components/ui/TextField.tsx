import { useId, type InputHTMLAttributes } from 'react'

export function TextField({ label, hint, error, className = '', hideLabel, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; hideLabel?: boolean }) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm font-semibold'}>
        {label}
      </label>
      <input
        id={id}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        className="h-12 w-full rounded-control border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft/70 focus:border-accent"
      />
      {(error || hint) && (
        <p id={`${id}-hint`} className={`m-0 text-[13px] ${error ? 'text-danger' : 'text-ink-soft'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
