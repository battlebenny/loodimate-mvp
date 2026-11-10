import type { SheetInput } from '../../shared/types'

// The party being scored lives in localStorage first: every keystroke is saved without network.
const key = (partyId: string) => `mate.draft.${partyId}`

export function loadDraft(partyId: string): SheetInput | null {
  try {
    const raw = localStorage.getItem(key(partyId))
    return raw ? (JSON.parse(raw) as SheetInput) : null
  } catch {
    return null
  }
}

export function saveDraft(partyId: string, s: SheetInput): void {
  try {
    localStorage.setItem(key(partyId), JSON.stringify(s))
  } catch {
    /* storage full or unavailable: the server copy is synced at key moments */
  }
}

export function clearDraft(partyId: string): void {
  try {
    localStorage.removeItem(key(partyId))
  } catch {
    /* ignore */
  }
}

export function resizeRounds(s: SheetInput, rounds: number): SheetInput {
  const n = Math.max(1, rounds)
  const scores = Object.fromEntries(Object.entries(s.scores).map(([id, row]) => [id, Array.from({ length: n }, (_, i) => row[i] ?? null)]))
  return { ...s, rounds: n, scores }
}
