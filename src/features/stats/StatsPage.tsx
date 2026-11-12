import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/shell/AppShell'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { track } from '../../lib/track'
import type { StatsDTO } from '../../../shared/types'

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-surface p-3.5">
      <span className="text-[26px] leading-none font-bold tabular-nums">{value}</span>
      <span className="text-[13px] text-ink-soft">{label}</span>
    </div>
  )
}

export function StatsPage() {
  const [stats, setStats] = useState<StatsDTO | null>(null)
  const [error, setError] = useState<string>()
  const tracked = useRef(false)

  const load = useCallback(() => {
    setError(undefined)
    api<StatsDTO>('GET', 'stats')
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Une erreur est survenue. Réessaie dans un instant.'))
  }, [])

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true
      track('stats_consultees', { origin: 'app' })
    }
    load()
  }, [load])

  const maxWins = Math.max(1, ...(stats?.winsByPlayer.map((p) => p.wins) ?? [1]))

  return (
    <AppShell>
      <div className="mb-5 flex flex-col">
        <h1 className="m-0 font-display text-[28px] font-semibold">Mes statistiques</h1>
        <span className="text-[13px] text-ink-soft">Les parties où tu as joué</span>
      </div>
      {error ? (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="m-0 text-ink-soft">{error}</p>
          <Button variant="secondary" onClick={load}>
            Réessayer
          </Button>
        </div>
      ) : !stats ? (
        <div className="grid grid-cols-3 gap-2" aria-busy="true" aria-label="Chargement des statistiques">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-[14px] bg-surface-subtle" />
          ))}
        </div>
      ) : stats.parties === 0 ? (
        <div className="rounded-[18px] border border-line bg-surface p-5">
          <p className="m-0 font-display text-xl font-semibold">Pas encore de statistiques</p>
          <p className="m-0 mt-2 text-ink-soft">Termine une première partie pour voir tes statistiques.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-2">
            <Tile value={String(stats.parties)} label={stats.parties > 1 ? 'parties' : 'partie'} />
            <Tile value={String(stats.wins)} label={stats.wins > 1 ? 'victoires' : 'victoire'} />
            <Tile value={`${stats.winRate} %`} label="de victoires" />
          </div>

          <section className="flex flex-col gap-2.5" aria-labelledby="stats-games">
            <h2 id="stats-games" className="m-0 text-xs font-semibold tracking-[0.06em] text-ink-soft uppercase">
              Par jeu
            </h2>
            <ul className="m-0 list-none overflow-hidden rounded-[14px] border border-line bg-surface p-0">
              {stats.byGame.map((g) => (
                <li key={g.gameId} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                  <div className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-base font-semibold">{g.name}</span>
                    <span className="text-[13px] text-ink-soft">
                      {plural(g.parties, 'partie')} · {plural(g.wins, 'victoire')}
                    </span>
                  </div>
                  {g.hasScores ? (
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-[22px] leading-tight font-bold tabular-nums">
                        <span className="mr-1 text-xs font-normal text-ink-soft">Record</span>
                        {g.best}
                      </span>
                      <span className="text-[13px] text-ink-soft tabular-nums">
                        moy. {g.avg} · min {g.min}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[13px] text-ink-soft">sans score</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="stats-wins">
            <h2 id="stats-wins" className="m-0 text-xs font-semibold tracking-[0.06em] text-ink-soft uppercase">
              Victoires dans ces parties
            </h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {stats.winsByPlayer.map((p) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className={`w-20 truncate text-[15px] ${p.isMe ? 'font-bold' : 'font-semibold'}`}>{p.name}</span>
                  <div className="flex h-2.5 grow overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
                    <div className={`h-full rounded-full ${p.isMe ? 'bg-accent-strong' : 'bg-ink-soft'}`} style={{ width: `${(p.wins / maxWins) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-semibold tabular-nums">{p.wins}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  )
}
