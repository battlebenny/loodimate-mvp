import { describe, expect, it } from 'vitest'
import { participationRef, partyRef, slugify } from '../../shared/refs.js'

describe('refs', () => {
  it('slugifies accents and punctuation', () => expect(slugify("Azul : Pavillon d'été")).toBe('azul-pavillon-d-ete'))
  it('builds the party ref with the Paris date', () => {
    expect(partyRef('Azul', new Date('2026-11-04T23:30:00Z'))).toBe('azul-2026-11-05')
    expect(partyRef('Azul', new Date('2026-11-04T10:00:00Z'))).toBe('azul-2026-11-04')
  })
  it('builds the participation ref', () => expect(participationRef('azul-2026-11-04', 'Benny')).toBe('azul-2026-11-04 · Benny'))
})
