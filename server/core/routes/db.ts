import { AirtableClient } from '../airtable/client.js'
import type { Db } from '../airtable/db.js'
import type { RouteContext } from '../router.js'

export function dbFor(ctx: RouteContext): Db {
  return new AirtableClient(ctx.env)
}
