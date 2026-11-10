import type { Env } from './env.js'
import { errorResponse, HttpError, json } from './http.js'

export type RouteContext = {
  request: Request
  env: Env
  params: Record<string, string>
  query: URLSearchParams
  deviceId: string | null
}

export type Route = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  pattern: string
  // Returns a JSON-serialisable value (200), a Response, or undefined (204).
  run: (ctx: RouteContext) => Promise<unknown>
}

export const routes: Route[] = [{ method: 'GET', pattern: 'health', run: async () => ({ ok: true }) }]

function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/')
  const s = path.split('/')
  if (p.length !== s.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    const seg = p[i]!
    const value = s[i]!
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(value)
    else if (seg !== value) return null
  }
  return params
}

export async function handle(path: string, request: Request, env: Env): Promise<Response> {
  const clean = path.replace(/^\/+|\/+$/g, '')
  const url = new URL(request.url)
  for (const route of routes) {
    if (route.method !== request.method) continue
    const params = match(route.pattern, clean)
    if (!params) continue
    try {
      const result = await route.run({
        request,
        env,
        params,
        query: url.searchParams,
        deviceId: request.headers.get('X-Device-Id'),
      })
      if (result instanceof Response) return result
      if (result === undefined) return new Response(null, { status: 204 })
      return json(result)
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error.status, error.code, error.message)
      console.error('[api] unexpected error', error)
      return errorResponse(500, 'internal', 'Une erreur est survenue, réessaie dans un instant.')
    }
  }
  return errorResponse(404, 'not_found', 'Introuvable.')
}
