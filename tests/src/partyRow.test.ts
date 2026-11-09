import { describe, expect, it } from 'vitest'
import { finishedMeta, ongoingMeta } from '../../src/features/home/PartyRow.js'
import type { PartySummaryDTO } from '../../shared/types.js'

const p = (over: Partial<PartySummaryDTO>): PartySummaryDTO => ({
  id: 'r', status: 'en cours', template: 'scores par manche', rounds: 3, createdAt: '2026-11-07T20:10:00Z', finishedAt: null,
  game: { name: 'Azul', image: null }, playerCount: 4, winnerNames: [], photoCount: 0, firstPhotoThumb: null, ...over,
})

describe('home rows', () => {
  it('shows the round only for round-score parties', () => {
    expect(ongoingMeta(p({}))).toBe('Manche 3 · 4 joueurs · commencée à 21:10')
    expect(ongoingMeta(p({ template: 'vainqueur seulement' }))).toBe('4 joueurs · commencée à 21:10')
  })
  it('describes finished parties', () => {
    expect(finishedMeta(p({ status: 'terminée', finishedAt: '2026-10-31T20:00:00Z', winnerNames: ['Léa'], photoCount: 2 }))).toBe('Sam. 31 oct. · Léa gagne · 2 photos')
    expect(finishedMeta(p({ status: 'terminée', finishedAt: '2026-10-23T20:00:00Z', winnerNames: ['Léa', 'Max'] }))).toBe('Ven. 23 oct. · Léa et Max ex aequo')
  })
})
