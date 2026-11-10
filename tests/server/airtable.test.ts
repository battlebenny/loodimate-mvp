import { afterEach, describe, expect, it, vi } from 'vitest'
import { AirtableClient } from '../../server/core/airtable/client.js'
import { byDeviceFormula, byIdsFormula, byNameFormula, escapeFormulaString } from '../../server/core/airtable/formula.js'
import { F, T } from '../../server/core/airtable/schema.js'
import { HttpError } from '../../server/core/http.js'

const env = { AIRTABLE_API_TOKEN: 'tok', AIRTABLE_BASE_ID: 'appBASE', BGG_API_TOKEN: 'b' }

type Call = { url: string; init: RequestInit }
function fakeFetch(responses: (Response | (() => Response))[]) {
  const calls: Call[] = []
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const r = responses.shift()
    if (!r) throw new Error('no more responses')
    return typeof r === 'function' ? r() : r
  })
  return { fn: fn as unknown as typeof fetch, calls }
}
const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 })

afterEach(() => vi.useRealTimers())

describe('AirtableClient', () => {
  it('creates in chunks of 10 with field ids and no typecast', async () => {
    const rec = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `rec${i}`, createdTime: '', fields: {} }))
    const f = fakeFetch([ok({ records: rec(10) }), ok({ records: rec(10) }), ok({ records: rec(3) })])
    const db = new AirtableClient(env, f.fn)
    const rows = Array.from({ length: 23 }, (_, i) => ({ [F.players.name]: `P${i}` }))
    const out = await db.create(T.players, rows)
    expect(out).toHaveLength(23)
    expect(f.calls).toHaveLength(3)
    expect(f.calls[0]!.url).toBe(`https://api.airtable.com/v0/appBASE/${T.players}`)
    expect(f.calls[0]!.init.method).toBe('POST')
    const body = JSON.parse(String(f.calls[0]!.init.body))
    expect(body.typecast).toBe(false)
    expect(body.returnFieldsByFieldId).toBe(true)
    expect(body.records).toHaveLength(10)
    expect(body.records[0].fields).toEqual({ [F.players.name]: 'P0' })
    expect((f.calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('lists across pages with returnFieldsByFieldId', async () => {
    const f = fakeFetch([
      ok({ records: [{ id: 'a', createdTime: '', fields: {} }], offset: 'o1' }),
      ok({ records: [{ id: 'b', createdTime: '', fields: {} }] }),
    ])
    const db = new AirtableClient(env, f.fn)
    const out = await db.list(T.parties, { filterByFormula: "{x}='y'" })
    expect(out.map((r) => r.id)).toEqual(['a', 'b'])
    expect(f.calls[0]!.url).toContain('returnFieldsByFieldId=true')
    expect(f.calls[0]!.url).toContain('filterByFormula=')
    expect(f.calls[1]!.url).toContain('offset=o1')
  })

  it('updates with PATCH in chunks of 10', async () => {
    const f = fakeFetch([ok({ records: [{ id: 'a', createdTime: '', fields: {} }] })])
    const db = new AirtableClient(env, f.fn)
    await db.update(T.parties, [{ id: 'a', fields: { [F.parties.status]: 'terminée' } }])
    expect(f.calls[0]!.init.method).toBe('PATCH')
  })

  it('backs off 1.5 s then 4 s after 429s, then reports busy', async () => {
    vi.useFakeTimers()
    const f = fakeFetch([new Response('', { status: 429 }), new Response('', { status: 429 }), new Response('', { status: 429 })])
    const db = new AirtableClient(env, f.fn)
    const p = db.list(T.players)
    const assertion = expect(p).rejects.toMatchObject({ status: 503, code: 'busy' })
    await vi.advanceTimersByTimeAsync(1400)
    expect(f.calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(200)
    expect(f.calls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(4100)
    await assertion
    expect(f.calls).toHaveLength(3)
  })

  it('succeeds when a retry after a 429 works', async () => {
    vi.useFakeTimers()
    const f = fakeFetch([new Response('', { status: 429 }), ok({ records: [] })])
    const db = new AirtableClient(env, f.fn)
    const p = db.list(T.players)
    await vi.advanceTimersByTimeAsync(1700)
    await expect(p).resolves.toEqual([])
  })

  it('spaces consecutive calls by at least 200 ms to stay under 5 requests per second', async () => {
    vi.useFakeTimers()
    const f = fakeFetch([ok({ records: [] }), ok({ records: [] }), ok({ records: [] })])
    const db = new AirtableClient(env, f.fn)
    const all = Promise.all([db.list(T.players), db.list(T.games), db.list(T.parties)])
    await vi.advanceTimersByTimeAsync(0)
    expect(f.calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(210)
    expect(f.calls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(210)
    expect(f.calls).toHaveLength(3)
    await all
  })

  it('maps other API errors to a 502 without leaking details', async () => {
    const f = fakeFetch([new Response('{"error":{"type":"INVALID"}}', { status: 422 })])
    const db = new AirtableClient(env, f.fn)
    const err = await db.list(T.players).catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.status).toBe(502)
  })

  it('uploads an attachment to the content endpoint', async () => {
    const f = fakeFetch([ok({ id: 'recP' })])
    const db = new AirtableClient(env, f.fn)
    await db.uploadAttachment('recP', F.parties.photos, { base64: 'QUJD', contentType: 'image/jpeg', filename: 'p.jpg' })
    expect(f.calls[0]!.url).toBe(`https://content.airtable.com/v0/appBASE/recP/${F.parties.photos}/uploadAttachment`)
    expect(JSON.parse(String(f.calls[0]!.init.body))).toEqual({ contentType: 'image/jpeg', file: 'QUJD', filename: 'p.jpg' })
  })

  it('getByIds chunks by 50 and returns nothing for no ids', async () => {
    const f = fakeFetch([ok({ records: [] }), ok({ records: [] })])
    const db = new AirtableClient(env, f.fn)
    expect(await db.getByIds(T.players, [])).toEqual([])
    await db.getByIds(T.players, Array.from({ length: 60 }, (_, i) => `rec${i}`))
    expect(f.calls).toHaveLength(2)
  })
})

describe('formulas', () => {
  it('escapes quotes and backslashes', () => expect(escapeFormulaString("a'b\\c")).toBe("a\\'b\\\\c"))
  it('builds a case-insensitive name formula that survives apostrophes', () => {
    expect(byNameFormula(F.players.name, "D'Artagnan")).toBe(`LOWER(TRIM({${F.players.name}}))=LOWER('d\\'artagnan')`)
  })
  it('matches a device inside a comma separated list', () => {
    expect(byDeviceFormula(F.players.device, 'abc')).toBe(`FIND(',abc,', ','&SUBSTITUTE({${F.players.device}},' ','')&',')>0`)
  })
  it('builds record id lists', () => expect(byIdsFormula(['a', 'b'])).toBe("OR(RECORD_ID()='a',RECORD_ID()='b')"))
})
