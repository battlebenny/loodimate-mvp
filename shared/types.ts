// Domain types and internal API DTOs shared by the front and the server.

export type Template = 'scores par manche' | 'vainqueur seulement'
export type PartyStatus = 'en cours' | 'terminée'
export type Origin = 'app' | 'lien'
export type EventAction =
  | 'appareil_cree'
  | 'creation_debut'
  | 'partie_creee'
  | 'partie_terminee'
  | 'lien_partage'
  | 'souvenir_ouvert'
  | 'cta_clic'
  | 'stats_consultees'

/** One entry per round, null when the cell is empty. */
export type Scores = (number | null)[]

export type PlayerDTO = { id: string; name: string }

/** image = full box visual (stored on the game), thumb = small one for lists. */
export type BggGame = { bggId: number; name: string; year: number | null; image: string | null; thumb: string | null }

export type CreatePartyInput = {
  game: { bggId?: number; name: string; image?: string | null }
  players: { name: string; playerId?: string }[]
  creationSeconds: number
}

export type SheetInput = {
  template: Template
  rounds: number
  /** Keyed by participation id. */
  scores: Record<string, Scores>
  /** Participation ids. */
  winners: string[]
}

export type PartyPlayerDTO = {
  participationId: string
  playerId: string
  name: string
  scores: Scores
  total: number | null
  winner: boolean
}

export type PartyDTO = {
  id: string
  ref: string
  status: PartyStatus
  template: Template
  rounds: number
  createdAt: string
  finishedAt: string | null
  creatorName: string
  game: { id: string; name: string; image: string | null }
  players: PartyPlayerDTO[]
  highlight: string | null
  /** id: Airtable attachment id, used to delete a photo. */
  photos: { id: string; url: string; thumbUrl: string }[]
  shareToken?: string
  canEdit: boolean
}

export type PartySummaryDTO = {
  id: string
  status: PartyStatus
  template: Template
  rounds: number
  createdAt: string
  finishedAt: string | null
  game: { name: string; image: string | null }
  playerCount: number
  winnerNames: string[]
  photoCount: number
  firstPhotoThumb: string | null
  /** Finished parties only (null otherwise): lets Home show the latest souvenir without another call. */
  highlight: string | null
  /** Finished "scores par manche" parties: players by total, best first; empty otherwise. */
  ranking: { name: string; total: number }[]
}

export type StatsDTO = {
  parties: number
  wins: number
  /** Integer percentage. */
  winRate: number
  byGame: {
    gameId: string
    name: string
    parties: number
    wins: number
    best: number | null
    avg: number | null
    min: number | null
    hasScores: boolean
  }[]
  winsByPlayer: { name: string; wins: number; isMe: boolean }[]
}

export type EventInput = {
  eventId: string
  action: EventAction
  origin: Origin
  visitorId: string
  partyId?: string
  retry?: boolean
}
