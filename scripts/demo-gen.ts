// Generates the demo dataset (docs/demo.md) from the app's own rules. Run: npx vite-node scripts/demo-gen.ts
// Output: scripts/demo-data.json — rows per table with links expressed as "@key" to be resolved at insert time.
import { writeFileSync } from 'node:fs'
import { F } from '../server/core/airtable/schema.js'
import { buildHighlight } from '../shared/highlight.js'
import { participationRef, partyRef } from '../shared/refs.js'
import { computeTotal, preselectWinners } from '../shared/scoring.js'
import type { Template } from '../shared/types.js'

let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const token = () => Array.from({ length: 12 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[Math.floor(rand() * 57)]).join('')

// Existing fictitious players of the base are reused (record ids); new demo players get demo- devices.
const players: Record<string, { name: string; id?: string; device?: string; onboarded?: string }> = {
  benny: { name: 'Benny', id: 'rec2rfHvNP12X042F', device: 'demo-jedha' },
  ines: { name: 'Inès', id: 'recBwDwYbSNDi6MKp', device: 'dev-b84e0d17' },
  lea: { name: 'Léa', id: 'rectNAr8oBJFjjqYO' },
  hugo: { name: 'Hugo', id: 'recjBiCcrI7kXbbCv' },
  thomas: { name: 'Thomas', id: 'rec2Jksu18kfUlqMz' },
  max: { name: 'Max', device: 'demo-max', onboarded: '2026-10-08' },
  camille: { name: 'Camille', device: 'demo-camille', onboarded: '2026-10-11' },
  jade: { name: 'Jade', device: 'demo-jade', onboarded: '2026-10-20' },
  noe: { name: 'Noé' },
}
const games: Record<string, { name: string; id?: string; bggId: number; image: string; template: Template }> = {
  azul: { name: 'Azul', id: 'recDbBFmKsiR2bzLc', bggId: 230802, template: 'scores par manche', image: 'https://cf.geekdo-images.com/aPSHJO0d0XOpQR5X-wJonw__original/img/AkbtYVc6xXJF3c9EUrakklcclKw=/0x0/filters:format(png)/pic6973671.png' },
  wonders: { name: '7 Wonders', id: 'recOqrRRWDrfuRogP', bggId: 68448, template: 'scores par manche', image: 'https://cf.geekdo-images.com/35h9Za_JvMMMtx_92kT0Jg__original/img/jt70jJDZ1y1FWJs4ZQf5FI8APVY=/0x0/filters:format(jpeg)/pic7149798.jpg' },
  avalon: { name: 'The Resistance: Avalon', id: 'reczWnjyIUnpolWgI', bggId: 128882, template: 'vainqueur seulement', image: '' },
  skull: { name: 'Skull King', bggId: 150145, template: 'scores par manche', image: 'https://cf.geekdo-images.com/1qvA21HdRaPYwrn4tGDNaQ__original/img/Vn6PK_Ue5TX14oQ5uau4XICHEJU=/0x0/filters:format(jpeg)/pic8689185.jpg' },
  cascadia: { name: 'Cascadia', bggId: 295947, template: 'scores par manche', image: 'https://cf.geekdo-images.com/MjeJZfulbsM1DSV3DrGJYA__original/img/B374C04Eip7fmQBGJzgiOTp-jyQ=/0x0/filters:format(jpeg)/pic5100691.jpg' },
  cluedo: { name: 'Cluedo', bggId: 374342, template: 'vainqueur seulement', image: 'https://cf.geekdo-images.com/qy5Ke1VeVuHc4RsNzqoGLQ__original/img/bNzWuiIfTYlCHO0sEQBEIswtqKc=/0x0/filters:format(jpeg)/pic7398166.jpg' },
}

type Def = { key: string; game: string; creator: string; day: string; start: string; minutes: number; rows: [string, (number | null)[] | null][]; winners?: string[]; ongoing?: boolean; secs: number; shared?: number }
// rows: [player, round scores] (null for winner-only games); winners are given only for winner-only games.
const defs: Def[] = [
  { key: 'p01', game: 'azul', creator: 'benny', day: '2026-10-06', start: '20:45', minutes: 40, secs: 52, shared: 2, rows: [['benny', [52]], ['ines', [48]], ['lea', [39]], ['max', [44]]] },
  { key: 'p02', game: 'wonders', creator: 'benny', day: '2026-10-09', start: '21:00', minutes: 45, secs: 41, shared: 1, rows: [['benny', [55]], ['ines', [58]], ['max', [58]], ['camille', [47]]] },
  { key: 'p03', game: 'cluedo', creator: 'max', day: '2026-10-10', start: '20:30', minutes: 50, secs: 33, rows: [['max', null], ['benny', null], ['camille', null], ['lea', null]], winners: ['camille'] },
  { key: 'p04', game: 'skull', creator: 'benny', day: '2026-10-13', start: '21:10', minutes: 55, secs: 64, shared: 3, rows: [['benny', [40, -20, 60, 30, 90]], ['hugo', [20, 30, -10, -40, 70]], ['thomas', [-10, 50, 40, 60, -30]], ['noe', [30, -20, 20, 0, 50]]] },
  { key: 'p05', game: 'azul', creator: 'benny', day: '2026-10-16', start: '20:50', minutes: 35, secs: 38, shared: 2, rows: [['benny', [61]], ['ines', [57]], ['max', [49]]] },
  { key: 'p06', game: 'cascadia', creator: 'camille', day: '2026-10-18', start: '15:00', minutes: 45, secs: 47, shared: 2, rows: [['camille', [87]], ['benny', [87]], ['lea', [79]]] },
  { key: 'p07', game: 'avalon', creator: 'benny', day: '2026-10-18', start: '21:30', minutes: 30, secs: 29, rows: [['benny', null], ['ines', null], ['lea', null], ['max', null], ['camille', null]], winners: ['ines', 'lea', 'camille'] },
  { key: 'p08', game: 'wonders', creator: 'jade', day: '2026-10-21', start: '20:40', minutes: 50, secs: 58, shared: 1, rows: [['jade', [62]], ['benny', [57]], ['hugo', [51]], ['thomas', [44]]] },
  { key: 'p09', game: 'skull', creator: 'benny', day: '2026-10-24', start: '21:00', minutes: 50, secs: 44, shared: 2, rows: [['benny', [60, 30, -30, 80, 90]], ['jade', [20, 40, 50, -20, 40]], ['hugo', [-20, 20, 60, 40, -10]]] },
  { key: 'p10', game: 'azul', creator: 'benny', day: '2026-10-27', start: '20:45', minutes: 40, secs: 36, shared: 3, rows: [['benny', [73]], ['ines', [65]], ['lea', [58]], ['max', [61]]] },
  // Same game recorded again by Max a few minutes later: shown once in stats (display dedup).
  { key: 'p11', game: 'azul', creator: 'max', day: '2026-10-27', start: '20:47', minutes: 44, secs: 49, rows: [['max', [61]], ['benny', [73]], ['ines', [65]], ['lea', [58]]] },
  { key: 'p12', game: 'cluedo', creator: 'benny', day: '2026-10-30', start: '20:30', minutes: 45, secs: 27, shared: 1, rows: [['benny', null], ['jade', null], ['noe', null]], winners: ['benny'] },
  { key: 'p13', game: 'cascadia', creator: 'benny', day: '2026-10-31', start: '16:00', minutes: 40, secs: 42, shared: 2, rows: [['benny', [92]], ['camille', [85]], ['lea', [81]], ['ines', [77]]] },
  { key: 'p14', game: 'wonders', creator: 'ines', day: '2026-11-07', start: '20:30', minutes: 50, secs: 71, rows: [['ines', [63]], ['benny', [57]], ['max', [53]]] },
  { key: 'p15', game: 'skull', creator: 'jade', day: '2026-11-03', start: '21:00', minutes: 50, secs: 39, shared: 1, rows: [['jade', [70, -10, 40, 60, 80]], ['benny', [50, 20, -40, 30, 60]], ['thomas', [30, 40, 30, -20, 20]], ['noe', [-10, 30, 20, 50, -30]]] },
  { key: 'p16', game: 'azul', creator: 'camille', day: '2026-11-05', start: '20:45', minutes: 35, secs: 45, shared: 2, rows: [['camille', [66]], ['benny', [59]], ['max', [62]]] },
  { key: 'p17', game: 'cascadia', creator: 'benny', day: '2026-11-07', start: '15:30', minutes: 45, secs: 33, shared: 2, rows: [['benny', [88]], ['ines', [85]], ['camille', [84]]] },
  { key: 'p18', game: 'avalon', creator: 'max', day: '2026-11-07', start: '21:30', minutes: 30, secs: 31, rows: [['max', null], ['benny', null], ['ines', null], ['camille', null], ['lea', null]], winners: ['benny', 'max'] },
  // Ongoing parties (P3 demo).
  { key: 'p19', game: 'skull', creator: 'benny', day: '2026-11-08', start: '20:40', minutes: 0, secs: 40, ongoing: true, rows: [['benny', [40, 20, null]], ['hugo', [30, -10, null]], ['jade', [-20, 60, null]]] },
  { key: 'p20', game: 'cascadia', creator: 'camille', day: '2026-11-08', start: '16:00', minutes: 0, secs: 37, ongoing: true, rows: [['camille', [null]], ['ines', [null]], ['lea', [null]]] },
]

// Late October / November in Paris is CET (+01:00) except before 2026-10-25 (CEST, +02:00).
const paris = (day: string, hm: string) => new Date(`${day}T${hm}:00${day < '2026-10-25' ? '+02:00' : '+01:00'}`)
type Row = { key?: string; fields: Record<string, unknown>; [link: string]: unknown }
const out = { players: [] as Row[], games: [] as Row[], parties: [] as Row[], participations: [] as Row[], events: [] as Row[], updates: [] as Row[] }

for (const [key, p] of Object.entries(players)) {
  if (!p.id) out.players.push({ key, fields: { [F.players.name]: p.name, ...(p.device ? { [F.players.device]: p.device, [F.players.onboardedAt]: p.onboarded } : {}) } })
}
// Benny gets the demo device appended (restored by the purge script).
out.updates.push({ table: 'players', id: players.benny!.id, fields: { [F.players.device]: 'dev-7f3a91c2,demo-jedha' }, restore: { [F.players.device]: 'dev-7f3a91c2' } })
for (const [key, g] of Object.entries(games)) {
  if (g.id) {
    if (g.image) out.updates.push({ table: 'games', id: g.id, fields: { [F.games.image]: g.image }, restore: { [F.games.image]: null } })
  } else out.games.push({ key, fields: { [F.games.name]: g.name, [F.games.bggId]: g.bggId, [F.games.image]: g.image, [F.games.template]: g.template } })
}
const ref = (k: string, o: { id?: string }) => o.id ?? `@${k}`

let ev = 0
const event = (action: string, origin: 'app' | 'lien', visitor: string, at: Date, party?: string, player?: string) =>
  out.events.push({ fields: { [F.events.id]: `demo-ev-${String(++ev).padStart(3, '0')}`, [F.events.visitorId]: visitor, [F.events.action]: action, [F.events.origin]: origin, [F.events.date]: at.toISOString() }, party, player })

for (const [k, p] of Object.entries(players)) if (p.device?.startsWith('demo-') && k !== 'benny') event('appareil_cree', 'app', p.device, paris(p.onboarded!, '20:00'), undefined, `@${k}`)
event('appareil_cree', 'app', 'demo-jedha', paris('2026-10-06', '20:30'), undefined, players.benny!.id)

const history: Record<string, number[]> = {} // "player|game" -> totals of previous finished parties
for (const d of defs) {
  const g = games[d.game]!
  const created = paris(d.day, d.start)
  const finished = new Date(created.getTime() + d.minutes * 60000)
  const rounds = d.rows[0]![1]?.length ?? 1
  const rows = d.rows.map(([pk, sc]) => ({ pk, id: `${d.key}-${pk}`, name: players[pk]!.name, scores: sc ?? [], total: sc ? computeTotal(sc) : null }))
  const winnerIds = d.ongoing ? [] : g.template === 'vainqueur seulement' ? (d.winners ?? []).map((w) => `${d.key}-${w}`) : preselectWinners(rows)
  let highlight: string | null = null
  if (!d.ongoing) {
    const single = winnerIds.length === 1 ? rows.find((r) => r.id === winnerIds[0])! : null
    const prev = single && single.total !== null ? history[`${single.pk}|${d.game}`] : undefined
    // The duplicate recorded by Max ignores its twin (server rule), so it gets the same highlight.
    if (d.key === 'p11') highlight = String(out.parties.find((x) => x.key === 'p10')!.fields[F.parties.highlight])
    else highlight = buildHighlight({ template: g.template, gameName: g.name, players: rows.map((r) => ({ id: r.id, name: r.name, total: r.total })), winnerIds, previousBestOfWinner: prev?.length ? Math.max(...prev) : null })
    if (d.key !== 'p11') for (const r of rows) if (r.total !== null) (history[`${r.pk}|${d.game}`] ??= []).push(r.total)
  }
  const pref = partyRef(g.name, created)
  out.parties.push({
    key: d.key,
    game: ref(d.game, g),
    creator: ref(d.creator, players[d.creator]!),
    fields: {
      [F.parties.ref]: pref,
      [F.parties.status]: d.ongoing ? 'en cours' : 'terminée',
      [F.parties.createdAt]: created.toISOString(),
      ...(d.ongoing ? {} : { [F.parties.finishedAt]: finished.toISOString() }),
      [F.parties.template]: g.template,
      [F.parties.rounds]: rounds,
      [F.parties.creationSeconds]: d.secs,
      [F.parties.shareToken]: token(),
      ...(highlight ? { [F.parties.highlight]: highlight } : {}),
    },
  })
  for (const r of rows) {
    out.participations.push({
      party: `@${d.key}`,
      player: ref(r.pk, players[r.pk]!),
      fields: {
        [F.participations.ref]: participationRef(pref, r.name),
        [F.participations.scores]: g.template === 'vainqueur seulement' ? '' : JSON.stringify(r.scores),
        ...(r.total !== null ? { [F.participations.total]: r.total } : {}),
        [F.participations.winner]: winnerIds.includes(r.id),
      },
    })
  }
  const dev = players[d.creator]!.device!
  const creator = ref(d.creator, players[d.creator]!)
  event('creation_debut', 'app', dev, new Date(created.getTime() - d.secs * 1000), undefined, creator)
  event('partie_creee', 'app', dev, created, `@${d.key}`, creator)
  if (d.ongoing) continue
  event('partie_terminee', 'app', dev, finished, `@${d.key}`, creator)
  if (d.creator === 'benny' && rand() < 0.5) event('souvenir_ouvert', 'app', dev, new Date(finished.getTime() + 2 * 86400000), `@${d.key}`, creator)
  if (!d.shared) continue
  event('lien_partage', 'app', dev, new Date(finished.getTime() + 4 * 60000), `@${d.key}`, creator)
  for (let v = 0; v < d.shared; v++) {
    const visitor = `demo-visitor-${d.key}-${v}`
    const first = new Date(finished.getTime() + (20 + v * 35) * 60000)
    event('souvenir_ouvert', 'lien', visitor, first, `@${d.key}`)
    // About half the visitors come back on their own more than 48 h later (H2).
    if (rand() < 0.55) event('souvenir_ouvert', 'lien', visitor, new Date(first.getTime() + (50 + rand() * 100) * 3600000), `@${d.key}`)
    if (rand() < 0.2) event('cta_clic', 'lien', visitor, new Date(first.getTime() + 60000), `@${d.key}`)
  }
}
for (const [k, n] of [['benny', 5], ['max', 2], ['camille', 2], ['jade', 1]] as const) {
  for (let i = 0; i < n; i++) event('stats_consultees', 'app', players[k]!.device!, paris(`2026-11-0${1 + i}`, '22:15'), undefined, ref(k, players[k]!))
}
writeFileSync(new URL('./demo-data.json', import.meta.url), JSON.stringify(out, null, 1))
console.log({ players: out.players.length, games: out.games.length, parties: out.parties.length, participations: out.participations.length, events: out.events.length, updates: out.updates.length })
