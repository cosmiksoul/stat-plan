import { describe, it, expect } from 'vitest'
import { buildManualDataPeek } from '../../../src/lib/data-peek/calculator.js'

function brief(over = {}) {
  return {
    metric_type: 'continuous',
    metric_column: 'order_amount',
    baseline: { value: 100, unit: null },
    ...over,
  }
}

describe('buildManualDataPeek', () => {
  it('continuous: stores σ from fields', () => {
    const res = buildManualDataPeek({
      metric_type: 'continuous',
      fields: { sigma: 80 },
      brief: brief(),
    })
    expect(res.ok).toBe(true)
    expect(res.source).toBe('manual')
    expect(res.std_computed).toBe(80)
    expect(res.uploaded).toBe(true)
  })

  it('continuous: rejects σ ≤ 0', () => {
    const res = buildManualDataPeek({
      metric_type: 'continuous',
      fields: { sigma: 0 },
      brief: brief(),
    })
    expect(res.ok).toBe(false)
    expect(res.errors.sigma).toMatch(/σ > 0/)
  })

  it('count: defaults σ = √baseline (Poisson) when not provided', () => {
    const res = buildManualDataPeek({
      metric_type: 'count',
      fields: {},
      brief: brief({ metric_type: 'count', baseline: { value: 4 } }),
    })
    expect(res.ok).toBe(true)
    expect(res.std_computed).toBeCloseTo(2, 6)
  })

  it('count: accepts manual σ override', () => {
    const res = buildManualDataPeek({
      metric_type: 'count',
      fields: { sigma: 5 },
      brief: brief({ metric_type: 'count', baseline: { value: 4 } }),
    })
    expect(res.ok).toBe(true)
    expect(res.std_computed).toBe(5)
  })

  it('ratio: builds ratio_variance via delta method + sets ratio_mean_*', () => {
    const res = buildManualDataPeek({
      metric_type: 'ratio',
      fields: { mean_n: 10, mean_d: 100, var_n: 4, var_d: 100, cov_nd: 5 },
      brief: brief({
        metric_type: 'ratio',
        ratio_components: { numerator: 'clicks', denominator: 'sessions' },
        baseline: { value: 0.1, unit: 'fraction' },
      }),
    })
    expect(res.ok).toBe(true)
    expect(res.ratio_variance).toBeCloseTo(0.0004, 8)
    expect(res.ratio_mean_numerator).toBe(10)
    expect(res.ratio_mean_denominator).toBe(100)
    expect(res.baseline_computed).toBeCloseTo(0.1, 6)
  })

  it('ratio: rejects var_n < 0', () => {
    const res = buildManualDataPeek({
      metric_type: 'ratio',
      fields: { mean_n: 10, mean_d: 100, var_n: -1, var_d: 1, cov_nd: 0 },
      brief: brief({ metric_type: 'ratio' }),
    })
    expect(res.ok).toBe(false)
    expect(res.errors.var_n).toBeDefined()
  })

  it('proportion: returns error (peek not needed)', () => {
    const res = buildManualDataPeek({
      metric_type: 'proportion',
      fields: {},
      brief: brief({ metric_type: 'proportion' }),
    })
    expect(res.ok).toBe(false)
    expect(res.errors._form).toMatch(/proportion/)
  })
})
