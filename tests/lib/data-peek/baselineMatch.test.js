import { describe, it, expect } from 'vitest'
import { baselineMatch } from '../../../src/lib/data-peek/baselineMatch.js'

describe('baselineMatch', () => {
  it('returns true when computed and user are within 10% relative tolerance', () => {
    expect(baselineMatch(0.105, 0.1)).toBe(true)
    expect(baselineMatch(93.12, 100)).toBe(true) // |Δ| = 6.88% < 10%
    expect(baselineMatch(95, 100)).toBe(true)
  })

  it('returns false when outside 10% relative tolerance', () => {
    expect(baselineMatch(93.12, 54)).toBe(false) // Δ ≈ +72%
    expect(baselineMatch(50, 100)).toBe(false)
    expect(baselineMatch(0.2, 0.1)).toBe(false)
  })

  it('returns false at the exact 10% boundary (strict <)', () => {
    // |computed - userInput| / |userInput| === 0.1 → НЕ matches
    expect(baselineMatch(110, 100)).toBe(false)
  })

  it('returns null when either input is missing or not finite', () => {
    expect(baselineMatch(null, 100)).toBe(null)
    expect(baselineMatch(100, null)).toBe(null)
    expect(baselineMatch(undefined, 100)).toBe(null)
    expect(baselineMatch(Number.NaN, 100)).toBe(null)
    expect(baselineMatch(Number.POSITIVE_INFINITY, 100)).toBe(null)
    expect(baselineMatch('100', 100)).toBe(null)
  })

  it('handles userInput=0 via absolute tolerance instead of relative', () => {
    expect(baselineMatch(0, 0)).toBe(true)
    expect(baselineMatch(1e-12, 0)).toBe(true)
    expect(baselineMatch(0.001, 0)).toBe(false)
  })
})
