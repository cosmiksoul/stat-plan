import { describe, it, expect } from 'vitest'
import { srmCheck, sanityCheck } from '../../../src/lib/results/checks.js'

describe('srmCheck', () => {
  it('balanced 5000/5000 → pass, p=1', () => {
    const res = srmCheck({ control_n: 5000, treatment_n: 5000 })
    expect(res.pass).toBe(true)
    expect(res.pvalue).toBeCloseTo(1, 2)
    expect(res.total).toBe(10000)
  })

  it('mild deviation 5050/4950 → pass (p ≈ 0.32)', () => {
    const res = srmCheck({ control_n: 5050, treatment_n: 4950 })
    expect(res.pass).toBe(true)
    expect(res.pvalue).toBeGreaterThan(0.2)
    expect(res.pvalue).toBeLessThan(0.5)
  })

  it('severe imbalance 5500/4500 → fail (p ≈ 0)', () => {
    const res = srmCheck({ control_n: 5500, treatment_n: 4500 })
    expect(res.pass).toBe(false)
    expect(res.pvalue).toBeLessThan(0.001)
  })

  it('zero counts → null', () => {
    const res = srmCheck({ control_n: 0, treatment_n: 100 })
    expect(res.pass).toBeNull()
    expect(res.pvalue).toBeNull()
  })

  it('missing args → null', () => {
    const res = srmCheck({})
    expect(res.pass).toBeNull()
  })
})

describe('sanityCheck', () => {
  const planBase = {
    derived: { sample_size_per_arm: 5000 },
    brief: { mde: { direction: 'increase' } },
    mde: { direction: 'increase' },
  }

  it('total_n match when observed ≈ 2× planned per arm', () => {
    const res = sanityCheck({
      results: { control_n: 5000, treatment_n: 5050 },
      plan: planBase,
    })
    expect(res.total_n_match).toBe(true)
  })

  it('total_n mismatch when observed off by >10%', () => {
    const res = sanityCheck({
      results: { control_n: 3000, treatment_n: 3000 },
      plan: planBase,
    })
    expect(res.total_n_match).toBe(false)
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  it('direction match when delta positive and direction=increase', () => {
    const res = sanityCheck({
      results: { control_n: 5000, treatment_n: 5000, delta_rel: 2.5 },
      plan: planBase,
    })
    expect(res.direction_match).toBe(true)
  })

  it('direction mismatch when delta negative and direction=increase', () => {
    const res = sanityCheck({
      results: { control_n: 5000, treatment_n: 5000, delta_rel: -1.2 },
      plan: planBase,
    })
    expect(res.direction_match).toBe(false)
    expect(res.warnings.join(' ')).toMatch(/направ/i)
  })

  it('direction is null when direction=any', () => {
    const res = sanityCheck({
      results: { control_n: 5000, treatment_n: 5000, delta_rel: 2.5 },
      plan: {
        derived: { sample_size_per_arm: 5000 },
        brief: { mde: { direction: 'any' } },
      },
    })
    expect(res.direction_match).toBeNull()
  })

  it('missing plan/results → all nulls, no crash', () => {
    expect(sanityCheck({}).total_n_match).toBeNull()
    expect(sanityCheck({ results: null, plan: null }).direction_match).toBeNull()
  })
})
