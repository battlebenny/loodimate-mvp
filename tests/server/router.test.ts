import { describe, expect, it } from 'vitest'
import { handle, routes } from '../../server/core/router.js'
import { HttpError } from '../../server/core/http.js'
import type { Env } from '../../server/core/env.js'

const env: Env = { AIRTABLE_API_TOKEN: 't', AIRTABLE_BASE_ID: 'appX', BGG_API_TOKEN: 'b' }

describe('core router', () => {
  it('answers health', async () => {
    const res = await handle('health', new Request('http://x/api/health'), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 404 json on unknown route', async () => {
    const res = await handle('nope', new Request('http://x/api/nope'), env)
    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('not_found')
  })

  it('maps HttpError to its status and code', async () => {
    routes.push({ method: 'GET', pattern: 'test/conflict/:id', run: async () => { throw new HttpError(409, 'taken', 'Déjà pris') } })
    const res = await handle('test/conflict/abc', new Request('http://x/api/test/conflict/abc'), env)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: { code: 'taken', message: 'Déjà pris' } })
  })

  it('passes path params to the route', async () => {
    routes.push({ method: 'GET', pattern: 'test/echo/:id', run: async (ctx) => ({ id: ctx.params.id }) })
    const res = await handle('test/echo/rec123', new Request('http://x/api/test/echo/rec123'), env)
    expect(await res.json()).toEqual({ id: 'rec123' })
  })

  it('hides unexpected errors behind a 500 internal code', async () => {
    routes.push({ method: 'GET', pattern: 'test/boom', run: async () => { throw new Error('airtable secret detail') } })
    const res = await handle('test/boom', new Request('http://x/api/test/boom'), env)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('internal')
    expect(JSON.stringify(body)).not.toContain('secret')
  })
})
