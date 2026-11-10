import { beforeEach, describe, expect, it } from 'vitest'
import { F, T } from '../../server/core/airtable/schema.js'
import { findPlayerByDevice, linkDevice, lookupName, onboard } from '../../server/core/services/players.js'
import { recordEvent } from '../../server/core/services/events.js'
import { FakeDb } from '../helpers/fakeDb.js'

let db: FakeDb
beforeEach(() => {
  db = new FakeDb()
})

const events = () => db.rows(T.events).map((e) => e.fields)

describe('onboard', () => {
  it('creates a new player with device, UTC date and emits appareil_cree', async () => {
    const p = await onboard(db, 'dev-1', '  Benny ', 'new')
    expect(p.name).toBe('Benny')
    const rec = db.find(T.players, p.id)
    expect(rec.fields[F.players.device]).toBe('dev-1')
    expect(rec.fields[F.players.onboardedAt]).toBe(new Date().toISOString().slice(0, 10))
    expect(events()).toHaveLength(1)
    expect(events()[0]).toMatchObject({
      [F.events.action]: 'appareil_cree',
      [F.events.origin]: 'app',
      [F.events.visitorId]: 'dev-1',
      [F.events.player]: [p.id],
    })
  })

  it('refuses an existing unclaimed name in new mode', async () => {
    db.seed(T.players, { [F.players.name]: 'Inès' })
    await expect(onboard(db, 'dev-2', 'inès', 'new')).rejects.toMatchObject({ status: 409, code: 'claimable' })
  })

  it('claims an existing player without device', async () => {
    const existing = db.seed(T.players, { [F.players.name]: 'Inès' })
    const p = await onboard(db, 'dev-2', 'inès', 'claim')
    expect(p).toEqual({ id: existing.id, name: 'Inès' })
    expect(db.find(T.players, existing.id).fields[F.players.device]).toBe('dev-2')
    expect(events()[0]![F.events.action]).toBe('appareil_cree')
  })

  it('refuses a name taken by another device in new mode', async () => {
    db.seed(T.players, { [F.players.name]: 'Max', [F.players.device]: 'dev-old' })
    await expect(onboard(db, 'dev-3', 'Max', 'new')).rejects.toMatchObject({ status: 409, code: 'taken' })
  })

  it('links a new device to a player in link mode without dropping the old one', async () => {
    const existing = db.seed(T.players, { [F.players.name]: 'Max', [F.players.device]: 'dev-old' })
    await onboard(db, 'dev-3', 'Max', 'link')
    expect(db.find(T.players, existing.id).fields[F.players.device]).toBe('dev-old,dev-3')
    expect(await findPlayerByDevice(db, 'dev-old')).toMatchObject({ id: existing.id })
    expect(await findPlayerByDevice(db, 'dev-3')).toMatchObject({ id: existing.id })
  })

  it('rejects an empty first name', async () => {
    await expect(onboard(db, 'dev-1', '   ', 'new')).rejects.toMatchObject({ status: 400 })
  })
})

describe('linkDevice', () => {
  it('appends without duplicates', () => {
    expect(linkDevice('a', 'b')).toBe('a,b')
    expect(linkDevice('a', 'a')).toBe('a')
    expect(linkDevice(null, 'b')).toBe('b')
    expect(linkDevice('a,b', 'b')).toBe('a,b')
  })
})

describe('lookupName', () => {
  it('reports free, unclaimed and onboarded names', async () => {
    const i = db.seed(T.players, { [F.players.name]: 'Inès' })
    db.seed(T.players, { [F.players.name]: 'Max', [F.players.device]: 'd' })
    expect(await lookupName(db, 'Zoé')).toEqual({ status: 'free' })
    expect(await lookupName(db, 'INÈS')).toEqual({ status: 'unclaimed', player: { id: i.id, name: 'Inès' } })
    expect((await lookupName(db, 'max')).status).toBe('onboarded')
  })
})

describe('recordEvent', () => {
  it('writes every field and links party and player found by visitor id', async () => {
    const pl = db.seed(T.players, { [F.players.name]: 'Benny', [F.players.device]: 'dev-1' })
    const pa = db.seed(T.parties, { [F.parties.ref]: 'azul' })
    await recordEvent(db, { eventId: 'e1', action: 'lien_partage', origin: 'app', visitorId: 'dev-1', partyId: pa.id })
    const e = events()[0]!
    expect(e).toMatchObject({
      [F.events.id]: 'e1',
      [F.events.visitorId]: 'dev-1',
      [F.events.action]: 'lien_partage',
      [F.events.origin]: 'app',
      [F.events.party]: [pa.id],
      [F.events.player]: [pl.id],
    })
    expect(Date.parse(String(e[F.events.date]))).not.toBeNaN()
  })

  it('leaves player empty for an anonymous visitor', async () => {
    await recordEvent(db, { eventId: 'e2', action: 'souvenir_ouvert', origin: 'lien', visitorId: 'anon-1' })
    expect(events()[0]![F.events.player]).toBeUndefined()
  })

  it('does not duplicate an event on retry', async () => {
    await recordEvent(db, { eventId: 'e3', action: 'cta_clic', origin: 'lien', visitorId: 'anon' })
    await recordEvent(db, { eventId: 'e3', action: 'cta_clic', origin: 'lien', visitorId: 'anon', retry: true })
    expect(events()).toHaveLength(1)
  })
})

describe('knownNames', () => {
  it('lists players from parties created by the device, most frequent first, without me nor duplicates', async () => {
    const { knownNames } = await import('../../server/core/services/players.js')
    const me = db.seed(T.players, { [F.players.name]: 'Benny', [F.players.device]: 'dev-me' })
    const other = db.seed(T.players, { [F.players.name]: 'Zoé', [F.players.device]: 'dev-z' })
    const [lea, max, ines] = ['Léa', 'Max', 'Inès'].map((n) => db.seed(T.players, { [F.players.name]: n }))
    const party = (creator: string, players: string[]) => {
      const p = db.seed(T.parties, { [F.parties.creator]: [creator] })
      for (const pl of players) db.seed(T.participations, { [F.participations.party]: [p.id], [F.participations.player]: [pl] })
    }
    party(me.id, [me.id, lea!.id, max!.id])
    party(me.id, [me.id, max!.id])
    party(other.id, [other.id, ines!.id])
    expect(await knownNames(db, 'dev-me')).toEqual(['Max', 'Léa'])
  })
})
