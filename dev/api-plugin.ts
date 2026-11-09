// Vite dev middleware: serves /api/* through the same core router as production.
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import type { IncomingMessage } from 'node:http'
import { handle } from '../server/core/router.js'
import type { Env } from '../server/core/env.js'

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

export function apiPlugin(mode: string): Plugin {
  const raw = loadEnv(mode, process.cwd(), '')
  const env: Env = {
    AIRTABLE_API_TOKEN: raw.AIRTABLE_API_TOKEN ?? '',
    AIRTABLE_BASE_ID: raw.AIRTABLE_BASE_ID ?? '',
    BGG_API_TOKEN: raw.BGG_API_TOKEN ?? '',
  }
  return {
    name: 'loodi-mate-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const method = req.method ?? 'GET'
        const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req)
        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
        const request = new Request(`http://localhost/api${url.pathname}${url.search}`, { method, headers, body })
        const response = await handle(url.pathname, request, env)
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}
