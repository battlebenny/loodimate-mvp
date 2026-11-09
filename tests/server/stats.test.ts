import { beforeEach, describe, expect, it } from 'vitest'
import { F, T } from '../../server/core/airtable/schema.js'
import { loadStats } from '../../server/core/services/stats.js'
import { FakeDb } from '../helpers/fakeDb.js'

let db: FakeDb
beforeEach(() => (db = new FakeDb()))

function seedParty(creator: string, game: string, status: string, finishedAt: string, rows: [string, number | null, boolean][], template = 'scores par manche') {
  const p = db.seed(T.parties, { [F.parties.creator]: [creator], [F.parties.game]: [game], [F.parties.status]: status, [F.parties.finishedAt]: finishedAt, [F.parties.template]: template })
  for (const [player, total, winner] of rows) {
    db.seed(T.participations, { [F.participations.party]: [p.id], [F.participations.player]: [player], [F.participations.total]: total ?? undefined, [F.participations.winner]: winner })
  }
  return p
}

describe('loadStats', () => {
  it('loads all finished parties of my player, including ones recorded by others, within 6 calls', async () => {
    const me = db.seed(T.players, { [F.players.name]: 'Benny', [F.players.device]: 'dev-me' }).id
    const lea = db.seed(T.players, { [F.players.name]: 'Léa', [F.players.device]: 'dev-lea' }).id
    const azul = db.seed(T.games, { [F.games.name]: 'Azul' }).id
    seedParty(me, azul, 'terminée', '2026-11-01T20:00:00Z', [[me, 50, true], [lea, 40, false]])
    seedParty(lea, azul, 'terminée', '2026-11-02T20:00:00Z', [[me, 30, false], [lea, 45, true]])
    seedParty(me, azul, 'en cours', '', [[me, 10, false], [lea, 5, false]])
    db.calls = 0
    const s = await loadStats(db, 'dev-me')
    expect(db.calls).toBeLessThanOrEqual(6)
    expect(s.parties).toBe(2)
    expect(s.wins).toBe(1)
    expect(s.byGame[0]).toMatchObject({ name: 'Azul', best: 50, min: 30, avg: 40 })
    expect(s.winsByPlayer).toEqual([
      { name: 'Benny', wins: 1, isMe: true },
      { name: 'Léa', wins: 1, isMe: false },
    ])
  })

  it('returns zeros for a new player', async () => {
    db.seed(T.players, { [F.players.name]: 'Zoé', [F.players.device]: 'dev-z' })
    expect((await loadStats(db, 'dev-z')).parties).toBe(0)
  })
})
