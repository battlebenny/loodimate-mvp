import { describe, expect, it } from 'vitest'
import { newShareToken } from '../../shared/token.js'

describe('newShareToken', () => {
  it('is 12 alphanumeric chars', () => expect(newShareToken()).toMatch(/^[A-Za-z0-9]{12}$/))
  it('is unique over 1000 draws', () => {
    const set = new Set(Array.from({ length: 1000 }, newShareToken))
    expect(set.size).toBe(1000)
  })
})
