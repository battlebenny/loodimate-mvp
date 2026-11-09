import { api } from './api'
import { getVisitorId } from './device'
import type { EventAction, EventInput, Origin } from '../../shared/types'

type ClientAction = Extract<EventAction, 'creation_debut' | 'lien_partage' | 'souvenir_ouvert' | 'cta_clic' | 'stats_consultees'>

/** Fire-and-forget measurement event: never blocks the UI, retries once with the same id. */
export function track(action: ClientAction, opts: { origin: Origin; partyId?: string }): void {
  const event: EventInput = { eventId: crypto.randomUUID(), action, origin: opts.origin, visitorId: getVisitorId(), partyId: opts.partyId }
  const send = (retry: boolean) => api('POST', 'events', retry ? { ...event, retry: true } : event, { keepalive: true })
  send(false).catch(() => {
    setTimeout(() => {
      send(true).catch((e) => console.warn('[track] event dropped', action, e))
    }, 3000)
  })
}
