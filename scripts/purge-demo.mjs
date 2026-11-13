// Removes the demo dataset listed in scripts/demo-manifest.json and restores the fields it changed.
// Dry run by default:   node --env-file=.env scripts/purge-demo.mjs
// Really delete:        node --env-file=.env scripts/purge-demo.mjs --confirm
import { readFileSync } from 'node:fs'

const T = { players: 'tbluswyc5kjhijKxJ', games: 'tblDk3LXpbar0LAB1', parties: 'tblgy5ycSeMQ6JPOZ', participations: 'tbl3ceg2pfP2EqirJ', events: 'tblOe6jCZGUYeeauA' }
const F = { partyParticipations: 'fldUJfNg76i4iN4bv', eventId: 'fldWnp0mlT1GJhBB3' }
const confirm = process.argv.includes('--confirm')
const { AIRTABLE_API_TOKEN: token, AIRTABLE_BASE_ID: base } = process.env
if (!token || !base) throw new Error('AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID are required (node --env-file=.env …)')
const manifest = JSON.parse(readFileSync(new URL('./demo-manifest.json', import.meta.url), 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function call(path, init = {}) {
  await sleep(220) // stay under 5 requests per second
  const res = await fetch(`https://api.airtable.com/v0/${base}/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}
async function list(table, formula) {
  const out = []
  let offset
  do {
    const q = new URLSearchParams({ returnFieldsByFieldId: 'true', filterByFormula: formula })
    if (offset) q.set('offset', offset)
    const page = await call(`${table}?${q}`)
    out.push(...page.records)
    offset = page.offset
  } while (offset)
  return out
}
const byIds = (ids) => `OR(${ids.map((id) => `RECORD_ID()='${id}'`).join(',')})`
async function remove(table, ids, label) {
  console.log(`${confirm ? 'Deleting' : 'Would delete'} ${ids.length} ${label}`)
  if (!confirm) return
  for (let i = 0; i < ids.length; i += 10) await call(`${table}?${ids.slice(i, i + 10).map((id) => `records[]=${id}`).join('&')}`, { method: 'DELETE' })
}

// Seeded events share a prefix; events of parties added later through the app are listed by id.
const eventFormula = [`FIND('${manifest.eventIdPrefix}',{${F.eventId}})=1`, ...(manifest.eventIds ?? []).map((id) => `{${F.eventId}}='${id}'`)]
const events = await list(T.events, `OR(${eventFormula.join(',')})`)
const parties = await list(T.parties, byIds(manifest.parties))
const participations = parties.flatMap((p) => p.fields[F.partyParticipations] ?? [])
await remove(T.events, events.map((r) => r.id), 'demo events')
await remove(T.participations, participations, 'demo participations')
await remove(T.parties, parties.map((r) => r.id), 'demo parties')
await remove(T.players, manifest.players, 'demo players')
await remove(T.games, manifest.games, 'demo games')
for (const r of manifest.restore) {
  console.log(`${confirm ? 'Restoring' : 'Would restore'} ${r.id} ${JSON.stringify(r.fields)}`)
  if (confirm) await call(r.table, { method: 'PATCH', body: JSON.stringify({ records: [{ id: r.id, fields: r.fields }] }) })
}
console.log(confirm ? 'Done.' : 'Dry run only. Re-run with --confirm to delete.')
