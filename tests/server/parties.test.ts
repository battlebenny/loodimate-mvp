import { beforeEach, describe, expect, it } from 'vitest'
import { F, T } from '../../server/core/airtable/schema.js'
import {
  addPhoto, createParty, finishParty, getParty, getSharedParty, listParties, saveSheet, updateSouvenir,
} from '../../server/core/services/parties.js'
import type { PartyDTO, SheetInput } from '../../shared/types.js'
import { FakeDb } from '../helpers/fakeDb.js'

let db: FakeDb
let me: string
let lea: string
let azul: string
beforeEach(() => {
  db = new FakeDb()
  me = db.seed(T.players, { [F.players.name]: 'Benny', [F.players.device]: 'dev-me' }).id
  lea = db.seed(T.players, { [F.players.name]: 'Léa', [F.players.device]: 'dev-lea' }).id
  azul = db.seed(T.games, { [F.games.name]: 'Azul', [F.games.bggId]: 230802, [F.games.template]: 'scores par manche' }).id
})

const actions = () => db.rows(T.events).map((e) => e.fields[F.events.action])
const pid = (p: PartyDTO, name: string) => p.players.find((x) => x.name === name)!.participationId

async function newAzul(players = ['Benny', 'Léa', 'Max', 'Inès']) {
  return createParty(db, 'dev-me', {
    game: { bggId: 230802, name: 'Azul' },
    players: players.map((n) => (n === 'Benny' ? { name: n, playerId: me } : { name: n })),
    creationSeconds: 37.6,
  })
}

function sheet(p: PartyDTO, scores: Record<string, (number | null)[]>, winners: string[] = [], template = p.template): SheetInput {
  const rounds = Object.values(scores)[0]?.length ?? 1
  return { template, rounds, scores: Object.fromEntries(Object.entries(scores).map(([n, s]) => [pid(p, n), s])), winners: winners.map((n) => pid(p, n)) }
}

describe('createParty', () => {
  it('creates players, party, participations and emits partie_creee within 7 calls', async () => {
    db.calls = 0
    const p = await newAzul()
    expect(db.calls).toBeLessThanOrEqual(7)
    const party = db.find(T.parties, p.id).fields
    expect(party).toMatchObject({
      [F.parties.game]: [azul],
      [F.parties.creator]: [me],
      [F.parties.status]: 'en cours',
      [F.parties.template]: 'scores par manche',
      [F.parties.rounds]: 1,
      [F.parties.creationSeconds]: 38,
    })
    expect(String(party[F.parties.ref])).toMatch(/^azul-\d{4}-\d{2}-\d{2}$/)
    expect(String(party[F.parties.shareToken])).toMatch(/^[A-Za-z0-9]{12}$/)
    expect(Date.parse(String(party[F.parties.createdAt]))).not.toBeNaN()
    const names = db.rows(T.players).map((r) => r.fields[F.players.name])
    expect(names).toEqual(['Benny', 'Léa', 'Max', 'Inès'])
    expect(db.rows(T.players).find((r) => r.fields[F.players.name] === 'Max')!.fields[F.players.device]).toBeUndefined()
    const parts = db.rows(T.participations)
    expect(parts).toHaveLength(4)
    expect(parts[0]!.fields).toMatchObject({ [F.participations.party]: [p.id], [F.participations.scores]: '[null]', [F.participations.winner]: false })
    expect(String(parts[1]!.fields[F.participations.ref])).toMatch(/ · Léa$/)
    expect(actions()).toEqual(['partie_creee'])
    expect(db.rows(T.events)[0]!.fields).toMatchObject({ [F.events.party]: [p.id], [F.events.player]: [me] })
    expect(p.players.map((x) => x.name)).toEqual(['Benny', 'Léa', 'Max', 'Inès'])
    expect(p.canEdit).toBe(true)
  })

  it('reuses existing players matched by name and creates the game if needed', async () => {
    const p = await createParty(db, 'dev-me', { game: { name: 'Jeu maison' }, players: [{ name: 'léa' }], creationSeconds: 10 })
    expect(p.players[0]!.playerId).toBe(lea)
    expect(db.rows(T.games)).toHaveLength(2)
  })

  it('stores empty scores for a winner-only game', async () => {
    db.seed(T.games, { [F.games.name]: 'Cluedo', [F.games.bggId]: 1294, [F.games.template]: 'vainqueur seulement' })
    const p = await createParty(db, 'dev-me', { game: { bggId: 1294, name: 'Cluedo' }, players: [{ name: 'Benny', playerId: me }], creationSeconds: 5 })
    expect(p.template).toBe('vainqueur seulement')
    expect(db.rows(T.participations)[0]!.fields[F.participations.scores]).toBe('')
  })

  it('rejects duplicate names and empty player lists', async () => {
    await expect(createParty(db, 'dev-me', { game: { name: 'X' }, players: [{ name: 'Max' }, { name: 'max ' }], creationSeconds: 1 })).rejects.toMatchObject({ status: 400 })
    await expect(createParty(db, 'dev-me', { game: { name: 'X' }, players: [], creationSeconds: 1 })).rejects.toMatchObject({ status: 400 })
  })

  it('requires an onboarded device', async () => {
    await expect(newAzul.call(null)).resolves.toBeTruthy()
    await expect(createParty(db, 'dev-unknown', { game: { name: 'X' }, players: [{ name: 'A' }], creationSeconds: 1 })).rejects.toMatchObject({ status: 401 })
  })
})

describe('saveSheet', () => {
  it('writes scores json, server totals, rounds, template and remembers the template on the game', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    const out = await saveSheet(db, 'dev-me', p.id, sheet(p, { Benny: [8, 12, null], Léa: [10, -3, 4] }))
    const b = db.find(T.participations, pid(p, 'Benny')).fields
    expect(b[F.participations.scores]).toBe('[8,12,null]')
    expect(b[F.participations.total]).toBe(20)
    expect(db.find(T.parties, p.id).fields[F.parties.rounds]).toBe(3)
    expect(out.players.find((x) => x.name === 'Léa')!.total).toBe(11)
    await saveSheet(db, 'dev-me', p.id, sheet(p, { Benny: [null], Léa: [null] }, ['Léa'], 'vainqueur seulement'))
    expect(db.find(T.parties, p.id).fields[F.parties.template]).toBe('vainqueur seulement')
    expect(db.find(T.games, azul).fields[F.games.template]).toBe('vainqueur seulement')
    expect(db.find(T.participations, pid(p, 'Léa')).fields[F.participations.winner]).toBe(true)
  })

  it('pads or truncates score arrays to the round count and ignores non numbers', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    await saveSheet(db, 'dev-me', p.id, { template: 'scores par manche', rounds: 2, scores: { [pid(p, 'Benny')]: [1, 2, 3], [pid(p, 'Léa')]: ['x' as unknown as number] }, winners: [] })
    expect(db.find(T.participations, pid(p, 'Benny')).fields[F.participations.scores]).toBe('[1,2]')
    expect(db.find(T.participations, pid(p, 'Léa')).fields[F.participations.scores]).toBe('[null,null]')
  })

  it('forbids another device', async () => {
    const p = await newAzul()
    await expect(saveSheet(db, 'dev-lea', p.id, sheet(p, {}))).rejects.toMatchObject({ status: 403, code: 'forbidden' })
  })
})

describe('finishParty', () => {
  it('finishes with preselected winners, highlight and a single partie_terminee', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    const out = await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
    expect(out.status).toBe('terminée')
    expect(out.finishedAt).toBeTruthy()
    expect(out.players.find((x) => x.name === 'Léa')!.winner).toBe(true)
    expect(out.highlight).toBe('Victoire de Léa avec 47 points, 6 de plus que Benny')
    expect(db.find(T.parties, p.id).fields[F.parties.highlight]).toBe(out.highlight)
    expect(actions()).toEqual(['partie_creee', 'partie_terminee'])
    // Finishing again is idempotent (final review I2): same souvenir, no second event.
    expect((await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))).id).toBe(p.id)
    expect(actions()).toEqual(['partie_creee', 'partie_terminee'])
  })

  it('uses the winners sent for a winner-only game', async () => {
    const p = await newAzul(['Benny', 'Inès', 'Max'])
    const out = await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [null], Inès: [null], Max: [null] }, ['Inès', 'Max'], 'vainqueur seulement'))
    expect(out.highlight).toBe("Belle victoire d’Inès et Max")
  })

  it('detects a personal record from previous finished games of the winner', async () => {
    const first = await newAzul(['Benny', 'Léa'])
    await finishParty(db, 'dev-me', first.id, sheet(first, { Benny: [51], Léa: [30] }))
    db.find(T.parties, first.id).fields[F.parties.finishedAt] = new Date(Date.now() - 86400000).toISOString()
    const second = await newAzul(['Benny', 'Léa'])
    const out = await finishParty(db, 'dev-me', second.id, sheet(second, { Benny: [58], Léa: [40] }))
    expect(out.highlight).toBe('Nouveau record de Benny sur Azul : 58 points')
  })

  it('ignores a duplicate of the same game recorded minutes ago when looking for a record', async () => {
    const first = await newAzul(['Benny', 'Léa'])
    await finishParty(db, 'dev-me', first.id, sheet(first, { Benny: [51], Léa: [30] }))
    db.find(T.parties, first.id).fields[F.parties.finishedAt] = new Date(Date.now() - 86400000).toISOString()
    const dup = await newAzul(['Benny', 'Léa'])
    await finishParty(db, 'dev-me', dup.id, sheet(dup, { Benny: [58], Léa: [40] }))
    const second = await newAzul(['Benny', 'Léa'])
    const out = await finishParty(db, 'dev-me', second.id, sheet(second, { Benny: [58], Léa: [40] }))
    expect(out.highlight).toBe('Nouveau record de Benny sur Azul : 58 points')
  })

  it('finishes an empty party without winner nor highlight', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    const out = await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [null], Léa: [0] }))
    expect(out.status).toBe('terminée')
    expect(out.players.every((x) => !x.winner)).toBe(true)
    expect(out.highlight).toBeNull()
  })
})

describe('updateSouvenir', () => {
  async function finished() {
    const p = await newAzul(['Benny', 'Léa'])
    return finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
  }

  it('regenerates an untouched highlight after a correction and keeps finishedAt', async () => {
    const p = await finished()
    const out = await updateSouvenir(db, 'dev-me', p.id, { scores: { [pid(p, 'Benny')]: [50] }, winners: [pid(p, 'Benny')] })
    expect(out.highlight).toBe('Victoire de Benny avec 50 points, 3 de plus que Léa')
    expect(out.finishedAt).toBe(p.finishedAt)
    expect(out.players.find((x) => x.name === 'Benny')!.total).toBe(50)
  })

  it('still regenerates a highlight stored before the typography pass', async () => {
    const p0 = await newAzul(['Benny', 'Inès'])
    const p = await finishParty(db, 'dev-me', p0.id, sheet(p0, { Benny: [41], Inès: [47] }))
    await updateSouvenir(db, 'dev-me', p.id, { highlight: "Victoire d'Inès avec 47 points, 6 de plus que Benny" })
    const out = await updateSouvenir(db, 'dev-me', p.id, { scores: { [pid(p, 'Benny')]: [50] }, winners: [pid(p, 'Benny')] })
    expect(out.highlight).toBe('Victoire de Benny avec 50 points, 3 de plus qu’Inès')
  })

  it('keeps a hand-written highlight after a correction', async () => {
    const p = await finished()
    await updateSouvenir(db, 'dev-me', p.id, { highlight: '  Léa a tout raflé  ' })
    const out = await updateSouvenir(db, 'dev-me', p.id, { scores: { [pid(p, 'Benny')]: [50] }, winners: [pid(p, 'Benny')] })
    expect(out.highlight).toBe('Léa a tout raflé')
  })

  it('caps the highlight at 280 characters and restores the automatic one when cleared', async () => {
    const p = await finished()
    const auto = p.highlight
    expect(auto).toBeTruthy()
    expect((await updateSouvenir(db, 'dev-me', p.id, { highlight: 'x'.repeat(400) })).highlight).toHaveLength(280)
    expect((await updateSouvenir(db, 'dev-me', p.id, { highlight: '   ' })).highlight).toBe(auto)
  })

  it('forbids another device', async () => {
    const p = await finished()
    await expect(updateSouvenir(db, 'dev-lea', p.id, { highlight: 'x' })).rejects.toMatchObject({ status: 403 })
  })
})

describe('photos', () => {
  const file = { base64: 'QUJD', contentType: 'image/jpeg', filename: 'p.jpg' }
  it('uploads up to 3 photos then refuses', async () => {
    const p = await newAzul(['Benny'])
    for (let i = 0; i < 3; i++) await addPhoto(db, 'dev-me', p.id, file)
    expect(db.uploads.map((u) => u.fieldId)).toEqual([F.parties.photos, F.parties.photos, F.parties.photos])
    await expect(addPhoto(db, 'dev-me', p.id, file)).rejects.toMatchObject({ status: 409, code: 'photo_limit' })
    const out = await getParty(db, 'dev-me', p.id)
    expect(out.photos).toHaveLength(3)
    expect(out.photos[0]!.thumbUrl).toContain('https://dl/l/')
  })
  it('refuses non image content and other devices', async () => {
    const p = await newAzul(['Benny'])
    await expect(addPhoto(db, 'dev-me', p.id, { ...file, contentType: 'text/html' })).rejects.toMatchObject({ status: 400 })
    await expect(addPhoto(db, 'dev-lea', p.id, file)).rejects.toMatchObject({ status: 403 })
  })
})

describe('reading', () => {
  it('serves the shared view without token nor edit rights', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    const shared = await getSharedParty(db, p.shareToken!)
    expect(shared.canEdit).toBe(false)
    expect(shared.shareToken).toBeUndefined()
    expect(shared.creatorName).toBe('Benny')
    await expect(getSharedParty(db, 'nope00000000')).rejects.toMatchObject({ status: 404 })
  })

  it('getParty is creator only', async () => {
    const p = await newAzul()
    expect((await getParty(db, 'dev-me', p.id)).shareToken).toBe(p.shareToken)
    await expect(getParty(db, 'dev-lea', p.id)).rejects.toMatchObject({ status: 403 })
  })

  it('lists the device parties by status', async () => {
    const a = await newAzul(['Benny', 'Léa'])
    const b = await newAzul(['Benny', 'Inès'])
    await finishParty(db, 'dev-me', b.id, sheet(b, { Benny: [3], Inès: [5] }))
    const ongoing = await listParties(db, 'dev-me', 'en cours')
    expect(ongoing.map((x) => x.id)).toEqual([a.id])
    const done = await listParties(db, 'dev-me', 'terminée')
    expect(done).toHaveLength(1)
    expect(done[0]).toMatchObject({ id: b.id, playerCount: 2, winnerNames: ['Inès'], photoCount: 0, game: { name: 'Azul', image: null } })
    expect(await listParties(db, 'dev-lea', 'terminée')).toEqual([])
  })
})

describe('saveSheet and winners', () => {
  it('does not touch winners for a round-score sheet (they are decided at finish)', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
    const lea = db.find(T.participations, pid(p, 'Léa'))
    expect(lea.fields[F.participations.winner]).toBe(true)
    // A late sheet save racing the finish must not reset the winner.
    db.find(T.parties, p.id).fields[F.parties.status] = 'en cours'
    await saveSheet(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
    expect(db.find(T.participations, pid(p, 'Léa')).fields[F.participations.winner]).toBe(true)
  })
})

describe('final review fixes', () => {
  it('I2: finishing again is idempotent and re-emits a missing partie_terminee', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    const first = await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
    // Simulate a lost event: delete it.
    db.tables[T.events] = db.rows(T.events).filter((e) => e.fields[F.events.action] !== 'partie_terminee')
    const again = await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
    expect(again.status).toBe('terminée')
    expect(again.finishedAt).toBe(first.finishedAt)
    expect(actions().filter((a) => a === 'partie_terminee')).toHaveLength(1)
    await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
    expect(actions().filter((a) => a === 'partie_terminee')).toHaveLength(1)
  })

  it('I2: status, finish date and highlight are written in a single party update', async () => {
    const p = await newAzul(['Benny', 'Léa'])
    const writes: Record<string, unknown>[] = []
    const update = db.update.bind(db)
    db.update = async (table, rows) => {
      if (table === T.parties) writes.push(...rows.map((r) => r.fields))
      return update(table, rows)
    }
    await finishParty(db, 'dev-me', p.id, sheet(p, { Benny: [41], Léa: [47] }))
    const withStatus = writes.filter((w) => F.parties.status in w)
    expect(withStatus).toHaveLength(1)
    expect(withStatus[0]).toMatchObject({ [F.parties.status]: 'terminée', [F.parties.highlight]: 'Victoire de Léa avec 47 points, 6 de plus que Benny' })
    expect(withStatus[0]![F.parties.finishedAt]).toBeTruthy()
  })

  it('I3: a retried creation right after returns the same party without a second partie_creee', async () => {
    const a = await newAzul(['Benny', 'Léa'])
    const b = await newAzul(['Benny', 'Léa'])
    expect(b.id).toBe(a.id)
    expect(db.rows(T.parties)).toHaveLength(1)
    expect(actions().filter((x) => x === 'partie_creee')).toHaveLength(1)
  })

  it('I3: a different game or player list still creates a new party', async () => {
    const a = await newAzul(['Benny', 'Léa'])
    const b = await newAzul(['Benny', 'Max'])
    expect(b.id).not.toBe(a.id)
  })

  it('I3: an orphan party without participations is completed on retry', async () => {
    const a = await newAzul(['Benny', 'Léa'])
    for (const id of a.players.map((x) => x.participationId)) db.tables[T.participations] = db.rows(T.participations).filter((r) => r.id !== id)
    db.find(T.parties, a.id).fields[F.parties.participations] = []
    db.tables[T.events] = []
    const b = await newAzul(['Benny', 'Léa'])
    expect(b.id).toBe(a.id)
    expect(b.players.map((x) => x.name)).toEqual(['Benny', 'Léa'])
    expect(actions()).toEqual(['partie_creee'])
  })

  it('I1: listParties returns ongoing and finished parties in one call', async () => {
    const a = await newAzul(['Benny', 'Léa'])
    const b = await newAzul(['Benny', 'Max'])
    await finishParty(db, 'dev-me', b.id, sheet(b, { Benny: [3], Max: [5] }))
    const all = await listParties(db, 'dev-me')
    expect(all.map((x) => [x.id, x.status]).sort()).toEqual([[a.id, 'en cours'], [b.id, 'terminée']].sort())
  })
})
