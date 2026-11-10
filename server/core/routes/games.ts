import type { Route } from '../router.js'
import { json } from '../http.js'
import { searchGames } from '../bgg.js'

export const gameRoutes: Route[] = [
  {
    method: 'GET',
    pattern: 'games/search',
    run: async (ctx) => {
      const results = await searchGames(ctx.query.get('q') ?? '', ctx.env)
      return json({ results }, 200, { 'Cache-Control': 'public, max-age=86400' })
    },
  },
]
