import { describe, expect, it } from 'vitest'
import { groupByDay, initialMonth, latestDayIn, monthForYear, monthGrid, shiftMonth, yearRange } from '../../src/features/home/calendar.js'
import type { PartySummaryDTO } from '../../shared/types.js'

const party = (id: string, finishedAt: string): PartySummaryDTO => ({
  id, status: 'terminée', template: 'vainqueur seulement', rounds: 1, createdAt: finishedAt, finishedAt,
  game: { name: 'Azul', image: null }, playerCount: 2, winnerNames: [], photoCount: 0, firstPhotoThumb: null, highlight: null, ranking: [],
})

describe('groupByDay', () => {
  it('groups by Paris day, keeping order', () => {
    // 23:30 UTC on Nov 4 is already Nov 5 in Paris.
    const map = groupByDay([party('a', '2026-11-04T23:30:00Z'), party('b', '2026-11-05T10:00:00Z'), party('c', '2026-11-04T20:00:00Z')])
    expect([...map.keys()]).toEqual(['2026-11-05', '2026-11-04'])
    expect(map.get('2026-11-05')!.map((p) => p.id)).toEqual(['a', 'b'])
  })
})

describe('monthGrid', () => {
  it('starts on Monday and pads', () => {
    // November 2026 starts on a Sunday.
    const weeks = monthGrid({ year: 2026, month: 10 })
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1])
    expect(weeks.flat().filter(Boolean)).toHaveLength(30)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })
})

describe('navigation', () => {
  const keys = ['2025-03-12', '2026-10-02', '2026-11-04']
  it('opens on the latest played month', () => expect(initialMonth(keys, '2026-11-16')).toEqual({ year: 2026, month: 10 }))
  it('falls back to today', () => expect(initialMonth([], '2026-11-16')).toEqual({ year: 2026, month: 10 }))
  it('shifts across years', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth({ year: 2025, month: 11 }, 1)).toEqual({ year: 2026, month: 0 })
  })
  it('lists years newest first', () => expect(yearRange(keys, '2026-11-16')).toEqual([2026, 2025]))
  it('finds the latest day in a month', () => {
    expect(latestDayIn(keys, { year: 2026, month: 10 })).toBe('2026-11-04')
    expect(latestDayIn(keys, { year: 2026, month: 0 })).toBeNull()
  })
  it('year change keeps or jumps the month', () => {
    expect(monthForYear(keys, { year: 2026, month: 10 }, 2025)).toEqual({ year: 2025, month: 2 })
    expect(monthForYear(['2025-11-01', ...keys], { year: 2026, month: 10 }, 2025)).toEqual({ year: 2025, month: 10 })
    expect(monthForYear(keys, { year: 2026, month: 10 }, 2024)).toEqual({ year: 2024, month: 10 })
  })
})
