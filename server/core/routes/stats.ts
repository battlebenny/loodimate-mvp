import type { Route } from '../router.js'
import { dbFor } from './db.js'
import { loadStats } from '../services/stats.js'

export const statsRoutes: Route[] = [{ method: 'GET', pattern: 'stats', run: async (ctx) => loadStats(dbFor(ctx), ctx.deviceId) }]
