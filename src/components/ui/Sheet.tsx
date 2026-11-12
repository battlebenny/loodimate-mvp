import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Bottom sheet built on <dialog> (focus trap, Escape to close), styled like Loodi-collec's BottomSheet. */
export function Sheet({ open, title, onClose, closeLabel = 'Fermer', children }: { open: boolean; title: string; onClose: () => void; closeLabel?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="mate-sheet mx-auto mt-auto mb-0 max-h-[88dvh] w-full max-w-[480px] rounded-t-[var(--radius-2xl)] border-0 bg-white p-0 text-ink shadow-lg backdrop:bg-black/35 backdrop:backdrop-blur-sm dark:bg-bg"
    >
      <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
        <span className="h-1 w-9 rounded-full bg-line" />
      </div>
      <div className="flex flex-col gap-2.5 px-5 pb-[calc(28px+var(--safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="m-0 font-display text-xl font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-2.5 flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-subtle hover:text-ink">
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
