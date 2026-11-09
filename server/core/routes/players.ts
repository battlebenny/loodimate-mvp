import { readJson, HttpError } from '../http.js'
import type { Route } from '../router.js'
import { dbFor } from './db.js'
import { findPlayerByDevice, lookupName, onboard } from '../services/players.js'

export const playerRoutes: Route[] = [
  {
    method: 'GET',
    pattern: 'players/me',
    run: async (ctx) => {
      const p = ctx.deviceId ? await findPlayerByDevice(dbFor(ctx), ctx.deviceId) : null
      if (!p) throw new HttpError(404, 'not_onboarded', 'Appareil inconnu.')
      return p
    },
  },
  {
    method: 'POST',
    pattern: 'players/onboard',
    run: async (ctx) => {
      const body = await readJson<{ firstName?: string; mode?: 'new' | 'claim' | 'link' }>(ctx.request)
      if (!ctx.deviceId) throw new HttpError(400, 'bad_request', 'Appareil manquant.')
      return onboard(dbFor(ctx), ctx.deviceId, body.firstName ?? '', body.mode ?? 'new')
    },
  },
  {
    method: 'GET',
    pattern: 'players/lookup',
    run: async (ctx) => lookupName(dbFor(ctx), ctx.query.get('name') ?? ''),
  },
]
