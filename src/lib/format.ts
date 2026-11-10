import { joinNames, points, withQue } from '../../shared/french'
import type { PartyDTO } from '../../shared/types'

const TZ = 'Europe/Paris'
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function formatLongDate(iso: string): string {
  return cap(new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)))
}

export function formatShortDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${cap(get('weekday'))} ${get('day')} ${get('month')}`
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function winnerTitle(p: PartyDTO): { title: string; subtitle: string } {
  const winners = p.players.filter((x) => x.winner)
  if (winners.length === 0) return { title: 'Pas de vainqueur', subtitle: 'Touche pour choisir' }
  if (winners.length > 1) return { title: `${joinNames(winners.map((w) => w.name))} ex aequo`, subtitle: 'Égalité au sommet' }
  const w = winners[0]!
  const title = `${w.name} gagne`
  if (p.template === 'vainqueur seulement' || w.total === null) return { title, subtitle: '' }
  const second = p.players
    .filter((x): x is typeof x & { total: number } => x.participationId !== w.participationId && x.total !== null)
    .sort((a, b) => b.total - a.total)[0]
  if (!second || second.total > w.total) return { title, subtitle: points(w.total) }
  return { title, subtitle: `${points(w.total)}, ${w.total - second.total} de plus ${withQue(second.name)}` }
}
