import { Dices, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { joinNames } from '../../../shared/french'
import { formatLongDate } from '../../lib/format'
import type { PartySummaryDTO } from '../../../shared/types'
import { ongoingMeta } from './PartyRow'

/** What the hero puts forward: the latest ongoing party first (resume), otherwise the latest souvenir. HomePage relies on this order. */
function focusOf(ongoing: PartySummaryDTO[], finished: PartySummaryDTO[]) {
  const party = ongoing[0] ?? finished[0]
  if (!party) return null
  const isOngoing = party.status === 'en cours'
  const image = party.firstPhotoThumb ?? party.game.image
  const winner = party.winnerNames.length === 1 ? `${party.winnerNames[0]} gagne` : party.winnerNames.length > 1 ? `${joinNames(party.winnerNames)} ex aequo` : 'Pas de vainqueur'
  return {
    party,
    isOngoing,
    image,
    to: isOngoing ? `/partie/${party.id}/feuille` : `/partie/${party.id}`,
    title: isOngoing ? `Ta partie de ${party.game.name} t’attend` : party.game.name,
    // The title says it all for an ongoing party; a souvenir's title is just the game, so its line names it.
    meta: isOngoing ? ongoingMeta(party) : `Dernier souvenir · ${formatLongDate(party.finishedAt ?? party.createdAt).toLocaleLowerCase('fr-FR')}`,
    result: isOngoing ? null : winner,
    cta: isOngoing ? 'Reprendre la partie' : 'Revoir le souvenir',
  }
}

type Props = { name: string; ongoing: PartySummaryDTO[]; finished: PartySummaryDTO[] }

/** Home cover: greets the player and puts forward the party to resume, or the latest souvenir. */
export function HomeHero({ name, ongoing, finished }: Props) {
  const f = focusOf(ongoing, finished)
  if (!f) return <h1 className="m-0 mb-6 page-title">Salut {name}</h1>
  return <CoverHero name={name} f={f} />
}

type Focus = NonNullable<ReturnType<typeof focusOf>>

const VEIL =
  'linear-gradient(180deg, color-mix(in srgb, var(--color-theme-bg) 95%, transparent) 0%, color-mix(in srgb, var(--color-theme-bg) 70%, transparent) 18%, color-mix(in srgb, var(--color-theme-bg) 45%, transparent) 34%, color-mix(in srgb, var(--color-theme-bg) 70%, transparent) 60%, var(--color-theme-bg) 100%)'

const TEXT_GROUND = 'linear-gradient(180deg, transparent 0, color-mix(in srgb, var(--color-theme-bg) 88%, transparent) 64px, var(--color-theme-bg) 100%)'

/** Without a picture the cover stays compact, on a light Mate wash with a large line-drawn die as decoration. */
const WASH = 'linear-gradient(180deg, var(--color-module-mate-soft) 0%, color-mix(in srgb, var(--color-module-mate-soft) 60%, var(--color-theme-bg)) 55%, var(--color-theme-bg) 100%)'

/** Ranking rows shown on the cover; a table of friends rarely goes past this. */
const MAX_RANKS = 5

/**
 * Cover: the image fills the top of the page behind the header, under a veil, like Loodi-collec's home scene.
 * A souvenir comes back whole: result, highlight and scores, not only the picture.
 */
function CoverHero({ name, f }: { name: string; f: Focus }) {
  const { party } = f
  const ranks = rankWithTies(party.ranking).slice(0, MAX_RANKS)
  const cta = (
    <Link to={f.to} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-lg)] bg-accent-strong px-6 font-medium text-white no-underline transition-colors hover:bg-accent-hover">
      {f.cta}
    </Link>
  )
  return (
    <section className="relative -mx-5 -mt-[calc(64px+var(--safe-area-inset-top))] mb-6 overflow-hidden" aria-labelledby="home-hero-title">
      {f.image ? (
        <>
          {/* The picture keeps a fixed height at the top; the veil keeps the header readable over it. */}
          <div className="absolute inset-x-0 top-0 h-[min(440px,62dvh)]" aria-hidden="true">
            <img src={f.image} alt="" className="h-full w-full object-cover object-top" />
            <div className="absolute inset-0" style={{ background: VEIL }} />
          </div>
        </>
      ) : (
        <div className="absolute inset-0" aria-hidden="true" style={{ background: WASH }}>
          <Dices size={168} strokeWidth={0.75} className="absolute top-[calc(36px+var(--safe-area-inset-top))] -right-6 rotate-12 text-accent opacity-[0.16]" />
        </div>
      )}
      {/* Top region: same picture space for a souvenir as for an ongoing party; its identity sits at the bottom of the picture. */}
      <div className={`relative flex flex-col px-5 pt-[calc(76px+var(--safe-area-inset-top))] pb-2 ${f.image ? 'min-h-[min(440px,62dvh)]' : ''}`}>
        <div className="relative mt-auto">
          {/* Text ground: whatever the viewport height, the text sits on an almost opaque veil (AA). */}
          {f.image && <div className="pointer-events-none absolute -inset-x-5 -top-16 bottom-0" aria-hidden="true" style={{ background: TEXT_GROUND }} />}
          <div className="relative flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="m-0 section-label text-accent-text">Salut {name}</p>
              <h1 id="home-hero-title" className="m-0 font-display text-[32px] leading-[1.08] font-semibold tracking-[-0.01em]">
                {f.title}
              </h1>
              <p className="m-0 text-sm text-ink-soft">{f.meta}</p>
            </div>
            {f.result && (
              <p className="m-0 flex items-center gap-2 text-base font-semibold">
                <Trophy size={18} className="text-accent-text" aria-hidden="true" />
                {f.result}
              </p>
            )}
            {f.isOngoing && cta}
          </div>
        </div>
      </div>
      {/* The rest of the souvenir flows under the picture: highlight, scores, then the way back to it. */}
      {!f.isOngoing && (
        <div className="relative flex flex-col gap-3 px-5 pt-1 pb-2">
          {party.highlight && <blockquote className="m-0 border-l-2 border-accent pl-3.5 font-display text-lg leading-snug italic">{party.highlight}</blockquote>}
          {ranks.length > 0 && (
            <ol className="m-0 flex list-none flex-col p-0" aria-label="Classement">
              {ranks.map((r) => (
                <li key={r.name} className="flex min-h-9 items-center gap-3 border-b border-line px-1 last:border-b-0">
                  <span className="w-4 text-sm text-ink-soft">{r.rank}</span>
                  <span className="grow text-[15px] font-medium">{r.name}</span>
                  <span className="text-[15px] font-semibold tabular-nums">{r.total}</span>
                </li>
              ))}
            </ol>
          )}
          {cta}
        </div>
      )}
    </section>
  )
}

/** Same rank for equal totals (1, 1, 3), as on the souvenir. Input is already sorted best first. */
function rankWithTies(ranking: { name: string; total: number }[]) {
  return ranking.map((r) => ({ ...r, rank: ranking.findIndex((x) => x.total === r.total) + 1 }))
}
