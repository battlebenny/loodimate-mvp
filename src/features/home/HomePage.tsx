import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/shell/AppShell'
import { Button } from '../../components/ui/Button'
import { useMe } from '../../app/PlayerContext'
import { api } from '../../lib/api'
import { PartyRow } from './PartyRow'
import { HomeHero } from './HomeHero'
import { PartyCalendar } from './PartyCalendar'
import { readHomeView, saveHomeView, ViewToggle, type HomeView } from './ViewToggle'
import type { PartySummaryDTO } from '../../../shared/types'

type Lists = { ongoing: PartySummaryDTO[]; finished: PartySummaryDTO[] }

const Label = ({ children, id }: { children: string; id: string }) => (
  <h2 id={id} className="m-0 section-label">
    {children}
  </h2>
)

export function HomePage() {
  const me = useMe()
  const [lists, setLists] = useState<Lists | null>(null)
  const [error, setError] = useState<string>()
  const [view, setView] = useState<HomeView>(readHomeView)
  const changeView = (v: HomeView) => {
    setView(v)
    saveHomeView(v)
  }

  const load = useCallback(() => {
    setError(undefined)
    // One call for both lists keeps Airtable under its 5 requests per second.
    api<{ parties: PartySummaryDTO[] }>('GET', 'parties')
      .then(({ parties }) =>
        setLists({
          ongoing: parties.filter((p) => p.status === 'en cours').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
          finished: parties.filter((p) => p.status === 'terminée').sort((a, b) => Date.parse(b.finishedAt ?? b.createdAt) - Date.parse(a.finishedAt ?? a.createdAt)),
        }),
      )
      .catch((e) => setError(e instanceof Error ? e.message : 'Une erreur est survenue. Réessaie dans un instant.'))
  }, [])

  useEffect(load, [load])

  // The cover already puts forward the latest ongoing party (see HomeHero): the list shows the others.
  const listedOngoing = lists?.ongoing.slice(1) ?? []

  return (
    <AppShell>
      {lists && !error ? <HomeHero name={me.name} ongoing={lists.ongoing} finished={lists.finished} /> : <h1 className="m-0 mb-6 page-title">Salut {me.name}</h1>}
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
            <div key={i} className="h-16 animate-pulse rounded-card bg-surface-subtle" />
          ))}
        </div>
      ) : lists.ongoing.length + lists.finished.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
          <p className="m-0 font-display text-xl font-semibold">Aucune partie pour l’instant</p>
          <p className="m-0 text-ink-soft">Choisis un jeu, ajoute les joueurs, et c’est parti.</p>
          <Link to="/nouvelle" className="self-start font-semibold text-accent-text">
            Nouvelle partie
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {listedOngoing.length > 0 && (
            <section className="flex flex-col gap-2.5" aria-labelledby="home-ongoing">
              <Label id="home-ongoing">{`Autres parties en cours (${listedOngoing.length})`}</Label>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {listedOngoing.map((p) => (
                  <PartyRow key={p.id} party={p} />
                ))}
              </ul>
            </section>
          )}
          {lists.finished.length > 0 && (
            <section className="flex flex-col gap-2.5" aria-labelledby="home-finished">
              <div className="flex items-center justify-between gap-3">
                <Label id="home-finished">Parties terminées</Label>
                <ViewToggle value={view} onChange={changeView} />
              </div>
              {view === 'calendar' ? (
                <PartyCalendar parties={lists.finished} />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {lists.finished.map((p) => (
                    <PartyRow key={p.id} party={p} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}
