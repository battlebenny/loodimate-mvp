import type { Scores, Template } from './types.js'

export function computeTotal(scores: Scores): number | null {
  let total: number | null = null
  for (const v of scores) if (typeof v === 'number') total = (total ?? 0) + v
  return total
}

/** Every player tied at the best total; nobody when no one actually scored. */
export function preselectWinners(totals: { id: string; total: number | null }[]): string[] {
  const scored = totals.filter((t): t is { id: string; total: number } => typeof t.total === 'number')
  if (scored.length === 0 || scored.every((t) => t.total === 0)) return []
  const best = Math.max(...scored.map((t) => t.total))
  return scored.filter((t) => t.total === best).map((t) => t.id)
}

/** A finished party that carries no result: no winner and no non-zero total. */
export function isEmptyResult(template: Template, totals: (number | null)[], winnerIds: string[]): boolean {
  if (winnerIds.length > 0) return false
  if (template === 'vainqueur seulement') return true
  return totals.every((t) => t === null || t === 0)
}
