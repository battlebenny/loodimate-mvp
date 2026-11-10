import { describe, expect, it } from 'vitest'
import { computeTotal, isEmptyResult, preselectWinners } from '../../shared/scoring.js'

describe('computeTotal', () => {
  it('sums rounds', () => expect(computeTotal([8, 12, 10])).toBe(30))
  it('ignores empty cells and handles negatives', () => expect(computeTotal([8, null, -3])).toBe(5))
  it('is null when every cell is empty', () => expect(computeTotal([null, null])).toBeNull())
  it('is null for no rounds', () => expect(computeTotal([])).toBeNull())
})

describe('preselectWinners', () => {
  it('selects every player tied at the best total', () => {
    expect(preselectWinners([{ id: 'a', total: 30 }, { id: 'b', total: 30 }, { id: 'c', total: 12 }])).toEqual(['a', 'b'])
  })
  it('handles all-negative totals', () => {
    expect(preselectWinners([{ id: 'a', total: -5 }, { id: 'b', total: -2 }])).toEqual(['b'])
  })
  it('selects nobody when every total is empty', () => {
    expect(preselectWinners([{ id: 'a', total: null }, { id: 'b', total: null }])).toEqual([])
  })
  it('selects nobody when totals are only zeros and empties', () => {
    expect(preselectWinners([{ id: 'a', total: 0 }, { id: 'b', total: null }, { id: 'c', total: 0 }])).toEqual([])
  })
  it('ignores empty totals when someone scored', () => {
    expect(preselectWinners([{ id: 'a', total: null }, { id: 'b', total: 4 }])).toEqual(['b'])
  })
})

describe('isEmptyResult', () => {
  it('is true for a score sheet with only empty or zero totals and no winner', () => {
    expect(isEmptyResult('scores par manche', [null, 0, null], [])).toBe(true)
  })
  it('is false as soon as a total is non zero', () => {
    expect(isEmptyResult('scores par manche', [null, 12], [])).toBe(false)
  })
  it('is true for winner-only without winner', () => {
    expect(isEmptyResult('vainqueur seulement', [null, null], [])).toBe(true)
  })
  it('is false for winner-only with a winner', () => {
    expect(isEmptyResult('vainqueur seulement', [null, null], ['a'])).toBe(false)
  })
  it('is false when a winner was ticked by hand on a sheet without scores', () => {
    expect(isEmptyResult('scores par manche', [null, null], ['a'])).toBe(false)
  })
})
