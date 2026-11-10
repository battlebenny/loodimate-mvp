import type { PlayerDTO } from '../../shared/types'

const DEVICE = 'mate.deviceId'
const PLAYER = 'mate.player'
const VISITOR = 'mate.visitorId'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: identity lasts for this session only */
  }
}

export function getDeviceId(): string | null {
  return read(DEVICE)
}

/** Returns the stored device id, creating one if needed (first launch). */
export function ensureDeviceId(): string {
  const existing = read(DEVICE)
  if (existing) return existing
  const id = crypto.randomUUID()
  write(DEVICE, id)
  return id
}

export function setDeviceId(id: string) {
  write(DEVICE, id)
}

export function setIdentity(deviceId: string, player: PlayerDTO) {
  write(DEVICE, deviceId)
  write(PLAYER, JSON.stringify(player))
}

export function getPlayer(): PlayerDTO | null {
  const raw = read(PLAYER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PlayerDTO
  } catch {
    return null
  }
}

export function clearPlayer() {
  write(PLAYER, null)
}

/** Onboarded devices reuse their device id so the creator's reopenings can be excluded from H2. */
export function getVisitorId(): string {
  if (getPlayer()) {
    const d = getDeviceId()
    if (d) return d
  }
  const existing = read(VISITOR)
  if (existing) return existing
  const id = crypto.randomUUID()
  write(VISITOR, id)
  return id
}

/**
 * Visitor id for the shared souvenir view: a Loodi-mate device id found in this browser wins
 * (the server then links the event to its player), so an onboarded player opening the link
 * in the same browser as the app is not counted as a separate visitor. Otherwise anonymous id.
 * Known limit: an installed iOS PWA does not share storage with Safari.
 */
export function getLinkVisitorId(): string {
  return getDeviceId() ?? getVisitorId()
}
