import { describe, expect, it } from 'vitest'
import { computeStats, findDuplicates, type FinishedParty } from '../../shared/stats.js'

let n = 0
const T0 = Date.parse('2026-11-01T20:00:00Z')
const party = (game: string, minutes: number, players: [string, number | null, boolean][], template: FinishedParty['template'] = 'scores par manche'): FinishedParty => ({
  id: `p${++n}`,
  gameId: game,
  gameName: game,
  template,
  finishedAt: new Date(T0 + minutes * 60000).toISOString(),
  players: players.map(([playerId, total, winner]) => ({ playerId, name: playerId, total, winner })),
})

describe('findDuplicates', () => {
  it('drops the later twin finished 12 minutes apart', () => {
    const a = party('azul', 0, [['me', 40, true], ['lea', 30, false]])
    const b = party('azul', 12, [['lea', 30, false], ['me', 40, true]])
    expect([...findDuplicates([b, a])]).toEqual([b.id])
  })
  it('keeps both at 31 minutes', () => {
    const a = party('azul', 0, [['me', 40, true], ['lea', 30, false]])
    const b = party('azul', 31, [['me', 40, true], ['lea', 30, false]])
    expect(findDuplicates([a, b]).size).toBe(0)
  })
  it('keeps both when totals differ', () => {
    const a = party('azul', 0, [['me', 40, true], ['lea', 30, false]])
    const b = party('azul', 5, [['me', 41, true], ['lea', 30, false]])
    expect(findDuplicates([a, b]).size).toBe(0)
  })
  it('keeps both when players or game differ', () => {
    const a = party('azul', 0, [['me', 40, true], ['lea', 30, false]])
    const b = party('azul', 5, [['me', 40, true], ['max', 30, false]])
    const c = party('cascadia', 5, [['me', 40, true], ['lea', 30, false]])
    expect(findDuplicates([a, b, c]).size).toBe(0)
  })
  it('merges winner-only parties with the same winner (accepted edge case)', () => {
    const a = party('cardia', 0, [['me', null, true], ['lea', null, false]], 'vainqueur seulement')
    const b = party('cardia', 10, [['me', null, true], ['lea', null, false]], 'vainqueur seulement')
    expect(findDuplicates([a, b]).size).toBe(1)
  })
})

describe('computeStats', () => {
  it('counts parties, wins and an integer win rate', () => {
    const parties = Array.from({ length: 12 }, (_, i) => party('azul', i * 600, [['me', 10 + i, i < 5], ['lea', 50, i >= 5]]))
    const s = computeStats('me', parties)
    expect([s.parties, s.wins, s.winRate]).toEqual([12, 5, 42])
  })
  it('computes per-game record, rounded average and minimum of my totals, sorted by parties', () => {
    const parties = [
      party('azul', 0, [['me', 58, true], ['lea', 40, false]]),
      party('azul', 600, [['me', 31, false], ['lea', 45, true]]),
      party('azul', 1200, [['me', 44, true], ['lea', 20, false]]),
      party('cluedo', 1800, [['me', null, false], ['lea', null, true]], 'vainqueur seulement'),
    ]
    const s = computeStats('me', parties)
    expect(s.byGame[0]).toEqual({ gameId: 'azul', name: 'azul', parties: 3, wins: 2, best: 58, avg: 44, min: 31, hasScores: true })
    expect(s.byGame[1]).toEqual({ gameId: 'cluedo', name: 'cluedo', parties: 1, wins: 0, best: null, avg: null, min: null, hasScores: false })
  })
  it('counts wins of every player present, most wins first, flagging me', () => {
    const parties = [
      party('azul', 0, [['me', 5, true], ['lea', 1, false]]),
      party('azul', 600, [['me', 1, false], ['lea', 5, true]]),
      party('azul', 1200, [['me', 1, false], ['lea', 5, true], ['max', 0, false]]),
    ]
    expect(computeStats('me', parties).winsByPlayer).toEqual([
      { name: 'lea', wins: 2, isMe: false },
      { name: 'me', wins: 1, isMe: true },
      { name: 'max', wins: 0, isMe: false },
    ])
  })
  it('ignores duplicates and empty parties', () => {
    const a = party('azul', 0, [['me', 40, true], ['lea', 30, false]])
    const twin = party('azul', 3, [['me', 40, true], ['lea', 30, false]])
    const empty = party('azul', 2000, [['me', null, false], ['lea', 0, false]])
    expect(computeStats('me', [a, twin, empty]).parties).toBe(1)
  })
  it('returns zeros without parties', () => {
    expect(computeStats('me', [])).toEqual({ parties: 0, wins: 0, winRate: 0, byGame: [], winsByPlayer: [] })
  })
})
