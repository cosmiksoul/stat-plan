import { describe, it, expect } from 'vitest'
import { effectiveResults } from '../../../src/lib/results/effective.js'

// Sprint 8 P-14c — derived % rel CI bounds from control_mean.
describe('effectiveResults — derived pct_rel', () => {
  it('derives ci_*_pct_rel when control_mean is present', () => {
    const eff = effectiveResults({
      raw_results: {
        ci_lower: -1.0631,
        ci_upper: 4.5813,
        control_mean: 106.31,
      },
    })
    expect(eff.ci_lower_pct_rel).toBeCloseTo(-1.0, 3)
    expect(eff.ci_upper_pct_rel).toBeCloseTo(4.31, 2)
  })

  it('omits derived fields when control_mean is absent (backward-compat)', () => {
    const eff = effectiveResults({
      raw_results: { ci_lower: 0.005, ci_upper: 0.041 },
    })
    expect(eff.ci_lower_pct_rel).toBeUndefined()
    expect(eff.ci_upper_pct_rel).toBeUndefined()
  })

  it('omits derived fields when control_mean is 0', () => {
    const eff = effectiveResults({
      raw_results: { ci_lower: 0.005, ci_upper: 0.041, control_mean: 0 },
    })
    expect(eff.ci_lower_pct_rel).toBeUndefined()
  })

  it('user_overrides still win over raw_results', () => {
    const eff = effectiveResults({
      raw_results: { delta_rel: 2.3 },
      user_overrides: { delta_rel: 9.9 },
    })
    expect(eff.delta_rel).toBe(9.9)
  })
})
