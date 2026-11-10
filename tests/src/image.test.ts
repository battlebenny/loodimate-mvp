import { describe, expect, it } from 'vitest'
import { fitWithin } from '../../src/lib/image.js'

describe('fitWithin', () => {
  it('scales the long side down to the max', () => expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 }))
  it('handles portrait photos', () => expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 }))
  it('keeps small images unchanged', () => expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 }))
})
