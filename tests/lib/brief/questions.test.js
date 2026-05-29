import { describe, it, expect } from 'vitest'
import { baselineUnitOptionsFor } from '../../../src/lib/brief/questions.js'

describe('baselineUnitOptionsFor', () => {
  it('returns percent + fraction for proportion', () => {
    const opts = baselineUnitOptionsFor('proportion')
    expect(opts).toEqual([
      { value: 'percent', label: '%' },
      { value: 'fraction', label: 'доля (0-1)' },
    ])
  })

  it('returns percent + fraction + number for ratio', () => {
    const opts = baselineUnitOptionsFor('ratio')
    expect(Array.isArray(opts)).toBe(true)
    expect(opts.map((o) => o.value)).toEqual(['percent', 'fraction', 'number'])
  })

  it('returns per_user for count', () => {
    expect(baselineUnitOptionsFor('count')).toEqual([
      { value: 'per_user', label: 'на юзера' },
    ])
  })

  it('returns null for continuous — Phase F removes the dropdown entirely', () => {
    // Sprint 6 FIX iter 2 Phase F: iter 1 ставило [{value:absolute,label:абс.}],
    // но dropdown с одной опцией бесполезен — для continuous unit (₽/сек/...)
    // никем не используется. BaselineInput рендерит только number input.
    expect(baselineUnitOptionsFor('continuous')).toBeNull()
  })

  it('returns null when metric_type is not set yet', () => {
    expect(baselineUnitOptionsFor(null)).toBeNull()
    expect(baselineUnitOptionsFor(undefined)).toBeNull()
  })
})
