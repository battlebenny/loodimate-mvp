import { useEffect, useRef, type ReactNode } from 'react'

/** Bottom sheet built on <dialog> (focus trap, Escape to close). */
export function Sheet({ open, title, onClose, closeLabel = 'Fermer', children }: { open: boolean; title: string; onClose: () => void; closeLabel?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="mx-auto mt-auto mb-0 max-h-[88dvh] w-full max-w-[560px] rounded-t-[20px] border-0 bg-bg p-0 text-ink backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-2.5 px-5 pt-5 pb-[calc(28px+var(--safe-bottom))]">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-1 text-sm font-semibold text-accent-strong">
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
