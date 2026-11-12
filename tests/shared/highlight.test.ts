import { describe, expect, it } from 'vitest'
import { buildHighlight, type HighlightInput } from '../../shared/highlight.js'
import { joinNames, points, withDe, withQue } from '../../shared/french.js'

const base = (over: Partial<HighlightInput>): HighlightInput => ({
  template: 'scores par manche',
  gameName: 'Azul',
  players: [],
  winnerIds: [],
  previousBestOfWinner: null,
  ...over,
})

describe('buildHighlight', () => {
  it('rule 1: tie between two players', () => {
    const players = [{ id: 'l', name: 'Léa', total: 30 }, { id: 'm', name: 'Max', total: 30 }, { id: 'b', name: 'Benny', total: 12 }]
    expect(buildHighlight(base({ players, winnerIds: ['l', 'm'] }))).toBe('Égalité entre Léa et Max avec 30 points')
  })
  it('rule 1: tie between three players', () => {
    const players = [{ id: 'l', name: 'Léa', total: 30 }, { id: 'm', name: 'Max', total: 30 }, { id: 'i', name: 'Inès', total: 30 }]
    expect(buildHighlight(base({ players, winnerIds: ['l', 'm', 'i'] }))).toBe('Égalité entre Léa, Max et Inès avec 30 points')
  })
  it('rule 2: personal record beaten', () => {
    const players = [{ id: 'i', name: 'Inès', total: 58 }, { id: 'b', name: 'Benny', total: 40 }]
    expect(buildHighlight(base({ players, winnerIds: ['i'], previousBestOfWinner: 51 }))).toBe("Nouveau record d’Inès sur Azul : 58 points")
  })
  it('rule 2 does not apply without a previous finished game', () => {
    const players = [{ id: 'i', name: 'Inès', total: 58 }, { id: 'b', name: 'Benny', total: 40 }]
    expect(buildHighlight(base({ players, winnerIds: ['i'], previousBestOfWinner: null }))).toBe("Victoire d’Inès avec 58 points, 18 de plus que Benny")
  })
  it('rule 2 does not apply when the record is only equalled', () => {
    const players = [{ id: 'i', name: 'Inès', total: 58 }, { id: 'b', name: 'Benny', total: 40 }]
    expect(buildHighlight(base({ players, winnerIds: ['i'], previousBestOfWinner: 58 }))).toBe("Victoire d’Inès avec 58 points, 18 de plus que Benny")
  })
  it('rule 3: gap with the runner-up', () => {
    const players = [{ id: 'b', name: 'Benny', total: 41 }, { id: 'l', name: 'Léa', total: 47 }, { id: 'm', name: 'Max', total: 20 }]
    expect(buildHighlight(base({ players, winnerIds: ['l'] }))).toBe('Victoire de Léa avec 47 points, 6 de plus que Benny')
  })
  it('rule 3: elides que before a vowel', () => {
    const players = [{ id: 'i', name: 'Inès', total: 41 }, { id: 'l', name: 'Léa', total: 47 }]
    expect(buildHighlight(base({ players, winnerIds: ['l'] }))).toBe("Victoire de Léa avec 47 points, 6 de plus qu’Inès")
  })
  it('rule 3: gap of one', () => {
    const players = [{ id: 'b', name: 'Benny', total: 46 }, { id: 'l', name: 'Léa', total: 47 }]
    expect(buildHighlight(base({ players, winnerIds: ['l'] }))).toBe('Victoire de Léa avec 47 points, 1 de plus que Benny')
  })
  it('rule 4: winner-only template', () => {
    const players = [{ id: 'l', name: 'Léa', total: null }, { id: 'b', name: 'Benny', total: null }]
    expect(buildHighlight(base({ template: 'vainqueur seulement', players, winnerIds: ['l'] }))).toBe('Belle victoire de Léa')
  })
  it('rule 4: several winners with elision', () => {
    const players = [{ id: 'i', name: 'Inès', total: null }, { id: 'm', name: 'Max', total: null }, { id: 'b', name: 'Benny', total: null }]
    expect(buildHighlight(base({ template: 'vainqueur seulement', players, winnerIds: ['i', 'm'] }))).toBe("Belle victoire d’Inès et Max")
  })
  it('rule 4: single player game', () => {
    const players = [{ id: 'l', name: 'Léa', total: 47 }]
    expect(buildHighlight(base({ players, winnerIds: ['l'] }))).toBe('Belle victoire de Léa')
  })
  it('rule 4: winners picked by hand differ from best totals', () => {
    const players = [{ id: 'l', name: 'Léa', total: 47 }, { id: 'b', name: 'Benny', total: 12 }]
    expect(buildHighlight(base({ players, winnerIds: ['b'] }))).toBe('Belle victoire de Benny')
  })
  it('returns null without any winner', () => {
    const players = [{ id: 'l', name: 'Léa', total: null }]
    expect(buildHighlight(base({ players, winnerIds: [] }))).toBeNull()
  })
})

describe('french helpers', () => {
  it('elides de before vowels, accented or not, but not before h', () => {
    expect(['Inès', 'Élodie', 'Yann', 'Hugo', 'Ôscar', 'benny'].map(withDe)).toEqual(["d’Inès", "d’Élodie", "d’Yann", 'de Hugo', "d’Ôscar", 'de benny'])
  })
  it('elides que', () => expect(withQue('Inès')).toBe("qu’Inès"))
  it('pluralises points', () => {
    expect([0, 1, -1, 2, 12].map(points)).toEqual(['0 point', '1 point', '-1 point', '2 points', '12 points'])
  })
  it('joins names', () => {
    expect([joinNames(['X']), joinNames(['X', 'Y']), joinNames(['X', 'Y', 'Z'])]).toEqual(['X', 'X et Y', 'X, Y et Z'])
  })
})
