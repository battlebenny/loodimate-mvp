import { joinNames, points, withDe, withQue } from './french.js'
import { preselectWinners } from './scoring.js'
import type { Template } from './types.js'

export type HighlightInput = {
  template: Template
  gameName: string
  players: { id: string; name: string; total: number | null }[]
  winnerIds: string[]
  /** Winner's best total on this game over previous finished parties, null if none. */
  previousBestOfWinner: number | null
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x))
}

/** MVP highlight rules (Wireframes Loodi-mate.md), first matching rule wins. */
export function buildHighlight(i: HighlightInput): string | null {
  const winners = i.players.filter((p) => i.winnerIds.includes(p.id))
  if (winners.length === 0) return null
  const names = winners.map((w) => w.name)
  const generic = `Belle victoire ${withDe(joinNames(names))}`
  if (i.template === 'vainqueur seulement') return generic
  if (!sameSet(i.winnerIds, preselectWinners(i.players))) return generic

  const best = winners[0]!.total as number
  if (winners.length >= 2) return `Égalité entre ${joinNames(names)} avec ${points(best)}`

  const winner = winners[0]!
  if (i.previousBestOfWinner !== null && best > i.previousBestOfWinner) {
    return `Nouveau record ${withDe(winner.name)} sur ${i.gameName} : ${points(best)}`
  }

  const others = i.players
    .filter((p): p is { id: string; name: string; total: number } => p.id !== winner.id && typeof p.total === 'number')
    .sort((a, b) => b.total - a.total)
  const second = others[0]
  if (second) {
    return `Victoire ${withDe(winner.name)} avec ${points(best)}, ${best - second.total} de plus ${withQue(second.name)}`
  }
  return generic
}
