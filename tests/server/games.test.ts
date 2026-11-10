import { beforeEach, describe, expect, it } from 'vitest'
import { F, T } from '../../server/core/airtable/schema.js'
import { findOrCreateGame, setGameTemplate } from '../../server/core/services/games.js'
import { FakeDb } from '../helpers/fakeDb.js'

let db: FakeDb
beforeEach(() => (db = new FakeDb()))

describe('findOrCreateGame', () => {
  it('finds an existing game by BGG id', async () => {
    const g = db.seed(T.games, { [F.games.name]: 'Azul', [F.games.bggId]: 230802, [F.games.template]: 'vainqueur seulement' })
    expect(await findOrCreateGame(db, { bggId: 230802, name: 'Azul (FR)' })).toEqual({ id: g.id, name: 'Azul', template: 'vainqueur seulement', image: null })
    expect(db.rows(T.games)).toHaveLength(1)
  })

  it('finds a free-text game by name only among games without BGG id', async () => {
    db.seed(T.games, { [F.games.name]: 'Loup-garou', [F.games.bggId]: 123 })
    const free = db.seed(T.games, { [F.games.name]: 'Loup-garou' })
    expect((await findOrCreateGame(db, { name: 'loup-GAROU' })).id).toBe(free.id)
  })

  it('creates a missing game with the default template and image', async () => {
    const g = await findOrCreateGame(db, { bggId: 1, name: 'Cascadia', image: 'https://img/c.jpg' })
    expect(g).toMatchObject({ name: 'Cascadia', template: 'scores par manche', image: 'https://img/c.jpg' })
    expect(db.find(T.games, g.id).fields).toEqual({
      [F.games.name]: 'Cascadia',
      [F.games.bggId]: 1,
      [F.games.image]: 'https://img/c.jpg',
      [F.games.template]: 'scores par manche',
    })
  })

  it('creates a free-text game without BGG id', async () => {
    const g = await findOrCreateGame(db, { name: "  Jeu d'Inès " })
    expect(db.find(T.games, g.id).fields[F.games.bggId]).toBeUndefined()
    expect(g.name).toBe("Jeu d'Inès")
  })
})

describe('setGameTemplate', () => {
  it('stores the template on the game', async () => {
    const g = db.seed(T.games, { [F.games.name]: 'Cluedo', [F.games.template]: 'scores par manche' })
    await setGameTemplate(db, g.id, 'vainqueur seulement')
    expect(db.find(T.games, g.id).fields[F.games.template]).toBe('vainqueur seulement')
  })
})
