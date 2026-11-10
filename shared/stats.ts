import { isEmptyResult } from './scoring.js'
import type { StatsDTO, Template } from './types.js'

export type FinishedParty = {
  id: string
  gameId: string
  gameName: string
  template: Template
  finishedAt: string
  players: { playerId: string; name: string; total: number | null; winner: boolean }[]
}

const WINDOW_MS = 30 * 60 * 1000

function signature(p: FinishedParty): string {
  const rows = [...p.players].sort((a, b) => a.playerId.localeCompare(b.playerId))
  const totals = p.template === 'scores par manche' ? rows.map((r) => r.total ?? '') : []
  return JSON.stringify([p.gameId, rows.map((r) => r.playerId), rows.filter((r) => r.winner).map((r) => r.playerId), totals])
}

/**
 * Same party recorded by several players (display-only dedup, decided 2026-11-08):
 * same game, players, winners and totals, finished less than 30 minutes apart.
 * Returns the ids to drop; the earliest finished one is kept.
 */
export function findDuplicates(parties: FinishedParty[]): Set<string> {
  const drop = new Set<string>()
  const sorted = [...parties].sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt))
  const kept: { sig: string; at: number }[] = []
  for (const p of sorted) {
    const sig = signature(p)
    const at = Date.parse(p.finishedAt)
    if (kept.some((k) => k.sig === sig && Math.abs(at - k.at) < WINDOW_MS)) drop.add(p.id)
    else kept.push({ sig, at })
  }
  return drop
}

export function computeStats(meId: string, all: FinishedParty[]): StatsDTO {
  const nonEmpty = all.filter(
    (p) => !isEmptyResult(p.template, p.players.map((x) => x.total), p.players.filter((x) => x.winner).map((x) => x.playerId)),
  )
  const drop = findDuplicates(nonEmpty)
  const parties = nonEmpty.filter((p) => !drop.has(p.id) && p.players.some((x) => x.playerId === meId))

  const mine = (p: FinishedParty) => p.players.find((x) => x.playerId === meId)!
  const wins = parties.filter((p) => mine(p).winner).length

  const games = new Map<string, FinishedParty[]>()
  for (const p of parties) games.set(p.gameId, [...(games.get(p.gameId) ?? []), p])
  const byGame = [...games.entries()]
    .map(([gameId, list]) => {
      const totals = list.filter((p) => p.template === 'scores par manche').map((p) => mine(p).total).filter((t): t is number => t !== null)
      const hasScores = totals.length > 0
      return {
        gameId,
        name: list[0]!.gameName,
        parties: list.length,
        wins: list.filter((p) => mine(p).winner).length,
        best: hasScores ? Math.max(...totals) : null,
        avg: hasScores ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
        min: hasScores ? Math.min(...totals) : null,
        hasScores,
      }
    })
    .sort((a, b) => b.parties - a.parties || a.name.localeCompare(b.name, 'fr'))

  const tally = new Map<string, { name: string; wins: number; isMe: boolean }>()
  for (const p of parties) {
    for (const x of p.players) {
      const t = tally.get(x.playerId) ?? { name: x.name, wins: 0, isMe: x.playerId === meId }
      if (x.winner) t.wins++
      tally.set(x.playerId, t)
    }
  }
  const winsByPlayer = [...tally.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name, 'fr'))

  return { parties: parties.length, wins, winRate: parties.length ? Math.round((wins / parties.length) * 100) : 0, byGame, winsByPlayer }
}
