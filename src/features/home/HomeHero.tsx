import { Trophy } from 'lucide-react'
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

/** Cover: the image fills the top of the page behind the header, under a veil, like Loodi-collec's home scene. */
function CoverHero({ name, f }: { name: string; f: Focus }) {
  return (
    <section className="relative -mx-5 -mt-[calc(64px+var(--safe-area-inset-top))] mb-6 overflow-hidden" aria-labelledby="home-hero-title">
      {/* Veil keeps the header readable on top and the text block on an almost opaque ground (AA), like Collec's home scene. */}
      {f.image && <img src={f.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-theme-bg) 95%, transparent) 0%, color-mix(in srgb, var(--color-theme-bg) 70%, transparent) 18%, color-mix(in srgb, var(--color-theme-bg) 45%, transparent) 34%, color-mix(in srgb, var(--color-theme-bg) 86%, transparent) 52%, color-mix(in srgb, var(--color-theme-bg) 96%, transparent) 70%, var(--color-theme-bg) 100%)',
        }}
      />
      <div className="relative flex min-h-[min(440px,62dvh)] flex-col px-5 pt-[calc(76px+var(--safe-area-inset-top))] pb-2">
        <div className="mt-auto flex flex-col gap-3">
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
          <Link to={f.to} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-lg)] bg-accent-strong px-6 font-medium text-white no-underline transition-colors hover:bg-accent-hover">
            {f.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
