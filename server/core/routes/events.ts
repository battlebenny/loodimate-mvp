import { HttpError, readJson } from '../http.js'
import type { Route } from '../router.js'
import { dbFor } from './db.js'
import { recordEvent } from '../services/events.js'
import type { EventInput } from '../../../shared/types.js'

const CLIENT_ACTIONS = new Set(['creation_debut', 'lien_partage', 'souvenir_ouvert', 'cta_clic', 'stats_consultees'])

export const eventRoutes: Route[] = [
  {
    method: 'POST',
    pattern: 'events',
    run: async (ctx) => {
      const e = await readJson<EventInput>(ctx.request)
      if (!CLIENT_ACTIONS.has(e.action) || (e.origin !== 'app' && e.origin !== 'lien') || !e.visitorId || !e.eventId) {
        throw new HttpError(400, 'bad_request', 'Événement invalide.')
      }
      await recordEvent(dbFor(ctx), {
        eventId: String(e.eventId).slice(0, 64),
        action: e.action,
        origin: e.origin,
        visitorId: String(e.visitorId).slice(0, 64),
        partyId: e.partyId && /^rec[A-Za-z0-9]{14}$/.test(e.partyId) ? e.partyId : undefined,
        retry: e.retry === true,
      })
      return undefined
    },
  },
]
