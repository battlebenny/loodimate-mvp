import { HttpError, readJson } from '../http.js'
import type { Route } from '../router.js'
import { dbFor } from './db.js'
import { addPhoto, createParty, finishParty, getParty, getSharedParty, listParties, saveSheet, updateSouvenir } from '../services/parties.js'
import type { CreatePartyInput, PartyStatus, Scores, SheetInput } from '../../../shared/types.js'

export const partyRoutes: Route[] = [
  { method: 'POST', pattern: 'parties', run: async (ctx) => createParty(dbFor(ctx), ctx.deviceId, await readJson<CreatePartyInput>(ctx.request)) },
  {
    method: 'GET',
    pattern: 'parties',
    run: async (ctx) => {
      const status = ctx.query.get('status')
      if (status !== 'en cours' && status !== 'terminée') throw new HttpError(400, 'bad_request', 'Statut invalide.')
      return { parties: await listParties(dbFor(ctx), ctx.deviceId, status as PartyStatus) }
    },
  },
  { method: 'GET', pattern: 'parties/:id', run: async (ctx) => getParty(dbFor(ctx), ctx.deviceId, ctx.params.id!) },
  { method: 'PUT', pattern: 'parties/:id/sheet', run: async (ctx) => saveSheet(dbFor(ctx), ctx.deviceId, ctx.params.id!, await readJson<SheetInput>(ctx.request)) },
  { method: 'POST', pattern: 'parties/:id/finish', run: async (ctx) => finishParty(dbFor(ctx), ctx.deviceId, ctx.params.id!, await readJson<SheetInput>(ctx.request)) },
  {
    method: 'PATCH',
    pattern: 'parties/:id/souvenir',
    run: async (ctx) =>
      updateSouvenir(dbFor(ctx), ctx.deviceId, ctx.params.id!, await readJson<{ scores?: Record<string, Scores>; winners?: string[]; highlight?: string }>(ctx.request)),
  },
  {
    method: 'POST',
    pattern: 'parties/:id/photos',
    run: async (ctx) => addPhoto(dbFor(ctx), ctx.deviceId, ctx.params.id!, await readJson<{ base64: string; contentType: string; filename: string }>(ctx.request)),
  },
  { method: 'GET', pattern: 'shared/:token', run: async (ctx) => getSharedParty(dbFor(ctx), ctx.params.token!) },
]
