import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/shell/AppShell'
import { Button } from '../../components/ui/Button'
import { useMe } from '../../app/PlayerContext'
import { api } from '../../lib/api'
import { PartyRow } from './PartyRow'
import type { PartySummaryDTO } from '../../../shared/types'

type Lists = { ongoing: PartySummaryDTO[]; finished: PartySummaryDTO[] }

const Label = ({ children, id }: { children: string; id: string }) => (
  <h2 id={id} className="m-0 text-xs font-semibold tracking-[0.06em] text-ink-soft uppercase">
    {children}
  </h2>
)

export function HomePage() {
  const me = useMe()
  const [lists, setLists] = useState<Lists | null>(null)
  const [error, setError] = useState<string>()

  const load = useCallback(() => {
    setError(undefined)
    Promise.all([
      api<{ parties: PartySummaryDTO[] }>('GET', `parties?status=${encodeURIComponent('en cours')}`),
      api<{ parties: PartySummaryDTO[] }>('GET', `parties?status=${encodeURIComponent('terminée')}`),
    ])
      .then(([a, b]) => setLists({ ongoing: a.parties, finished: b.parties }))
      .catch((e) => setError(e instanceof Error ? e.message : 'Une erreur est survenue.'))
  }, [])

  useEffect(load, [load])

  return (
    <AppShell>
      <h1 className="m-0 mb-6 font-display text-[28px] font-semibold">Salut {me.name}</h1>
      {error ? (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="m-0 text-ink-soft">{error}</p>
          <Button variant="secondary" onClick={load}>
            Réessayer
          </Button>
        </div>
      ) : !lists ? (
        <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Chargement des parties">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[14px] bg-surface-subtle" />
          ))}
        </div>
      ) : lists.ongoing.length + lists.finished.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-5">
          <p className="m-0 font-display text-xl font-semibold">Aucune partie pour l'instant</p>
          <p className="m-0 text-ink-soft">Lance la première avec Nouvelle partie : jeu, joueurs, et c'est parti.</p>
          <Link to="/nouvelle" className="self-start font-semibold text-accent-strong">
            Nouvelle partie
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {lists.ongoing.length > 0 && (
            <section className="flex flex-col gap-2.5" aria-labelledby="home-ongoing">
              <Label id="home-ongoing">{`En cours (${lists.ongoing.length})`}</Label>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {lists.ongoing.map((p) => (
                  <PartyRow key={p.id} party={p} />
                ))}
              </ul>
            </section>
          )}
          {lists.finished.length > 0 && (
            <section className="flex flex-col gap-2.5" aria-labelledby="home-finished">
              <Label id="home-finished">Parties terminées</Label>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {lists.finished.map((p) => (
                  <PartyRow key={p.id} party={p} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}
