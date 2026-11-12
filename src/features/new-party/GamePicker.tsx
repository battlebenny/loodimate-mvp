import { useEffect, useId, useState } from 'react'
import { api } from '../../lib/api'
import { GameThumb } from '../../components/ui/GameThumb'
import type { BggGame } from '../../../shared/types'

export type PickedGame = { bggId?: number; name: string; image: string | null; thumb: string | null; meta: string }

export function GamePicker({ value, onChange }: { value: PickedGame | null; onChange: (g: PickedGame | null) => void }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BggGame[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      api<{ results: BggGame[] }>('GET', `games/search?q=${encodeURIComponent(q)}`)
        .then((r) => alive && setResults(r.results))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setLoading(false))
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query])

  if (value) {
    return (
      <div className="flex min-h-16 items-center gap-3 rounded-[var(--radius-control)] border-[1.5px] border-ink bg-surface px-3 py-2.5">
        <GameThumb src={value.thumb} />
        <div className="flex min-w-0 grow flex-col">
          <span className="truncate font-semibold">{value.name}</span>
          <span className="text-[13px] text-ink-soft">{value.meta}</span>
        </div>
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-accent-strong" onClick={() => onChange(null)}>
          Changer
        </button>
      </div>
    )
  }

  const q = query.trim()
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-[var(--radius-control)] border-[1.5px] border-line bg-surface focus-within:border-accent">
        <label htmlFor={id} className="sr-only">
          Rechercher un jeu
        </label>
        <input
          id={id}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Rechercher un jeu"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-[52px] w-full bg-transparent px-4 text-base text-ink outline-none"
        />
        {results.map((g) => (
          <button
            key={g.bggId}
            type="button"
            onClick={() => onChange({ bggId: g.bggId, name: g.name, image: g.image, thumb: g.thumb, meta: g.year ? String(g.year) : 'BoardGameGeek' })}
            className="flex min-h-12 w-full items-center gap-3 border-t border-line px-4 py-1.5 text-left hover:bg-surface-subtle"
          >
            <GameThumb src={g.thumb} size={32} />
            <span className="grow">{g.name}</span>
            {g.year && <span className="text-[13px] text-ink-soft">{g.year}</span>}
          </button>
        ))}
        {q.length >= 1 && (
          <button
            type="button"
            onClick={() => onChange({ name: q, image: null, thumb: null, meta: 'Ajouté à la main' })}
            className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-line px-4 text-left hover:bg-surface-subtle"
          >
            <span className="font-medium text-accent-strong">Utiliser « {q} »</span>
            <span className="text-xs text-ink-soft">sans fiche</span>
          </button>
        )}
      </div>
      <p className="m-0 text-[13px] text-ink-soft" aria-live="polite">
        {loading ? 'Recherche sur BoardGameGeek…' : 'Suggestions BoardGameGeek'}
      </p>
    </div>
  )
}
