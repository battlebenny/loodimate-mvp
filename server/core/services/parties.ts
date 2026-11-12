import type { Db } from '../airtable/db.js'
import type { AirRecord } from '../airtable/client.js'
import { byFieldEquals, byNameFormula } from '../airtable/formula.js'
import { F, T } from '../airtable/schema.js'
import { HttpError } from '../http.js'
import { buildHighlight } from '../../../shared/highlight.js'
import { normalizeName, sameName } from '../../../shared/names.js'
import { participationRef, partyRef } from '../../../shared/refs.js'
import { computeTotal, preselectWinners } from '../../../shared/scoring.js'
import { newShareToken } from '../../../shared/token.js'
import type { CreatePartyInput, PartyDTO, PartyStatus, PartySummaryDTO, Scores, SheetInput, Template } from '../../../shared/types.js'
import { recordEvent } from './events.js'
import { findOrCreateGame, setGameTemplate, toGame } from './games.js'
import { requirePlayer, requirePlayerRecord } from './players.js'

const MAX_PLAYERS = 12
const MAX_ROUNDS = 30
const MAX_HIGHLIGHT = 280
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000

// ---------- field helpers ----------

const ids = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : [])
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function parseScores(raw: unknown): Scores {
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)) : []
  } catch {
    return []
  }
}

function cleanScores(input: unknown, rounds: number): Scores {
  const arr = Array.isArray(input) ? input : []
  return Array.from({ length: rounds }, (_, i) => {
    const v = arr[i]
    return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null
  })
}

type Attachment = { url: string; thumbnails?: { large?: { url: string }; small?: { url: string } } }

// ---------- loading ----------

type Bundle = { party: AirRecord; parts: AirRecord[]; players: Map<string, AirRecord>; game: AirRecord | null }

async function loadBundle(db: Db, party: AirRecord): Promise<Bundle> {
  const parts = await db.getByIds(T.participations, ids(party.fields[F.parties.participations]))
  const playerIds = [...parts.flatMap((p) => ids(p.fields[F.participations.player])), ...ids(party.fields[F.parties.creator])]
  const [players, games] = await Promise.all([db.getByIds(T.players, playerIds), db.getByIds(T.games, ids(party.fields[F.parties.game]))])
  return { party, parts, players: new Map(players.map((p) => [p.id, p])), game: games[0] ?? null }
}

async function loadParty(db: Db, partyId: string): Promise<AirRecord> {
  if (!/^rec[A-Za-z0-9]+$/.test(partyId)) throw new HttpError(404, 'not_found', 'Partie introuvable.')
  const [party] = await db.getByIds(T.parties, [partyId])
  if (!party) throw new HttpError(404, 'not_found', 'Partie introuvable.')
  return party
}

async function loadOwned(db: Db, deviceId: string | null, partyId: string): Promise<{ playerId: string; party: AirRecord }> {
  const [me, party] = await Promise.all([requirePlayer(db, deviceId), loadParty(db, partyId)])
  if (!ids(party.fields[F.parties.creator]).includes(me.id)) throw new HttpError(403, 'forbidden', 'Seule la personne qui a créé la partie peut la modifier.')
  return { playerId: me.id, party }
}

function toDTO(b: Bundle, owner: boolean): PartyDTO {
  const f = b.party.fields
  const template = (f[F.parties.template] as Template | undefined) ?? 'scores par manche'
  const creator = b.players.get(ids(f[F.parties.creator])[0] ?? '')
  const order = ids(f[F.parties.participations])
  const parts = [...b.parts].sort((a, c) => order.indexOf(a.id) - order.indexOf(c.id))
  const dto: PartyDTO = {
    id: b.party.id,
    ref: str(f[F.parties.ref]),
    status: (f[F.parties.status] as PartyStatus | undefined) ?? 'en cours',
    template,
    rounds: typeof f[F.parties.rounds] === 'number' ? (f[F.parties.rounds] as number) : 1,
    createdAt: str(f[F.parties.createdAt]) || b.party.createdTime,
    finishedAt: str(f[F.parties.finishedAt]) || null,
    creatorName: creator ? str(creator.fields[F.players.name]) : '',
    game: b.game ? { id: b.game.id, name: toGame(b.game).name, image: toGame(b.game).image } : { id: '', name: 'Jeu', image: null },
    players: parts.map((p) => {
      const playerId = ids(p.fields[F.participations.player])[0] ?? ''
      const scores = parseScores(p.fields[F.participations.scores])
      return {
        participationId: p.id,
        playerId,
        name: str(b.players.get(playerId)?.fields[F.players.name]),
        scores,
        total: typeof p.fields[F.participations.total] === 'number' ? (p.fields[F.participations.total] as number) : computeTotal(scores),
        winner: p.fields[F.participations.winner] === true,
      }
    }),
    highlight: str(f[F.parties.highlight]) || null,
    photos: ((f[F.parties.photos] as Attachment[] | undefined) ?? []).map((a) => ({ url: a.url, thumbUrl: a.thumbnails?.large?.url ?? a.url })),
    canEdit: owner,
  }
  if (owner) dto.shareToken = str(f[F.parties.shareToken])
  return dto
}

// ---------- create ----------

const RETRY_WINDOW_MS = 2 * 60 * 1000

function createParticipations(db: Db, partyId: string, ref: string, players: { id: string; name: string }[], template: Template) {
  return db.create(
    T.participations,
    players.map((p) => ({
      [F.participations.ref]: participationRef(ref, p.name),
      [F.participations.party]: [partyId],
      [F.participations.player]: [p.id],
      [F.participations.scores]: template === 'vainqueur seulement' ? '' : '[null]',
      [F.participations.winner]: false,
    })),
  )
}

/** An ongoing party of the same game created less than 2 minutes ago with the same players (or none yet). */
async function findRetriedParty(db: Db, createdIds: string[], gameId: string, playerIds: string[]): Promise<AirRecord | null> {
  const recent = await db.getByIds(T.parties, createdIds.slice(-5))
  const candidates = recent.filter(
    (p) =>
      p.fields[F.parties.status] === 'en cours' &&
      ids(p.fields[F.parties.game]).includes(gameId) &&
      Date.now() - Date.parse(str(p.fields[F.parties.createdAt])) < RETRY_WINDOW_MS,
  )
  if (candidates.length === 0) return null
  const parts = await db.getByIds(T.participations, candidates.flatMap((p) => ids(p.fields[F.parties.participations])))
  const wanted = [...playerIds].sort().join(',')
  for (const c of candidates) {
    const own = parts.filter((x) => ids(c.fields[F.parties.participations]).includes(x.id))
    const got = own.map((x) => ids(x.fields[F.participations.player])[0] ?? '').sort().join(',')
    if (own.length === 0 || got === wanted) return c
  }
  return null
}

export async function createParty(db: Db, deviceId: string | null, input: CreatePartyInput): Promise<PartyDTO> {
  const gameName = normalizeName(input.game?.name ?? '')
  const wanted = (input.players ?? []).map((p) => ({ name: normalizeName(p.name ?? ''), playerId: p.playerId }))
  if (!gameName) throw new HttpError(400, 'bad_request', 'Choisis un jeu.')
  if (wanted.length === 0 || wanted.some((p) => !p.name)) throw new HttpError(400, 'bad_request', 'Ajoute au moins un joueur.')
  if (wanted.length > MAX_PLAYERS) throw new HttpError(400, 'bad_request', `${MAX_PLAYERS} joueurs maximum.`)
  if (wanted.some((p, i) => wanted.findIndex((q) => sameName(q.name, p.name)) !== i)) {
    throw new HttpError(400, 'duplicate_name', 'Deux joueurs ont le même prénom : ajoute une initiale.')
  }

  const meRec = await requirePlayerRecord(db, deviceId)
  const me = { id: meRec.id, name: str(meRec.fields[F.players.name]) }
  const game = await findOrCreateGame(db, { bggId: input.game.bggId, name: gameName, image: input.game.image ?? null })

  // Resolve players by name in one query, create the missing ones in one batch.
  const byName = await db.list(T.players, { filterByFormula: `OR(${wanted.map((p) => byNameFormula(F.players.name, p.name)).join(',')})` })
  const resolved = new Map<number, { id: string; name: string }>()
  wanted.forEach((p, i) => {
    if (p.playerId === me.id) return resolved.set(i, me)
    const rec = byName.find((r) => sameName(str(r.fields[F.players.name]), p.name))
    if (rec) resolved.set(i, { id: rec.id, name: str(rec.fields[F.players.name]) })
  })
  const missing = wanted.map((p, i) => ({ ...p, i })).filter((p) => !resolved.has(p.i))
  if (missing.length) {
    const created = await db.create(T.players, missing.map((p) => ({ [F.players.name]: p.name })))
    created.forEach((rec, k) => resolved.set(missing[k]!.i, { id: rec.id, name: str(rec.fields[F.players.name]) || missing[k]!.name }))
  }
  const players = wanted.map((_, i) => resolved.get(i)!)

  // A retry of the same creation (lost response, partial failure) returns the party already created.
  const retried = await findRetriedParty(db, ids(meRec.fields[F.players.createdParties]), game.id, players.map((p) => p.id))
  if (retried) {
    const b = await loadBundle(db, retried)
    if (b.parts.length === 0) {
      const ref = str(retried.fields[F.parties.ref])
      b.parts = await createParticipations(db, retried.id, ref, players, game.template)
      b.party.fields[F.parties.participations] = b.parts.map((x) => x.id)
      for (const pl of players) b.players.set(pl.id, { id: pl.id, createdTime: '', fields: { [F.players.name]: pl.name } })
    }
    await recordEvent(db, { action: 'partie_creee', origin: 'app', visitorId: deviceId!, partyId: retried.id, playerId: me.id, eventId: `partie_creee-${retried.id}`, retry: true })
    return toDTO(b, true)
  }

  const now = new Date()
  const ref = partyRef(game.name, now)
  const [party] = await db.create(T.parties, [
    {
      [F.parties.ref]: ref,
      [F.parties.game]: [game.id],
      [F.parties.creator]: [me.id],
      [F.parties.status]: 'en cours',
      [F.parties.createdAt]: now.toISOString(),
      [F.parties.template]: game.template,
      [F.parties.rounds]: 1,
      [F.parties.creationSeconds]: Math.max(0, Math.round(Number(input.creationSeconds) || 0)),
      [F.parties.shareToken]: newShareToken(),
    },
  ])
  const parts = await createParticipations(db, party!.id, ref, players, game.template)
  await recordEvent(db, { action: 'partie_creee', origin: 'app', visitorId: deviceId!, partyId: party!.id, playerId: me.id, eventId: `partie_creee-${party!.id}` })

  party!.fields[F.parties.participations] = parts.map((p) => p.id)
  const playerRecs = new Map<string, AirRecord>(
    [...players, me].map((p) => [p.id, { id: p.id, createdTime: '', fields: { [F.players.name]: p.name } }]),
  )
  const gameRec: AirRecord = { id: game.id, createdTime: '', fields: { [F.games.name]: game.name, [F.games.image]: game.image ?? undefined, [F.games.template]: game.template } }
  return toDTO({ party: party!, parts, players: playerRecs, game: gameRec }, true)
}

// ---------- sheet ----------

function sheetUpdates(b: Bundle, s: SheetInput, winners: string[] | null, template: Template, rounds: number) {
  return b.parts.map((p) => {
    const scores = template === 'vainqueur seulement' ? [] : cleanScores(s.scores?.[p.id] ?? parseScores(p.fields[F.participations.scores]), rounds)
    const fields: Record<string, unknown> = {
      [F.participations.scores]: template === 'vainqueur seulement' ? '' : JSON.stringify(scores),
      [F.participations.total]: template === 'vainqueur seulement' ? null : computeTotal(scores),
    }
    // null = leave winners untouched (round-score sheets decide winners at finish).
    if (winners) fields[F.participations.winner] = winners.includes(p.id)
    return { id: p.id, fields }
  })
}

function readSheet(s: SheetInput): { template: Template; rounds: number } {
  const template: Template = s?.template === 'vainqueur seulement' ? 'vainqueur seulement' : 'scores par manche'
  const rounds = Math.min(MAX_ROUNDS, Math.max(1, Math.trunc(Number(s?.rounds) || 1)))
  return { template, rounds }
}

async function writeSheet(db: Db, b: Bundle, s: SheetInput, winners: string[] | null, extraPartyFields: Record<string, unknown> = {}) {
  const { template, rounds } = readSheet(s)
  const updated = await db.update(T.participations, sheetUpdates(b, s, winners, template, rounds))
  const [party] = await db.update(T.parties, [{ id: b.party.id, fields: { [F.parties.template]: template, [F.parties.rounds]: rounds, ...extraPartyFields } }])
  if (b.game && toGame(b.game).template !== template) {
    await setGameTemplate(db, b.game.id, template)
    b.game.fields[F.games.template] = template
  }
  b.party = { ...b.party, fields: { ...b.party.fields, ...party!.fields } }
  b.parts = b.parts.map((p) => {
    const u = updated.find((x) => x.id === p.id)
    return u ? { ...p, fields: { ...p.fields, ...u.fields } } : p
  })
}

const validWinners = (b: Bundle, winners: unknown): string[] => (Array.isArray(winners) ? winners.filter((w): w is string => b.parts.some((p) => p.id === w)) : [])

export async function saveSheet(db: Db, deviceId: string | null, partyId: string, s: SheetInput): Promise<PartyDTO> {
  const { party } = await loadOwned(db, deviceId, partyId)
  if (party.fields[F.parties.status] === 'terminée') throw new HttpError(409, 'already_finished', 'Cette partie est déjà terminée.')
  const b = await loadBundle(db, party)
  const winners = readSheet(s).template === 'vainqueur seulement' ? validWinners(b, s?.winners) : null
  await writeSheet(db, b, s, winners)
  return toDTO(b, true)
}

// ---------- highlight ----------

/**
 * Best total of a player on a game over previous finished parties. Parties that look like a
 * duplicate of the current one (same total, finished within 30 minutes) are ignored.
 */
export async function previousBestOf(db: Db, playerId: string, gameId: string, current: { partyId: string; total: number; finishedAt: Date }): Promise<number | null> {
  const [player] = await db.getByIds(T.players, [playerId])
  const parts = await db.getByIds(T.participations, ids(player?.fields[F.players.participations]))
  const partyIds = parts.map((p) => ids(p.fields[F.participations.party])[0]).filter((id): id is string => !!id && id !== current.partyId)
  const parties = new Map((await db.getByIds(T.parties, partyIds)).map((p) => [p.id, p]))
  let best: number | null = null
  for (const part of parts) {
    const party = parties.get(ids(part.fields[F.participations.party])[0] ?? '')
    if (!party || party.fields[F.parties.status] !== 'terminée' || !ids(party.fields[F.parties.game]).includes(gameId)) continue
    const total = part.fields[F.participations.total]
    if (typeof total !== 'number') continue
    const finished = Date.parse(str(party.fields[F.parties.finishedAt]))
    if (total === current.total && Math.abs(current.finishedAt.getTime() - finished) < DUPLICATE_WINDOW_MS) continue
    best = best === null ? total : Math.max(best, total)
  }
  return best
}

// Highlights stored before the French typography pass use ' and plain spaces: compare without them.
const plainTypography = (s: string | null) => s?.replace(/’/g, "'").replace(/[  ]/g, ' ') ?? null
const sameTypography = (a: string | null, b: string | null) => plainTypography(a) === plainTypography(b)

async function autoHighlight(db: Db, dto: PartyDTO): Promise<string | null> {
  const players = dto.players.map((p) => ({ id: p.participationId, name: p.name, total: p.total }))
  const winnerIds = dto.players.filter((p) => p.winner).map((p) => p.participationId)
  let previousBestOfWinner: number | null = null
  const single = winnerIds.length === 1 ? dto.players.find((p) => p.participationId === winnerIds[0]) : undefined
  if (dto.template === 'scores par manche' && single && typeof single.total === 'number' && dto.game.id) {
    previousBestOfWinner = await previousBestOf(db, single.playerId, dto.game.id, {
      partyId: dto.id,
      total: single.total,
      finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : new Date(),
    })
  }
  return buildHighlight({ template: dto.template, gameName: dto.game.name, players, winnerIds, previousBestOfWinner })
}

// ---------- finish ----------

export async function finishParty(db: Db, deviceId: string | null, partyId: string, s: SheetInput): Promise<PartyDTO> {
  const { playerId, party } = await loadOwned(db, deviceId, partyId)
  const b = await loadBundle(db, party)
  const event = { action: 'partie_terminee' as const, origin: 'app' as const, visitorId: deviceId!, partyId, playerId, eventId: `partie_terminee-${partyId}` }
  if (party.fields[F.parties.status] === 'terminée') {
    // Idempotent: a retry (lost response, earlier partial failure) gets the souvenir and the event is ensured.
    await recordEvent(db, { ...event, retry: true })
    return toDTO(b, true)
  }
  const { template, rounds } = readSheet(s)
  let winners = validWinners(b, s?.winners)
  if (winners.length === 0 && template === 'scores par manche') {
    winners = preselectWinners(b.parts.map((p) => ({ id: p.id, total: computeTotal(cleanScores(s?.scores?.[p.id], rounds)) })))
  }
  const finishedAt = new Date().toISOString()
  await writeSheet(db, b, s, winners)
  const dto = toDTO(b, true)
  dto.status = 'terminée'
  dto.finishedAt = finishedAt
  dto.highlight = await autoHighlight(db, dto)
  // Status, finish date and highlight land together, so a failure before this line leaves the party resumable.
  await db.update(T.parties, [{ id: partyId, fields: { [F.parties.status]: 'terminée', [F.parties.finishedAt]: finishedAt, [F.parties.highlight]: dto.highlight ?? '' } }])
  await recordEvent(db, event)
  return dto
}

// ---------- souvenir corrections ----------

export async function updateSouvenir(
  db: Db,
  deviceId: string | null,
  partyId: string,
  p: { scores?: Record<string, Scores>; winners?: string[]; highlight?: string },
): Promise<PartyDTO> {
  const { party } = await loadOwned(db, deviceId, partyId)
  const b = await loadBundle(db, party)
  const before = toDTO(b, true)

  if (typeof p.highlight === 'string') {
    const text = p.highlight.trim().slice(0, MAX_HIGHLIGHT)
    await db.update(T.parties, [{ id: partyId, fields: { [F.parties.highlight]: text } }])
    b.party.fields[F.parties.highlight] = text
  }

  if (p.scores || p.winners) {
    const wasAuto = sameTypography(await autoHighlight(db, before), before.highlight)
    const winners = p.winners ? validWinners(b, p.winners) : before.players.filter((x) => x.winner).map((x) => x.participationId)
    const scores = Object.fromEntries(b.parts.map((x) => [x.id, p.scores?.[x.id] ?? parseScores(x.fields[F.participations.scores])]))
    await writeSheet(db, b, { template: before.template, rounds: before.rounds, scores, winners }, winners)
    if (wasAuto && typeof p.highlight !== 'string') {
      const next = await autoHighlight(db, toDTO(b, true))
      await db.update(T.parties, [{ id: partyId, fields: { [F.parties.highlight]: next ?? '' } }])
      b.party.fields[F.parties.highlight] = next ?? ''
    }
  }
  return toDTO(b, true)
}

// ---------- photos ----------

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PHOTO_BASE64 = Math.ceil((5 * 1024 * 1024 * 4) / 3)

export async function addPhoto(db: Db, deviceId: string | null, partyId: string, file: { base64: string; contentType: string; filename: string }): Promise<PartyDTO> {
  if (!file || !PHOTO_TYPES.has(file.contentType) || typeof file.base64 !== 'string' || !file.base64) {
    throw new HttpError(400, 'bad_request', 'Ce fichier n’est pas une photo.')
  }
  if (file.base64.length > MAX_PHOTO_BASE64) throw new HttpError(413, 'too_large', 'Cette photo est trop lourde.')
  const { party } = await loadOwned(db, deviceId, partyId)
  if (((party.fields[F.parties.photos] as unknown[] | undefined) ?? []).length >= 3) {
    throw new HttpError(409, 'photo_limit', '3 photos maximum par partie.')
  }
  const filename = (file.filename || 'photo.jpg').replace(/[^\w.-]/g, '_').slice(0, 60)
  await db.uploadAttachment(partyId, F.parties.photos, { base64: file.base64, contentType: file.contentType, filename })
  return toDTO(await loadBundle(db, await loadParty(db, partyId)), true)
}

// ---------- reading ----------

export async function getParty(db: Db, deviceId: string | null, partyId: string): Promise<PartyDTO> {
  const { party } = await loadOwned(db, deviceId, partyId)
  return toDTO(await loadBundle(db, party), true)
}

export async function getSharedParty(db: Db, token: string): Promise<PartyDTO> {
  if (!/^[A-Za-z0-9]{12}$/.test(token)) throw new HttpError(404, 'not_found', 'Ce souvenir n’existe pas ou plus.')
  const [party] = await db.list(T.parties, { filterByFormula: byFieldEquals(F.parties.shareToken, token), maxRecords: 1 })
  if (!party) throw new HttpError(404, 'not_found', 'Ce souvenir n’existe pas ou plus.')
  return toDTO(await loadBundle(db, party), false)
}

export async function listParties(db: Db, deviceId: string | null, status?: PartyStatus): Promise<PartySummaryDTO[]> {
  const player = await requirePlayerRecord(db, deviceId)
  const parties = (await db.getByIds(T.parties, ids(player.fields[F.players.createdParties]))).filter((p) => !status || p.fields[F.parties.status] === status)
  if (parties.length === 0) return []
  const parts = await db.getByIds(T.participations, parties.flatMap((p) => ids(p.fields[F.parties.participations])))
  const [players, games] = await Promise.all([
    db.getByIds(T.players, parts.flatMap((p) => ids(p.fields[F.participations.player]))),
    db.getByIds(T.games, parties.flatMap((p) => ids(p.fields[F.parties.game]))),
  ])
  const nameOf = new Map(players.map((p) => [p.id, str(p.fields[F.players.name])]))
  const gameOf = new Map(games.map((g) => [g.id, toGame(g)]))
  const out = parties.map((p): PartySummaryDTO => {
    const own = parts.filter((x) => ids(p.fields[F.parties.participations]).includes(x.id))
    const photos = (p.fields[F.parties.photos] as Attachment[] | undefined) ?? []
    const game = gameOf.get(ids(p.fields[F.parties.game])[0] ?? '')
    return {
      id: p.id,
      status: (p.fields[F.parties.status] as PartyStatus | undefined) ?? 'en cours',
      template: (p.fields[F.parties.template] as Template | undefined) ?? 'scores par manche',
      rounds: typeof p.fields[F.parties.rounds] === 'number' ? (p.fields[F.parties.rounds] as number) : 1,
      createdAt: str(p.fields[F.parties.createdAt]) || p.createdTime,
      finishedAt: str(p.fields[F.parties.finishedAt]) || null,
      game: { name: game?.name ?? 'Jeu', image: game?.image ?? null },
      playerCount: own.length,
      winnerNames: own.filter((x) => x.fields[F.participations.winner] === true).map((x) => nameOf.get(ids(x.fields[F.participations.player])[0] ?? '') ?? ''),
      photoCount: photos.length,
      firstPhotoThumb: photos[0] ? (photos[0].thumbnails?.large?.url ?? photos[0].url) : null,
    }
  })
  const key = (x: PartySummaryDTO) => Date.parse(x.finishedAt ?? x.createdAt)
  return out.sort((a, b) => key(b) - key(a))
}
