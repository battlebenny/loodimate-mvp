// Same-day demo parties for the home calendar (added 2026-11-16, docs/demo.md). Run: npx vite-node scripts/demo-sameday-gen.ts
// Prints Airtable rows; links are record ids of the demo dataset. Purged with the rest via scripts/demo-manifest.json.
import { F } from '../server/core/airtable/schema.js'
import { buildHighlight } from '../shared/highlight.js'
import { participationRef, partyRef } from '../shared/refs.js'
import { computeTotal, preselectWinners } from '../shared/scoring.js'
import { randomBytes } from 'node:crypto'

const P = { benny: ['Benny', 'rec2rfHvNP12X042F'], ines: ['Inès', 'recBwDwYbSNDi6MKp'], lea: ['Léa', 'rectNAr8oBJFjjqYO'], hugo: ['Hugo', 'recjBiCcrI7kXbbCv'], max: ['Max', 'recp30RqC31I2Oe2h'], camille: ['Camille', 'receOnxwPnUBgNGvO'], jade: ['Jade', 'recEfxOVkUVBxQbjm'] } as const
const G = { azul: ['Azul', 'recDbBFmKsiR2bzLc'], skull: ['Skull King', 'rec8BmHSlP57M4nci'], wonders: ['7 Wonders', 'recOqrRRWDrfuRogP'], cascadia: ['Cascadia', 'rectkD8S7uZoax51j'] } as const
type Def = { game: keyof typeof G; at: string; minutes: number; secs: number; prevBest: number | null; rows: [keyof typeof P, number[]][] }
const defs: Def[] = [
  { game: 'azul', at: '2026-11-07T17:45:00+01:00', minutes: 35, secs: 34, prevBest: 73, rows: [['benny', [68]], ['max', [64]], ['camille', [59]]] },
  { game: 'skull', at: '2026-11-07T22:15:00+01:00', minutes: 50, secs: 46, prevBest: 90, rows: [['hugo', [40, -10, 30, 20, 30]], ['benny', [20, 30, -20, 40, 10]], ['ines', [-10, 40, 20, -30, 50]]] },
  { game: 'wonders', at: '2026-11-13T20:30:00+01:00', minutes: 45, secs: 39, prevBest: 63, rows: [['ines', [61]], ['benny', [55]], ['max', [57]], ['lea', [49]]] },
  { game: 'cascadia', at: '2026-10-24T15:00:00+02:00', minutes: 45, secs: 51, prevBest: 79, rows: [['lea', [86]], ['benny', [83]], ['jade', [80]]] },
]
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const token = () => Array.from(randomBytes(12), (b) => ALPHA[b % ALPHA.length]).join('')
let ev = 130
const out = defs.map((d) => {
  const [gameName, gameId] = G[d.game]
  const created = new Date(d.at)
  const finished = new Date(created.getTime() + d.minutes * 60000)
  const rows = d.rows.map(([k, sc]) => ({ k, id: k, name: P[k][0], scores: sc, total: computeTotal(sc) }))
  const winnerIds = preselectWinners(rows)
  const highlight = buildHighlight({ template: 'scores par manche', gameName, players: rows.map((r) => ({ id: r.id, name: r.name, total: r.total })), winnerIds, previousBestOfWinner: d.prevBest })
  const ref = partyRef(gameName, created)
  const evt = (action: string, at: Date) => ({ [F.events.id]: `demo-ev-${++ev}`, [F.events.visitorId]: 'demo-jedha', [F.events.action]: action, [F.events.origin]: 'app', [F.events.date]: at.toISOString(), [F.events.player]: [P.benny[1]] })
  return {
    party: { [F.parties.ref]: ref, [F.parties.game]: [gameId], [F.parties.creator]: [P.benny[1]], [F.parties.status]: 'terminée', [F.parties.createdAt]: created.toISOString(), [F.parties.finishedAt]: finished.toISOString(), [F.parties.template]: 'scores par manche', [F.parties.rounds]: d.rows[0]![1].length, [F.parties.creationSeconds]: d.secs, [F.parties.shareToken]: token(), ...(highlight ? { [F.parties.highlight]: highlight } : {}) },
    participations: rows.map((r) => ({ [F.participations.ref]: participationRef(ref, r.name), [F.participations.player]: [P[r.k][1]], [F.participations.scores]: JSON.stringify(r.scores), [F.participations.total]: r.total, [F.participations.winner]: winnerIds.includes(r.id) })),
    events: [evt('creation_debut', new Date(created.getTime() - d.secs * 1000)), evt('partie_creee', created), evt('partie_terminee', finished)],
  }
})
console.log(JSON.stringify(out, null, 1))
