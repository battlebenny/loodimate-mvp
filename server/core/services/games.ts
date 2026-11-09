import type { Db } from '../airtable/db.js'
import type { AirRecord } from '../airtable/client.js'
import { and, byNameFormula, isBlank } from '../airtable/formula.js'
import { F, T } from '../airtable/schema.js'
import { normalizeName } from '../../../shared/names.js'
import type { Template } from '../../../shared/types.js'

export type GameRow = { id: string; name: string; template: Template; image: string | null }

export const toGame = (r: AirRecord): GameRow => ({
  id: r.id,
  name: String(r.fields[F.games.name] ?? ''),
  template: (r.fields[F.games.template] as Template | undefined) ?? 'scores par manche',
  image: (r.fields[F.games.image] as string | undefined) ?? null,
})

export async function findOrCreateGame(db: Db, g: { bggId?: number; name: string; image?: string | null }): Promise<GameRow> {
  const name = normalizeName(g.name)
  const formula = g.bggId ? `{${F.games.bggId}}=${Math.trunc(g.bggId)}` : and(byNameFormula(F.games.name, name), isBlank(F.games.bggId))
  const [existing] = await db.list(T.games, { filterByFormula: formula, maxRecords: 1 })
  if (existing) return toGame(existing)
  const fields: Record<string, unknown> = { [F.games.name]: name, [F.games.template]: 'scores par manche' }
  if (g.bggId) fields[F.games.bggId] = Math.trunc(g.bggId)
  if (g.image) fields[F.games.image] = g.image
  const [created] = await db.create(T.games, [fields])
  return toGame(created!)
}

export async function setGameTemplate(db: Db, gameId: string, template: Template): Promise<void> {
  await db.update(T.games, [{ id: gameId, fields: { [F.games.template]: template } }])
}
