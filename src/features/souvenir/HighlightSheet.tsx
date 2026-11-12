import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'

export function HighlightSheet({ open, value, onClose, onSave }: { open: boolean; value: string | null; onClose: () => void; onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (open) {
      setText(value ?? '')
      setError(undefined)
    }
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
        className="w-full resize-none rounded-control border border-line bg-surface p-3 text-base text-ink outline-none focus:border-accent"
      />
      <div className="flex justify-between gap-3 text-xs text-ink-soft">
        <p className="m-0">Laisse vide pour revenir au fait marquant proposé.</p>
        <p className="m-0 shrink-0">{text.length}/280</p>
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
      <Button
        className="w-full"
        busy={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onSave(text)
            onClose()
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Impossible d’enregistrer le fait marquant. Réessaie dans un instant.')
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
