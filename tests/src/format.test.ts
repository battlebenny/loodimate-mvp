import { describe, expect, it } from 'vitest'
import { formatLongDate, formatShortDate, formatTime, winnerTitle } from '../../src/lib/format.js'
import type { PartyDTO } from '../../shared/types.js'

const party = (template: PartyDTO['template'], players: [string, number | null, boolean][]): PartyDTO => ({
  id: 'p', ref: 'r', status: 'terminée', template, rounds: 1, createdAt: '', finishedAt: '', creatorName: 'Benny',
  game: { id: 'g', name: 'Azul', image: null }, highlight: null, photos: [], canEdit: true,
  players: players.map(([name, total, winner], i) => ({ participationId: `pp${i}`, playerId: `pl${i}`, name, scores: [total], total, winner })),
})

describe('winnerTitle', () => {
  it('single winner with gap', () => {
    expect(winnerTitle(party('scores par manche', [['Benny', 41, false], ['Léa', 47, true]]))).toEqual({ title: 'Léa gagne', subtitle: '47 points, 6 de plus que Benny' })
  })
  it('elides que', () => {
    expect(winnerTitle(party('scores par manche', [['Inès', 41, false], ['Léa', 47, true]])).subtitle).toBe("47 points, 6 de plus qu'Inès")
  })
  it('tie', () => {
    expect(winnerTitle(party('scores par manche', [['Léa', 30, true], ['Max', 30, true]]))).toEqual({ title: 'Léa et Max ex aequo', subtitle: 'Égalité au sommet' })
  })
  it('no winner', () => {
    expect(winnerTitle(party('scores par manche', [['Léa', null, false]]))).toEqual({ title: 'Pas de vainqueur', subtitle: 'Touche pour choisir' })
  })
  it('winner-only has no subtitle', () => {
    expect(winnerTitle(party('vainqueur seulement', [['Léa', null, true], ['Max', null, false]]))).toEqual({ title: 'Léa gagne', subtitle: '' })
  })
  it('winner picked by hand below someone else shows only the points', () => {
    expect(winnerTitle(party('scores par manche', [['Léa', 47, false], ['Max', 12, true]])).subtitle).toBe('12 points')
  })
})

describe('dates (Europe/Paris)', () => {
  it('long date', () => expect(formatLongDate('2026-11-07T20:00:00Z')).toBe('Samedi 7 novembre 2026'))
  it('long date crosses midnight in Paris', () => expect(formatLongDate('2026-11-07T23:30:00Z')).toBe('Dimanche 8 novembre 2026'))
  it('short date', () => expect(formatShortDate('2026-10-31T20:00:00Z')).toBe('Sam. 31 oct.'))
  it('time', () => expect(formatTime('2026-11-07T20:10:00Z')).toBe('21:10'))
})
