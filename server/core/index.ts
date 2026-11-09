// Entry point for platform adapters: registers every route on the core router.
import { routes, handle } from './router.js'
import { playerRoutes } from './routes/players.js'
import { eventRoutes } from './routes/events.js'
import { gameRoutes } from './routes/games.js'
import { partyRoutes } from './routes/parties.js'

routes.push(...playerRoutes, ...eventRoutes, ...gameRoutes, ...partyRoutes)

export { handle }
