import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'

export function HighlightSheet({ open, value, onClose, onSave }: { open: boolean; value: string | null; onClose: () => void; onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setText(value ?? '')
  }, [open, value])
  return (
    <Sheet open={open} title="Le fait marquant" onClose={onClose} closeLabel="Annuler">
      <label htmlFor="highlight" className="sr-only">
        Le fait marquant
      </label>
      <textarea
        id="highlight"
        value={text}
        maxLength={280}
        rows={4}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex. Léa a pris la tête dès la 2e manche."
        className="w-full resize-none rounded-[var(--radius-control)] border-[1.5px] border-line bg-surface p-3 text-base text-ink outline-none focus:border-accent"
      />
      <p className="m-0 text-right text-xs text-ink-soft">{text.length}/280</p>
      <Button
        className="w-full"
        busy={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onSave(text)
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        Enregistrer
      </Button>
    </Sheet>
  )
}
