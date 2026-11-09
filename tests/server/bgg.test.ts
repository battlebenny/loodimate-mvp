import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { searchGames } from '../../server/core/bgg.js'

const env = { AIRTABLE_API_TOKEN: 'a', AIRTABLE_BASE_ID: 'b', BGG_API_TOKEN: 'bggtok' }
const fx = (n: string) => readFileSync(new URL(`../fixtures/${n}`, import.meta.url), 'utf8')

function fetchWith(...bodies: (string | Response)[]) {
  return vi.fn(async () => {
    const b = bodies.shift()!
    return typeof b === 'string' ? new Response(b, { status: 200 }) : b
  })
}

describe('searchGames', () => {
  it('returns at most 6 decoded results, best matches first, with images from thing', async () => {
    const f = fetchWith(fx('bgg-search.xml'), fx('bgg-thing.xml'))
    const out = await searchGames('azul', env, f as unknown as typeof fetch)
    expect(out).toHaveLength(6)
    expect(out[0]).toEqual({ bggId: 230802, name: 'Azul', year: 2017, image: 'https://cf.geekdo-images.com/azul.jpg', thumb: 'https://cf.geekdo-images.com/azul_t.jpg' })
    expect(out.map((g) => g.name)).toContain("Azul : Pavillon d'été")
    expect(out.map((g) => g.name)).not.toContain('Dazul & Co')
    expect(out.find((g) => g.bggId === 1003)!.image).toBe('https://cf.geekdo-images.com/mini.jpg')
    expect(out.find((g) => g.bggId === 287954)!.image).toBeNull()
  })

  it('calls search then thing with the bearer token and comma separated ids', async () => {
    const f = fetchWith(fx('bgg-search.xml'), fx('bgg-thing.xml'))
    await searchGames('azul', env, f as unknown as typeof fetch)
    const calls = f.mock.calls as unknown as [string, RequestInit][]
    expect(calls[0]![0]).toBe('https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=azul')
    expect(calls[1]![0]).toMatch(/^https:\/\/boardgamegeek\.com\/xmlapi2\/thing\?id=(\d+,){5}\d+$/)
    for (const c of calls) expect((c[1].headers as Record<string, string>).Authorization).toBe('Bearer bggtok')
  })

  it('skips the network for queries shorter than 2 characters', async () => {
    const f = fetchWith()
    expect(await searchGames(' a ', env, f as unknown as typeof fetch)).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })

  it('returns [] when BGG fails or queues the request', async () => {
    expect(await searchGames('azul', env, fetchWith(new Response('', { status: 500 })) as unknown as typeof fetch)).toEqual([])
    expect(await searchGames('azul', env, fetchWith(new Response('', { status: 202 })) as unknown as typeof fetch)).toEqual([])
    expect(await searchGames('azul', env, vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch)).toEqual([])
  })

  it('keeps results without images when thing fails', async () => {
    const out = await searchGames('azul', env, fetchWith(fx('bgg-search.xml'), new Response('', { status: 500 })) as unknown as typeof fetch)
    expect(out).toHaveLength(6)
    expect(out.every((g) => g.image === null && g.thumb === null)).toBe(true)
  })
})
