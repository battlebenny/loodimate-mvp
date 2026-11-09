import type { Db } from '../airtable/db.js'
import type { AirRecord } from '../airtable/client.js'
import { byDeviceFormula, byNameFormula } from '../airtable/formula.js'
import { F, T } from '../airtable/schema.js'
import { HttpError } from '../http.js'
import { normalizeName } from '../../../shared/names.js'
import type { PlayerDTO } from '../../../shared/types.js'
import { recordEvent } from './events.js'

export const toPlayer = (r: AirRecord): PlayerDTO => ({ id: r.id, name: String(r.fields[F.players.name] ?? '') })

export async function findPlayerByDevice(db: Db, deviceId: string): Promise<PlayerDTO | null> {
  if (!deviceId) return null
  const recs = await db.list(T.players, { filterByFormula: byDeviceFormula(F.players.device, deviceId), maxRecords: 1 })
  return recs[0] ? toPlayer(recs[0]) : null
}

/** Same as findPlayerByDevice but fails with 401 when the device is not onboarded. */
export async function requirePlayer(db: Db, deviceId: string | null): Promise<PlayerDTO> {
  const p = deviceId ? await findPlayerByDevice(db, deviceId) : null
  if (!p) throw new HttpError(401, 'not_onboarded', 'Présente-toi d’abord pour utiliser Loodi-mate.')
  return p
}

export function linkDevice(current: string | null | undefined, deviceId: string): string {
  const ids = (current ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.includes(deviceId)) ids.push(deviceId)
  return ids.join(',')
}

export async function findPlayerByName(db: Db, name: string): Promise<AirRecord | null> {
  const recs = await db.list(T.players, { filterByFormula: byNameFormula(F.players.name, name), maxRecords: 1 })
  return recs[0] ?? null
}

export async function lookupName(db: Db, name: string): Promise<{ status: 'free' | 'unclaimed' | 'onboarded'; player?: PlayerDTO }> {
  const rec = await findPlayerByName(db, normalizeName(name))
  if (!rec) return { status: 'free' }
  return { status: rec.fields[F.players.device] ? 'onboarded' : 'unclaimed', player: toPlayer(rec) }
}

export async function onboard(db: Db, deviceId: string, firstName: string, mode: 'new' | 'claim' | 'link'): Promise<PlayerDTO> {
  const name = normalizeName(firstName)
  if (!name || !deviceId) throw new HttpError(400, 'bad_request', 'Indique ton prénom.')
  if (name.length > 40) throw new HttpError(400, 'bad_request', 'Ce prénom est trop long.')
  const today = new Date().toISOString().slice(0, 10)
  const existing = await findPlayerByName(db, name)
  let player: PlayerDTO
  if (!existing) {
    const [rec] = await db.create(T.players, [{ [F.players.name]: name, [F.players.device]: deviceId, [F.players.onboardedAt]: today }])
    player = toPlayer(rec!)
  } else {
    const currentDevice = existing.fields[F.players.device] as string | undefined
    if (!currentDevice) {
      if (mode !== 'claim') throw new HttpError(409, 'claimable', `${toPlayer(existing).name} joue déjà dans vos parties.`)
      await db.update(T.players, [{ id: existing.id, fields: { [F.players.device]: deviceId, [F.players.onboardedAt]: today } }])
    } else if (currentDevice.split(',').includes(deviceId)) {
      return toPlayer(existing)
    } else {
      if (mode !== 'link') throw new HttpError(409, 'taken', `Le prénom ${toPlayer(existing).name} est déjà utilisé.`)
      await db.update(T.players, [{ id: existing.id, fields: { [F.players.device]: linkDevice(currentDevice, deviceId) } }])
    }
    player = toPlayer(existing)
  }
  await recordEvent(db, { action: 'appareil_cree', origin: 'app', visitorId: deviceId, playerId: player.id })
  return player
}

/** Names already used by this device (players of the parties it created), most frequent first. */
export async function knownNames(db: Db, deviceId: string | null): Promise<string[]> {
  const me = await requirePlayer(db, deviceId)
  const [rec] = await db.getByIds(T.players, [me.id])
  const parties = await db.getByIds(T.parties, (rec?.fields[F.players.createdParties] as string[] | undefined) ?? [])
  const parts = await db.getByIds(T.participations, parties.flatMap((p) => (p.fields[F.parties.participations] as string[] | undefined) ?? []))
  const count = new Map<string, number>()
  for (const p of parts) {
    const id = ((p.fields[F.participations.player] as string[] | undefined) ?? [])[0]
    if (id && id !== me.id) count.set(id, (count.get(id) ?? 0) + 1)
  }
  const players = await db.getByIds(T.players, [...count.keys()])
  return players
    .map((p) => ({ name: String(p.fields[F.players.name] ?? ''), n: count.get(p.id) ?? 0 }))
    .filter((p) => p.name)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'fr'))
    .map((p) => p.name)
}
