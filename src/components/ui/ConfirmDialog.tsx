import { useEffect, useRef } from 'react'
import { Button } from './Button'

/** Accessible modal confirmation built on <dialog>. */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: { open: boolean; title: string; body: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void }) {
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
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,420px)] rounded-[var(--radius-2xl)] border border-line bg-bg p-0 text-ink backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-3 p-5">
        <h2 id="confirm-title" className="m-0 font-display text-xl font-semibold">
          {title}
        </h2>
        <p className="m-0 text-[15px] text-ink-soft">{body}</p>
        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
