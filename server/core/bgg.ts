import type { Env } from './env.js'
import type { BggGame } from '../../shared/types.js'

const API = 'https://boardgamegeek.com/xmlapi2'

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** 0 = exact, 1 = starts with, 2 = a word starts with, null = not relevant. */
function rank(name: string, q: string): number | null {
  const n = fold(name)
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (new RegExp(`(^|[^a-z0-9])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(n)) return 2
  return null
}

async function getXml(url: string, env: Env, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${env.BGG_API_TOKEN}` } })
    if (res.status !== 200) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function searchGames(query: string, env: Env, fetchImpl: typeof fetch = fetch): Promise<BggGame[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const xml = await getXml(`${API}/search?type=boardgame&query=${encodeURIComponent(q)}`, env, fetchImpl)
  if (!xml) return []
  const fq = fold(q)
  const found: (BggGame & { r: number })[] = []
  for (const m of xml.matchAll(/<item\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g)) {
    const name = decode(m[2]!.match(/<name\b[^>]*\bvalue="([^"]*)"/)?.[1] ?? '')
    const year = m[2]!.match(/<yearpublished\b[^>]*\bvalue="(\d+)"/)?.[1]
    const r = name ? rank(name, fq) : null
    if (r === null) continue
    found.push({ bggId: Number(m[1]), name, year: year ? Number(year) : null, image: null, thumb: null, r })
  }
  const top = found.sort((a, b) => a.r - b.r || a.name.length - b.name.length || (b.year ?? 0) - (a.year ?? 0)).slice(0, 6)
  if (top.length === 0) return []

  const thing = await getXml(`${API}/thing?id=${top.map((g) => g.bggId).join(',')}`, env, fetchImpl)
  const images = new Map<number, { image: string | null; thumb: string | null }>()
  if (thing) {
    for (const m of thing.matchAll(/<item\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g)) {
      const img = m[2]!.match(/<image>\s*([^<]+?)\s*<\/image>/)?.[1]
      const thumb = m[2]!.match(/<thumbnail>\s*([^<]+?)\s*<\/thumbnail>/)?.[1]
      images.set(Number(m[1]), { image: img ? decode(img) : null, thumb: thumb ? decode(thumb) : null })
    }
  }
  return top.map(({ r: _r, ...g }) => ({ ...g, image: images.get(g.bggId)?.image ?? null, thumb: images.get(g.bggId)?.thumb ?? null }))
}
