import type { Env } from '../env.js'
import { HttpError } from '../http.js'
import { byIdsFormula } from './formula.js'

export type AirRecord = { id: string; createdTime: string; fields: Record<string, unknown> }

type ListOptions = {
  filterByFormula?: string
  fields?: string[]
  sort?: { field: string; direction: 'asc' | 'desc' }[]
  maxRecords?: number
}

const API = 'https://api.airtable.com/v0'
const CONTENT = 'https://content.airtable.com/v0'

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class AirtableClient {
  private readonly fetchImpl: typeof fetch

  constructor(
    private readonly env: Env,
    fetchImpl?: typeof fetch,
  ) {
    this.fetchImpl = fetchImpl ?? ((...args) => fetch(...args))
  }

  private async call<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers = { Authorization: `Bearer ${this.env.AIRTABLE_API_TOKEN}`, 'Content-Type': 'application/json' }
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.fetchImpl(url, { ...init, headers })
      if (res.status === 429) {
        if (attempt === 0) {
          await sleep(1000)
          continue
        }
        throw new HttpError(503, 'busy', 'Le service est très demandé, réessaie dans un instant.')
      }
      if (!res.ok) {
        console.error('[airtable]', res.status, await res.text().catch(() => ''))
        throw new HttpError(502, 'storage', "Impossible d'enregistrer pour le moment, réessaie dans un instant.")
      }
      return (await res.json()) as T
    }
    throw new HttpError(503, 'busy', 'Le service est très demandé, réessaie dans un instant.')
  }

  private tableUrl(table: string): string {
    return `${API}/${this.env.AIRTABLE_BASE_ID}/${table}`
  }

  async list(table: string, opts: ListOptions = {}): Promise<AirRecord[]> {
    const out: AirRecord[] = []
    let offset: string | undefined
    do {
      const q = new URLSearchParams({ returnFieldsByFieldId: 'true' })
      if (opts.filterByFormula) q.set('filterByFormula', opts.filterByFormula)
      if (opts.maxRecords) q.set('maxRecords', String(opts.maxRecords))
      opts.fields?.forEach((f) => q.append('fields[]', f))
      opts.sort?.forEach((s, i) => {
        q.set(`sort[${i}][field]`, s.field)
        q.set(`sort[${i}][direction]`, s.direction)
      })
      if (offset) q.set('offset', offset)
      const page = await this.call<{ records: AirRecord[]; offset?: string }>(`${this.tableUrl(table)}?${q}`)
      out.push(...page.records)
      offset = page.offset
    } while (offset)
    return out
  }

  async getByIds(table: string, ids: string[]): Promise<AirRecord[]> {
    const unique = [...new Set(ids)]
    const out: AirRecord[] = []
    for (const part of chunk(unique, 50)) out.push(...(await this.list(table, { filterByFormula: byIdsFormula(part) })))
    return out
  }

  async create(table: string, rows: Record<string, unknown>[]): Promise<AirRecord[]> {
    const out: AirRecord[] = []
    for (const part of chunk(rows, 10)) {
      const res = await this.call<{ records: AirRecord[] }>(this.tableUrl(table), {
        method: 'POST',
        body: JSON.stringify({ records: part.map((fields) => ({ fields })), typecast: false, returnFieldsByFieldId: true }),
      })
      out.push(...res.records)
    }
    return out
  }

  async update(table: string, rows: { id: string; fields: Record<string, unknown> }[]): Promise<AirRecord[]> {
    const out: AirRecord[] = []
    for (const part of chunk(rows, 10)) {
      const res = await this.call<{ records: AirRecord[] }>(this.tableUrl(table), {
        method: 'PATCH',
        body: JSON.stringify({ records: part, typecast: false, returnFieldsByFieldId: true }),
      })
      out.push(...res.records)
    }
    return out
  }

  async uploadAttachment(recordId: string, fieldId: string, file: { base64: string; contentType: string; filename: string }): Promise<void> {
    await this.call(`${CONTENT}/${this.env.AIRTABLE_BASE_ID}/${recordId}/${fieldId}/uploadAttachment`, {
      method: 'POST',
      body: JSON.stringify({ contentType: file.contentType, file: file.base64, filename: file.filename }),
    })
  }
}
