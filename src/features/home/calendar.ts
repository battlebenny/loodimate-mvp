import { parisDate } from '../../../shared/refs'
import type { PartySummaryDTO } from '../../../shared/types'

/** A calendar month, month 0-based like Date. */
export type YearMonth = { year: number; month: number }

const pad = (n: number) => String(n).padStart(2, '0')

export const dayKeyOf = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

/** Day a finished party belongs to (Europe/Paris, like party refs). */
export const partyDay = (p: PartySummaryDTO) => parisDate(new Date(p.finishedAt ?? p.createdAt))

const ymOf = (key: string): YearMonth => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1 })

/** Parties grouped by day, keeping the input order inside each day. */
export function groupByDay(parties: PartySummaryDTO[]): Map<string, PartySummaryDTO[]> {
  const map = new Map<string, PartySummaryDTO[]>()
  for (const p of parties) {
    const key = partyDay(p)
    const list = map.get(key)
    if (list) list.push(p)
    else map.set(key, [p])
  }
  return map
}

/** Weeks of the month, Monday first; null pads the days outside the month. */
export function monthGrid({ year, month }: YearMonth): (number | null)[][] {
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
}

/** Years offered by the selector: from the first party to this year (or the last party, whichever is later). */
export function yearRange(dayKeys: string[], today: string): number[] {
  const years = [...dayKeys, today].map((k) => Number(k.slice(0, 4)))
  const min = Math.min(...years)
  const max = Math.max(...years)
  return Array.from({ length: max - min + 1 }, (_, i) => max - i)
}

/** Month the calendar opens on: the latest played day's, else today's. */
export function initialMonth(dayKeys: string[], today: string): YearMonth {
  const latest = [...dayKeys].sort().at(-1)
  return ymOf(latest ?? today)
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const m = year * 12 + month + delta
  return { year: Math.floor(m / 12), month: ((m % 12) + 12) % 12 }
}

/** Latest played day inside the given month, if any. */
export function latestDayIn(dayKeys: string[], { year, month }: YearMonth): string | null {
  const prefix = `${year}-${pad(month + 1)}-`
  return dayKeys.filter((k) => k.startsWith(prefix)).sort().at(-1) ?? null
}

/**
 * Picking a year keeps the month when it was played that year; otherwise it jumps to that year's latest played month,
 * so the selector lands on something to look at.
 */
export function monthForYear(dayKeys: string[], current: YearMonth, year: number): YearMonth {
  const target = { year, month: current.month }
  if (latestDayIn(dayKeys, target)) return target
  const latest = dayKeys.filter((k) => k.startsWith(`${year}-`)).sort().at(-1)
  return latest ? ymOf(latest) : target
}
