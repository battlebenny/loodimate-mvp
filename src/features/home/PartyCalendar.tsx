import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { parisDate } from '../../../shared/refs'
import { withDe } from '../../../shared/french'
import { formatLongDate } from '../../lib/format'
import { PartyRow } from './PartyRow'
import { dayKeyOf, groupByDay, initialMonth, monthForYear, monthGrid, shiftMonth, yearRange, type YearMonth } from './calendar'
import type { PartySummaryDTO } from '../../../shared/types'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const navButton = 'flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-subtle disabled:opacity-30 disabled:hover:bg-transparent'

/**
 * Month view of finished parties: a played day shows its picture. With one party, tapping it opens the souvenir;
 * with several, a badge gives the count and tapping lists that day's parties below.
 */
export function PartyCalendar({ parties }: { parties: PartySummaryDTO[] }) {
  const today = parisDate(new Date())
  const byDay = useMemo(() => groupByDay(parties), [parties])
  const keys = useMemo(() => [...byDay.keys()], [byDay])
  const years = useMemo(() => yearRange(keys, today), [keys, today])

  const [ym, setYm] = useState<YearMonth>(() => initialMonth(keys, today))
  // Only a day with several parties gets picked: a single party opens its souvenir straight away.
  const [picked, setPicked] = useState<string | null>(null)

  const goTo = (next: YearMonth) => {
    setYm(next)
    setPicked(null)
  }

  const first = { year: years.at(-1)!, month: 0 }
  const last = { year: years[0]!, month: 11 }
  const atStart = ym.year === first.year && ym.month === first.month
  const atEnd = ym.year === last.year && ym.month === last.month
  const dayParties = picked ? (byDay.get(picked) ?? []) : []
  const monthCount = keys.filter((k) => k.startsWith(dayKeyOf(ym.year, ym.month, 1).slice(0, 8))).reduce((n, k) => n + byDay.get(k)!.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-line bg-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" className={navButton} onClick={() => goTo(shiftMonth(ym, -1))} disabled={atStart} aria-label="Mois précédent">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-semibold" aria-live="polite">
              {MONTHS[ym.month]}
            </span>
            <label className="relative inline-flex items-center">
              <span className="sr-only">Année</span>
              <select
                value={ym.year}
                onChange={(e) => goTo(monthForYear(keys, ym, Number(e.target.value)))}
                className="cursor-pointer appearance-none rounded-control bg-surface-subtle py-1 pl-2.5 pr-7 font-display text-lg font-semibold text-ink"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 h-4 w-4 text-ink-soft" aria-hidden />
            </label>
          </div>
          <button type="button" className={navButton} onClick={() => goTo(shiftMonth(ym, 1))} disabled={atEnd} aria-label="Mois suivant">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${MONTHS[ym.month]} ${ym.year}`}>
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="pb-1 text-center font-mono text-[11px] text-ink-soft" aria-hidden>
              {d}
            </span>
          ))}
          {monthGrid(ym)
            .flat()
            .map((day, i) => {
              if (day === null) return <span key={i} />
              const key = dayKeyOf(ym.year, ym.month, day)
              const list = byDay.get(key)
              const isToday = key === today
              if (!list) {
                return (
                  <span key={i} className={`flex aspect-square items-center justify-center text-[13px] tabular-nums ${isToday ? 'font-semibold text-accent-text' : 'text-ink-soft/70'}`}>
                    {day}
                  </span>
                )
              }
              const lead = list[0]!
              const image = lead.firstPhotoThumb ?? lead.game.image
              const selected = key === picked
              const cell = `relative block aspect-square overflow-hidden rounded-[10px] bg-accent-soft transition-transform active:scale-95 ${selected ? 'ring-2 ring-accent-strong ring-offset-2 ring-offset-surface' : ''}`
              const content = (
                <>
                  {image && <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                  <span className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" aria-hidden />
                  <span className="absolute left-1 top-0.5 text-[12px] font-semibold tabular-nums text-white drop-shadow">{day}</span>
                  {list.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-strong px-1 font-mono text-[11px] font-semibold leading-none text-white shadow-sm ring-1 ring-white/70">
                      {list.length}
                    </span>
                  )}
                </>
              )
              const date = formatLongDate(lead.finishedAt ?? lead.createdAt)
              if (list.length === 1) {
                return (
                  <Link key={i} to={`/partie/${lead.id}`} className={cell} aria-label={`${date} : souvenir ${withDe(lead.game.name)}`}>
                    {content}
                  </Link>
                )
              }
              return (
                <button key={i} type="button" onClick={() => setPicked(selected ? null : key)} aria-pressed={selected} aria-label={`${date} : ${list.length} parties`} className={cell}>
                  {content}
                </button>
              )
            })}
        </div>
      </div>

      {dayParties.length > 0 ? (
        <section className="flex flex-col gap-2.5" aria-live="polite">
          <h3 className="m-0 section-label">{formatLongDate(dayParties[0]!.finishedAt ?? dayParties[0]!.createdAt)}</h3>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {dayParties.map((p) => (
              <PartyRow key={p.id} party={p} />
            ))}
          </ul>
        </section>
      ) : (
        <p className="m-0 text-center text-ink-soft">{monthCount === 0 ? 'Aucune partie ce mois-ci.' : 'Touche une image pour revoir le souvenir.'}</p>
      )}
    </div>
  )
}
