import { describe, expect, it } from 'vitest'
import { normalizeName, sameName } from '../../shared/names.js'

describe('names', () => {
  it('compares trimmed and case-insensitive', () => expect(sameName(' thomas ', 'Thomas')).toBe(true))
  it('keeps accents significant', () => expect(sameName('Ines', 'Inès')).toBe(false))
  it('normalizes spaces', () => expect(normalizeName('  Thomas   B. ')).toBe('Thomas B.'))
})
