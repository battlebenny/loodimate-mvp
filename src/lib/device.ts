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

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

export function isIosSafariNotInstalled(): boolean {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  return ios && !isStandalone()
}
