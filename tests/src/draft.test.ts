import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, loadDraft, resizeRounds, saveDraft } from '../../src/lib/draft.js'
import type { SheetInput } from '../../shared/types.js'

const store: Record<string, string> = {}
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => (store[k] = v),
    removeItem: (k: string) => delete store[k],
  })
})

const s: SheetInput = { template: 'scores par manche', rounds: 3, scores: { a: [1, null, -2], b: [4, 5, 6] }, winners: [] }

describe('draft', () => {
  it('round-trips through localStorage and can be cleared', () => {
    saveDraft('recP', s)
    expect(loadDraft('recP')).toEqual(s)
    clearDraft('recP')
    expect(loadDraft('recP')).toBeNull()
  })
  it('ignores corrupted drafts', () => {
    store['mate.draft.recP'] = '{oops'
    expect(loadDraft('recP')).toBeNull()
  })
})

describe('resizeRounds', () => {
  it('truncates when removing a round', () => {
    expect(resizeRounds(s, 2).scores).toEqual({ a: [1, null], b: [4, 5] })
  })
  it('pads with null when adding a round', () => {
    const out = resizeRounds({ ...s, rounds: 2, scores: { a: [1, 2], b: [3, 4] } }, 3)
    expect(out).toMatchObject({ rounds: 3, scores: { a: [1, 2, null], b: [3, 4, null] } })
  })
  it('never goes below one round', () => expect(resizeRounds(s, 0).rounds).toBe(1))
})
