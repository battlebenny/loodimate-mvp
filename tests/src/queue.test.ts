import { describe, expect, it } from 'vitest'
import { createQueue } from '../../src/lib/queue.js'

const defer = () => {
  let resolve!: () => void
  const p = new Promise<void>((r) => (resolve = r))
  return { p, resolve }
}

describe('createQueue', () => {
  it('runs tasks one after another in order', async () => {
    const q = createQueue()
    const log: string[] = []
    const first = defer()
    const a = q(async () => {
      log.push('a start')
      await first.p
      log.push('a end')
    })
    const b = q(async () => {
      log.push('b')
      return 42
    })
    await Promise.resolve()
    expect(log).toEqual(['a start'])
    first.resolve()
    await a
    expect(await b).toBe(42)
    expect(log).toEqual(['a start', 'a end', 'b'])
  })

  it('keeps going after a failed task', async () => {
    const q = createQueue()
    await expect(q(async () => { throw new Error('x') })).rejects.toThrow('x')
    expect(await q(async () => 'ok')).toBe('ok')
  })
})
