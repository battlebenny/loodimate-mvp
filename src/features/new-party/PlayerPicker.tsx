import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { normalizeName, sameName } from '../../../shared/names'
import type { PlayerDTO } from '../../../shared/types'

export type PickedPlayer = { name: string; playerId?: string }

type Lookup = { status: 'free' | 'unclaimed' | 'onboarded'; player?: PlayerDTO }

export function PlayerPicker({ players, onChange, known }: { players: PickedPlayer[]; onChange: (p: PickedPlayer[]) => void; known: string[] }) {
  const [input, setInput] = useState('')
  const [hint, setHint] = useState<string>()
  const [confirm, setConfirm] = useState<PlayerDTO | null>(null)
  const [checking, setChecking] = useState(false)

  const add = (p: PickedPlayer) => {
    onChange([...players, p])
    setInput('')
    setHint(undefined)
    setConfirm(null)
  }
  const askInitial = (name: string, why: string) => {
    setConfirm(null)
    setInput(`${name} `)
    setHint(`${why} Ajoute une initiale, par exemple « ${name} B. ».`)
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const name = normalizeName(input)
    if (!name) return
    if (players.some((p) => sameName(p.name, name))) return askInitial(name, `${name} est déjà dans la partie.`)
    setChecking(true)
    try {
      const r = await api<Lookup>('GET', `players/lookup?name=${encodeURIComponent(name)}`)
      if (r.status === 'free' || !r.player) add({ name })
      else setConfirm(r.player)
    } catch {
      add({ name }) // offline lookup: the server resolves the name on creation
    } finally {
      setChecking(false)
    }
  }

  const suggestions = known.filter((n) => !players.some((p) => sameName(p.name, n))).slice(0, 8)

  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Joueurs de la partie">
        {players.map((p, i) => (
          <li key={`${p.name}-${i}`} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-ink py-0 pr-1 pl-3.5 text-[15px] font-medium text-bg">
            {p.name}
            <button
              type="button"
              aria-label={`Retirer ${p.name}`}
              onClick={() => onChange(players.filter((_, j) => j !== i))}
              className="flex size-8 items-center justify-center rounded-full hover:bg-white/15"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {confirm ? (
        <div className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-4" role="group" aria-label="Confirmer le joueur">
          <p className="m-0 font-semibold">{confirm.name} joue déjà sur Mate.</p>
          <p className="m-0 text-sm text-ink-soft">C’est la même personne ?</p>
          <div className="flex gap-2">
            <Button className="grow" onClick={() => add({ name: confirm.name, playerId: confirm.id })}>
              Oui
            </Button>
            <Button variant="secondary" className="grow" onClick={() => askInitial(confirm.name, `Ce n'est pas ${confirm.name}.`)}>
              Non, une autre
            </Button>
          </div>
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={submit}>
          <label htmlFor="player-name" className="sr-only">
            Prénom du joueur
          </label>
          <input
            id="player-name"
            value={input}
            autoComplete="off"
            enterKeyHint="done"
            maxLength={40}
            placeholder="Ex. Léa"
            onChange={(e) => setInput(e.target.value)}
            aria-describedby={hint ? 'player-hint' : undefined}
            className="h-[52px] min-w-0 grow rounded-[var(--radius-control)] border-[1.5px] border-line bg-surface px-4 text-base text-ink outline-none focus:border-accent"
          />
          <Button type="submit" variant="secondary" busy={checking} disabled={!input.trim()}>
            Ajouter
          </Button>
        </form>
      )}
      {hint && (
        <p id="player-hint" className="m-0 text-[13px] text-ink-soft">
          {hint}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-soft">Habitués :</span>
          {suggestions.map((n) => (
            <button key={n} type="button" onClick={() => add({ name: n })} className="inline-flex min-h-10 items-center rounded-full border-[1.5px] border-dashed border-ink-soft px-3.5 text-[15px] hover:bg-surface-subtle">
              + {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
