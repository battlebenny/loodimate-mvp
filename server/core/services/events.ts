import type { Db } from '../airtable/db.js'
import { byFieldEquals } from '../airtable/formula.js'
import { F, T } from '../airtable/schema.js'
import type { EventAction, Origin } from '../../../shared/types.js'
import { findPlayerByDevice } from './players.js'

export type RecordEventInput = {
  action: EventAction
  origin: Origin
  visitorId: string
  partyId?: string
  eventId?: string
  retry?: boolean
  /** Known player (skips the lookup by visitor id). */
  playerId?: string
}

export async function recordEvent(db: Db, e: RecordEventInput): Promise<void> {
  const eventId = e.eventId ?? crypto.randomUUID()
  if (e.retry) {
    const existing = await db.list(T.events, { filterByFormula: byFieldEquals(F.events.id, eventId), maxRecords: 1 })
    if (existing.length > 0) return
  }
  const playerId = e.playerId ?? (await findPlayerByDevice(db, e.visitorId))?.id
  const fields: Record<string, unknown> = {
    [F.events.id]: eventId,
    [F.events.visitorId]: e.visitorId,
    [F.events.action]: e.action,
    [F.events.origin]: e.origin,
    [F.events.date]: new Date().toISOString(),
  }
  if (e.partyId) fields[F.events.party] = [e.partyId]
  if (playerId) fields[F.events.player] = [playerId]
  await db.create(T.events, [fields])
}
