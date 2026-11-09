// In-memory stand-in for AirtableClient. Understands only the formulas built by
// server/core/airtable/formula.ts and keeps inverse links in sync like Airtable.
import type { AirRecord } from '../../server/core/airtable/client.js'
import { F, T } from '../../server/core/airtable/schema.js'

const INVERSE: [string, string, string, string][] = [
  [T.parties, F.parties.creator, T.players, F.players.createdParties],
  [T.parties, F.parties.game, T.games, F.games.parties],
  [T.participations, F.participations.party, T.parties, F.parties.participations],
  [T.participations, F.participations.player, T.players, F.players.participations],
  [T.events, F.events.party, T.parties, F.parties.events],
  [T.events, F.events.player, T.players, F.players.events],
]

type Pred = (r: AirRecord) => boolean
const unesc = (s: string) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v))

function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0, inStr = false, cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (inStr) {
      cur += c
      if (c === '\\') { cur += s[++i]; continue }
      if (c === "'") inStr = false
      continue
    }
    if (c === "'") inStr = true
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out
}

export function compile(f: string): Pred {
  let m: RegExpMatchArray | null
  if ((m = f.match(/^AND\((.*)\)$/s))) { const ps = splitTop(m[1]!).map(compile); return (r) => ps.every((p) => p(r)) }
  if ((m = f.match(/^OR\((.*)\)$/s))) { const ps = splitTop(m[1]!).map(compile); return (r) => ps.some((p) => p(r)) }
  if ((m = f.match(/^RECORD_ID\(\)='(.*)'$/s))) { const id = unesc(m[1]!); return (r) => r.id === id }
  if ((m = f.match(/^LOWER\(TRIM\(\{(\w+)\}\)\)=LOWER\('(.*)'\)$/s))) { const [fid, v] = [m[1]!, unesc(m[2]!)]; return (r) => str(r.fields[fid]).trim().toLowerCase() === v.toLowerCase() }
  if ((m = f.match(/^FIND\(',(.*),', ','&SUBSTITUTE\(\{(\w+)\},' ',''\)&','\)>0$/s))) { const [v, fid] = [unesc(m[1]!), m[2]!]; return (r) => (',' + str(r.fields[fid]).replace(/ /g, '') + ',').includes(`,${v},`) }
  if ((m = f.match(/^\{(\w+)\}=BLANK\(\)$/))) { const fid = m[1]!; return (r) => str(r.fields[fid]) === '' }
  if ((m = f.match(/^\{(\w+)\}='(.*)'$/s))) { const [fid, v] = [m[1]!, unesc(m[2]!)]; return (r) => str(r.fields[fid]) === v }
  if ((m = f.match(/^\{(\w+)\}=(\d+)$/))) { const [fid, v] = [m[1]!, Number(m[2])]; return (r) => r.fields[fid] === v }
  throw new Error(`fakeDb: unsupported formula ${f}`)
}

export class FakeDb {
  tables: Record<string, AirRecord[]> = {}
  calls = 0
  uploads: { recordId: string; fieldId: string; filename: string }[] = []
  private seq = 0

  rows(table: string): AirRecord[] {
    return (this.tables[table] ??= [])
  }
  find(table: string, id: string): AirRecord {
    const r = this.rows(table).find((x) => x.id === id)
    if (!r) throw new Error(`fakeDb: ${id} not in ${table}`)
    return r
  }
  private link(table: string, rec: AirRecord, before: Record<string, unknown>) {
    for (const [srcT, srcF, dstT, dstF] of INVERSE) {
      if (srcT !== table || !(srcF in rec.fields)) continue
      const oldIds = (before[srcF] as string[] | undefined) ?? []
      const newIds = (rec.fields[srcF] as string[] | undefined) ?? []
      for (const id of oldIds) {
        const d = this.rows(dstT).find((x) => x.id === id)
        if (d) d.fields[dstF] = ((d.fields[dstF] as string[]) ?? []).filter((x) => x !== rec.id)
      }
      for (const id of newIds) {
        const d = this.find(dstT, id)
        d.fields[dstF] = [...(((d.fields[dstF] as string[]) ?? []).filter((x) => x !== rec.id)), rec.id]
      }
    }
  }
  seed(table: string, fields: Record<string, unknown>, id?: string): AirRecord {
    const rec = { id: id ?? `rec${table.slice(3, 6)}${++this.seq}`, createdTime: new Date().toISOString(), fields: { ...fields } }
    this.rows(table).push(rec)
    this.link(table, rec, {})
    return rec
  }
  async list(table: string, opts: { filterByFormula?: string } = {}): Promise<AirRecord[]> {
    this.calls++
    const p = opts.filterByFormula ? compile(opts.filterByFormula) : () => true
    return structuredClone(this.rows(table).filter(p))
  }
  async getByIds(table: string, ids: string[]): Promise<AirRecord[]> {
    if (ids.length === 0) return []
    this.calls++
    return structuredClone(this.rows(table).filter((r) => ids.includes(r.id)))
  }
  async create(table: string, rows: Record<string, unknown>[]): Promise<AirRecord[]> {
    this.calls += Math.ceil(rows.length / 10)
    return structuredClone(rows.map((f) => this.seed(table, f)))
  }
  async update(table: string, rows: { id: string; fields: Record<string, unknown> }[]): Promise<AirRecord[]> {
    this.calls += Math.ceil(rows.length / 10)
    return structuredClone(
      rows.map(({ id, fields }) => {
        const rec = this.find(table, id)
        const before = { ...rec.fields }
        Object.assign(rec.fields, fields)
        this.link(table, { ...rec, fields }, before)
        return rec
      }),
    )
  }
  async uploadAttachment(recordId: string, fieldId: string, file: { filename: string }): Promise<void> {
    this.calls++
    this.uploads.push({ recordId, fieldId, filename: file.filename })
    const rec = this.find(T.parties, recordId)
    const list = (rec.fields[fieldId] as unknown[]) ?? []
    rec.fields[fieldId] = [...list, { id: `att${++this.seq}`, url: `https://dl/${file.filename}`, filename: file.filename, thumbnails: { large: { url: `https://dl/l/${file.filename}` } } }]
  }
}
