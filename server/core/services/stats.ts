import type { Db } from '../airtable/db.js'
import { F, T } from '../airtable/schema.js'
import { computeStats, type FinishedParty } from '../../../shared/stats.js'
import type { StatsDTO, Template } from '../../../shared/types.js'
import { requirePlayerRecord } from './players.js'

const ids = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : [])

/** Stats of the device's player over every finished party they played (any recorder). */
export async function loadStats(db: Db, deviceId: string | null): Promise<StatsDTO> {
  const player = await requirePlayerRecord(db, deviceId)
  const me = { id: player.id }
  const myParts = await db.getByIds(T.participations, ids(player.fields[F.players.participations]))
  const parties = (await db.getByIds(T.parties, myParts.flatMap((p) => ids(p.fields[F.participations.party])))).filter(
    (p) => p.fields[F.parties.status] === 'terminée',
  )
  if (parties.length === 0) return computeStats(me.id, [])
  const parts = await db.getByIds(T.participations, parties.flatMap((p) => ids(p.fields[F.parties.participations])))
  const [players, games] = await Promise.all([
    db.getByIds(T.players, parts.flatMap((p) => ids(p.fields[F.participations.player]))),
    db.getByIds(T.games, parties.flatMap((p) => ids(p.fields[F.parties.game]))),
  ])
  const nameOf = new Map(players.map((p) => [p.id, String(p.fields[F.players.name] ?? '')]))
  const gameOf = new Map(games.map((g) => [g.id, String(g.fields[F.games.name] ?? 'Jeu')]))
  const finished: FinishedParty[] = parties.map((p) => {
    const gameId = ids(p.fields[F.parties.game])[0] ?? ''
    return {
      id: p.id,
      gameId,
      gameName: gameOf.get(gameId) ?? 'Jeu',
      template: (p.fields[F.parties.template] as Template | undefined) ?? 'scores par manche',
      finishedAt: String(p.fields[F.parties.finishedAt] ?? p.createdTime),
      players: parts
        .filter((x) => ids(p.fields[F.parties.participations]).includes(x.id))
        .map((x) => {
          const playerId = ids(x.fields[F.participations.player])[0] ?? ''
          const total = x.fields[F.participations.total]
          return { playerId, name: nameOf.get(playerId) ?? '', total: typeof total === 'number' ? total : null, winner: x.fields[F.participations.winner] === true }
        }),
    }
  })
  return computeStats(me.id, finished)
}
