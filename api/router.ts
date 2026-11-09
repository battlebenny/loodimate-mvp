// Vercel adapter: every /api/* request is rewritten here (see vercel.json).
import { handle } from '../server/core/router.js'
import type { Env } from '../server/core/env.js'

function env(): Env {
  return {
    AIRTABLE_API_TOKEN: process.env.AIRTABLE_API_TOKEN ?? '',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ?? '',
    BGG_API_TOKEN: process.env.BGG_API_TOKEN ?? '',
  }
}

function run(request: Request): Promise<Response> {
  const path = new URL(request.url).searchParams.get('path') ?? ''
  return handle(path, request, env())
}

export const GET = run
export const POST = run
export const PUT = run
export const PATCH = run
