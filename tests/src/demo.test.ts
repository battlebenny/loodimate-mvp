import { describe, expect, it } from 'vitest'
import { readDemoDevice } from '../../src/lib/demo.js'

describe('readDemoDevice', () => {
  it('accepts demo- device ids', () => expect(readDemoDevice('?demo=demo-jedha')).toBe('demo-jedha'))
  it('ignores ids without the demo- prefix', () => expect(readDemoDevice('?demo=14cb6603-eb91')).toBeNull())
  it('ignores malformed ids and missing params', () => {
    expect(readDemoDevice("?demo=demo-<script>")).toBeNull()
    expect(readDemoDevice('')).toBeNull()
  })
})
