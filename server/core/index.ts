// Entry point for platform adapters: registers every route on the core router.
import { routes, handle } from './router.js'
import { playerRoutes } from './routes/players.js'

routes.push(...playerRoutes)

export { handle }
