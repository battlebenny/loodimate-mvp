import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const store: Record<string, string> = {}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => (store[k] = v),
    removeItem: (k: string) => delete store[k],
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load() {
  return (await import('../../src/lib/track.js')).track
}

describe('track', () => {
  it('returns synchronously without awaiting the network', async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    const track = await load()
    expect(track('cta_clic', { origin: 'lien', partyId: 'recP' })).toBeUndefined()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(body).toMatchObject({ action: 'cta_clic', origin: 'lien', partyId: 'recP' })
    expect(body.eventId).toMatch(/[0-9a-f-]{36}/)
    expect(body.visitorId).toBeTruthy()
  })

  it('retries once with the same id and retry flag after a network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const track = await load()
    track('stats_consultees', { origin: 'app' })
    await vi.advanceTimersByTimeAsync(3100)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = JSON.parse(String(fetchMock.mock.calls[0]![1].body))
    const second = JSON.parse(String(fetchMock.mock.calls[1]![1].body))
    expect(second.eventId).toBe(first.eventId)
    expect(first.retry).toBeUndefined()
    expect(second.retry).toBe(true)
  })

  it('gives up silently after two failures', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const track = await load()
    track('lien_partage', { origin: 'app' })
    await vi.advanceTimersByTimeAsync(10000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalled()
  })
})
