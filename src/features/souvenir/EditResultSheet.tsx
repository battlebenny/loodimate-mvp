import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { ScoreBlock } from '../sheet/ScoreBlock'
import type { PartyDTO, Scores } from '../../../shared/types'

function CheckBox({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-accent-strong bg-accent-strong text-white' : 'border-ink-soft text-transparent'}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5 9-10" />
      </svg>
    </span>
  )
}

export function EditResultSheet({ party, open, onClose, onSave }: { party: PartyDTO; open: boolean; onClose: () => void; onSave: (p: { scores?: Record<string, Scores>; winners: string[] }) => Promise<void> }) {
  const isScore = party.template === 'scores par manche'
  const [winners, setWinners] = useState<string[]>([])
  const [scores, setScores] = useState<Record<string, Scores>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  // Fresh state from the server copy every time the sheet opens.
  useEffect(() => {
    if (!open) return
    setWinners(party.players.filter((p) => p.winner).map((p) => p.participationId))
    setScores(Object.fromEntries(party.players.map((p) => [p.participationId, p.scores])))
    setError(undefined)
  }, [open, party])

  async function save() {
    setBusy(true)
    setError(undefined)
    try {
      await onSave(isScore ? { scores, winners } : { winners })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer la correction. Réessaie dans un instant.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string) => setWinners(winners.includes(id) ? winners.filter((w) => w !== id) : [...winners, id])

  return (
    <Sheet open={open} title={isScore ? 'Corriger le résultat' : 'Qui a gagné ?'} onClose={onClose} closeLabel="Annuler">
      <p className="m-0 mb-1 text-sm text-ink-soft">{isScore ? 'Coche le vainqueur, ou plusieurs en cas d’égalité. Tu peux aussi corriger un score.' : "Coche plusieurs joueurs en cas d'égalité."}</p>
      {open && (
        <div className="flex max-h-[52dvh] flex-col gap-2 overflow-y-auto">
          {party.players.map((p) => {
            const on = winners.includes(p.participationId)
            return (
              <div key={p.participationId} className="flex flex-col gap-1">
                <button type="button" aria-pressed={on} onClick={() => toggle(p.participationId)} className="flex min-h-11 items-center gap-2.5 text-left">
                  <CheckBox on={on} />
                  <span className="text-[15px] font-semibold">{on ? `${p.name} · vainqueur` : p.name}</span>
                </button>
                {isScore && <ScoreBlock name={p.name} scores={scores[p.participationId] ?? p.scores} onChange={(s) => setScores({ ...scores, [p.participationId]: s })} />}
              </div>
            )
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
      <Button className="mt-2 w-full" busy={busy} onClick={save}>
        Enregistrer
      </Button>
    </Sheet>
  )
}
