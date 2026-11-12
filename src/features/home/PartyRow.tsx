import { Link } from 'react-router-dom'
import { GameThumb } from '../../components/ui/GameThumb'
import { joinNames } from '../../../shared/french'
import { formatShortDate, formatTime } from '../../lib/format'
import type { PartySummaryDTO } from '../../../shared/types'

export function ongoingMeta(p: PartySummaryDTO): string {
  const parts = [`${p.playerCount} joueur${p.playerCount > 1 ? 's' : ''}`, `commencée à ${formatTime(p.createdAt)}`]
  if (p.template === 'scores par manche') parts.unshift(`Manche ${p.rounds}`)
  return parts.join(' · ')
}

export function finishedMeta(p: PartySummaryDTO): string {
  const parts = [formatShortDate(p.finishedAt ?? p.createdAt)]
  if (p.winnerNames.length === 1) parts.push(`${p.winnerNames[0]} gagne`)
  else if (p.winnerNames.length > 1) parts.push(`${joinNames(p.winnerNames)} ex aequo`)
  if (p.photoCount > 0) parts.push(`${p.photoCount} photo${p.photoCount > 1 ? 's' : ''}`)
  return parts.join(' · ')
}

export function PartyRow({ party }: { party: PartySummaryDTO }) {
  const ongoing = party.status === 'en cours'
  return (
    <li>
      <Link
        to={ongoing ? `/partie/${party.id}/feuille` : `/partie/${party.id}`}
        className={`flex min-h-16 items-center gap-3 rounded-card border px-4 py-3 text-ink no-underline ${ongoing ? 'border-accent/30 bg-accent-soft' : 'border-line hover:bg-surface-subtle'}`}
      >
        <GameThumb src={party.firstPhotoThumb ?? party.game.image} size={40} />
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="truncate text-base font-semibold">{party.game.name}</span>
          <span className="text-[13px] text-ink-soft">{ongoing ? ongoingMeta(party) : finishedMeta(party)}</span>
        </span>
        {ongoing ? (
          <span className="text-sm font-semibold text-accent-text">Reprendre</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-soft">
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </Link>
    </li>
  )
}
