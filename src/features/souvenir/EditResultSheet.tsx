import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { computeTotal } from '../../../shared/scoring'
import type { PartyDTO, Scores } from '../../../shared/types'

export function EditResultSheet({ party, open, onClose, onSave }: { party: PartyDTO; open: boolean; onClose: () => void; onSave: (p: { scores?: Record<string, Scores>; winners: string[] }) => Promise<void> }) {
  const isScore = party.template === 'scores par manche'
  const [winners, setWinners] = useState<string[]>([])
  const [scores, setScores] = useState<Record<string, Scores>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setWinners(party.players.filter((p) => p.winner).map((p) => p.participationId))
    setScores(Object.fromEntries(party.players.map((p) => [p.participationId, p.scores])))
  }, [open, party])

  async function save() {
    setBusy(true)
    try {
      await onSave(isScore ? { scores, winners } : { winners })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title={isScore ? 'Corriger le résultat' : 'Qui a gagné ?'} onClose={onClose} closeLabel="Annuler">
      <p className="m-0 mb-1 text-sm text-ink-soft">{isScore ? 'Coche le ou les vainqueurs (égalité possible), ou corrige une case.' : "Coche plusieurs joueurs en cas d'égalité."}</p>
      <div className="flex max-h-[52dvh] flex-col gap-2 overflow-y-auto">
        {party.players.map((p) => {
          const on = winners.includes(p.participationId)
          const row = scores[p.participationId] ?? []
          return (
            <div key={p.participationId} className={`flex flex-col gap-1.5 rounded-[14px] border-[1.5px] bg-surface px-3 py-2 ${on ? 'border-accent-strong' : 'border-line'}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWinners(on ? winners.filter((w) => w !== p.participationId) : [...winners, p.participationId])}
                  className="flex min-h-11 grow items-center gap-2.5 text-left"
                >
                  <span aria-hidden className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-accent-strong bg-accent-strong text-white' : 'border-ink-soft text-transparent'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  </span>
                  <span className="text-[15px] font-semibold">{p.name}</span>
                </button>
                {isScore && <span className="text-[17px] font-bold tabular-nums">{computeTotal(row) ?? 0}</span>}
              </div>
              {isScore && (
                <div className="flex gap-1.5">
                  {row.map((v, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      aria-label={`Score de ${p.name}, manche ${i + 1}`}
                      defaultValue={v ?? ''}
                      onChange={(e) => {
                        const t = e.target.value.trim()
                        const nv = /^-?\d+$/.test(t) ? Number(t) : null
                        setScores({ ...scores, [p.participationId]: row.map((x, j) => (j === i ? nv : x)) })
                      }}
                      className="h-[42px] min-w-0 flex-1 rounded-[10px] border-[1.5px] border-line bg-bg text-center text-base font-semibold outline-none focus:border-accent"
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Button className="mt-2 w-full" busy={busy} onClick={save}>
        Enregistrer
      </Button>
    </Sheet>
  )
}
