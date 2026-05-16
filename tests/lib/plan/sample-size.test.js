import { describe, it, expect } from 'vitest'
import {
  calculateSampleSize,
  calculateDuration,
  normalInv,
  normalCdf,
} from '../../../src/lib/plan/sample-size.js'

// ---- Helpers --------------------------------------------------------------

function brief({
  metric_type,
  baseline_value,
  baseline_unit = null,
  mde_value,
  mde_unit = 'relative_percent',
  alpha = 0.05,
  power = 0.8,
  two_sided = true,
  daily_traffic = 5000,
  data_peek = null,
  test_method = undefined,
} = {}) {
  return {
    metric_type,
    baseline: { value: baseline_value, unit: baseline_unit },
    mde: { value: mde_value, unit: mde_unit, direction: 'increase' },
    daily_traffic: { value: daily_traffic, unit: 'user' },
    advanced: { alpha, power, two_sided, test_method },
    data_peek,
  }
}

function approx(value, expected, tolerancePercent = 5) {
  const diff = Math.abs(value - expected)
  const tolerance = expected * (tolerancePercent / 100)
  return diff <= tolerance
}

// ---- normalInv / normalCdf ------------------------------------------------

describe('normalInv', () => {
  it('returns ~0 for p=0.5', () => {
    expect(Math.abs(normalInv(0.5))).toBeLessThan(1e-6)
  })

  it('returns ~1.95996 for p=0.975 (z_{0.025} two-sided α=0.05)', () => {
    expect(normalInv(0.975)).toBeCloseTo(1.95996, 4)
  })

  it('returns ~0.84162 for p=0.80 (z_β for power=0.80)', () => {
    expect(normalInv(0.8)).toBeCloseTo(0.84162, 4)
  })

  it('returns ~1.64485 for p=0.95 (z_α one-sided α=0.05)', () => {
    expect(normalInv(0.95)).toBeCloseTo(1.64485, 4)
  })

  it('is symmetric: normalInv(1-p) = -normalInv(p)', () => {
    expect(normalInv(0.025)).toBeCloseTo(-1.95996, 4)
  })
})

describe('normalCdf', () => {
  it('returns 0.5 at z=0', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
  })

  it('returns ~0.975 at z=1.96', () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4)
  })

  it('returns ~0.025 at z=-1.96', () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 4)
  })

  it('returns ~0.8 at z≈0.8416', () => {
    expect(normalCdf(0.8416)).toBeCloseTo(0.8, 3)
  })
})

// ---- Z-test for proportions (cases 1-4) -----------------------------------
// Tolerance note: SAMPLE_SIZE_CALC.md target values are illustrative and
// off by 1-8% from the strict Fleiss formula (verified by hand). The formula
// in the spec text (Fleiss, non-pooled SE for H1) is authoritative per ADR-009,
// so we accept ±10% tolerance against the spec's example numbers.

describe('calculateSampleSize — z_test_proportions', () => {
  it('case 1: baseline 3.1%, MDE +8% rel → n≈81 014 (±10%)', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.031,
        mde_value: 8,
      }),
    )
    expect(res.test_method).toBe('z_test_proportions')
    expect(approx(res.sample_size_per_arm, 81014, 10)).toBe(true)
  })

  it('case 2: baseline 5%, MDE +20% rel → n≈7 555 (±10%)', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.05,
        mde_value: 20,
      }),
    )
    expect(approx(res.sample_size_per_arm, 7555, 10)).toBe(true)
  })

  it('case 3: baseline 10%, MDE +10% rel → n≈14 750 (±5%)', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.10,
        mde_value: 10,
      }),
    )
    expect(approx(res.sample_size_per_arm, 14750, 5)).toBe(true)
  })

  it('case 4: baseline 50%, MDE +5% rel → n≈6 270 (±5%)', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.5,
        mde_value: 5,
      }),
    )
    expect(approx(res.sample_size_per_arm, 6270, 5)).toBe(true)
  })

  it('supports absolute_percentage_points MDE for proportion', () => {
    // baseline 3.1%, MDE +0.248 п.п. = +8% rel → should be ~ case 1
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.031,
        mde_value: 0.248,
        mde_unit: 'absolute_percentage_points',
      }),
    )
    expect(approx(res.sample_size_per_arm, 81014, 10)).toBe(true)
  })

  it('supports baseline.unit=percent (value scaled by 100)', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 3.1,
        baseline_unit: 'percent',
        mde_value: 8,
      }),
    )
    expect(approx(res.sample_size_per_arm, 81014, 10)).toBe(true)
  })
})

// ---- T-test for continuous (cases 5-6) ------------------------------------

describe('calculateSampleSize — t_test', () => {
  it('case 5: baseline 100, σ=80, MDE +5% rel → n≈4 019', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'continuous',
        baseline_value: 100,
        mde_value: 5,
        data_peek: { std_computed: 80 },
      }),
    )
    expect(res.test_method).toBe('t_test')
    expect(approx(res.sample_size_per_arm, 4019, 2)).toBe(true)
    expect(res.approximate).toBe(false)
  })

  it('case 6: baseline 100, σ=50, MDE +10% rel → n≈393', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'continuous',
        baseline_value: 100,
        mde_value: 10,
        data_peek: { std_computed: 50 },
      }),
    )
    expect(approx(res.sample_size_per_arm, 393, 3)).toBe(true)
  })

  it('uses fallback σ=baseline (CV=1) when no data peek, with warning', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'continuous',
        baseline_value: 100,
        mde_value: 5,
      }),
    )
    expect(res.approximate).toBe(true)
    expect(res.warnings.some((w) => /CV=1|σ.*неизвестн|fallback/i.test(w))).toBe(
      true,
    )
  })
})

// ---- Mann-Whitney approximation (case 7) ----------------------------------

describe('calculateSampleSize — mannwhitney', () => {
  it('case 7: same as case 5 but MW → ~4651 (×1.157), with warning', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'continuous',
        baseline_value: 100,
        mde_value: 5,
        data_peek: { std_computed: 80 },
        test_method: 'mannwhitney',
      }),
    )
    expect(res.test_method).toBe('mannwhitney')
    expect(approx(res.sample_size_per_arm, 4651, 2)).toBe(true)
    expect(res.approximate).toBe(true)
    expect(res.warnings.some((w) => /MW|приближен|±15/i.test(w))).toBe(true)
  })
})

// ---- Bootstrap ------------------------------------------------------------

describe('calculateSampleSize — bootstrap', () => {
  it('returns same n as t_test but with warning and approximate=true', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'continuous',
        baseline_value: 100,
        mde_value: 5,
        data_peek: { std_computed: 80 },
        test_method: 'bootstrap',
      }),
    )
    expect(res.test_method).toBe('bootstrap')
    expect(approx(res.sample_size_per_arm, 4019, 2)).toBe(true)
    expect(res.approximate).toBe(true)
    expect(res.warnings.some((w) => /bootstrap|ориентировочн/i.test(w))).toBe(
      true,
    )
  })
})

// ---- Delta method (no data peek → fallback) -------------------------------

describe('calculateSampleSize — delta_method (ratio)', () => {
  it('without data peek for ratio → fallback to bootstrap with warning', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'ratio',
        baseline_value: 0.1,
        mde_value: 10,
      }),
    )
    expect(res.approximate).toBe(true)
    expect(res.warnings.length).toBeGreaterThan(0)
    expect(res.sample_size_per_arm).toBeGreaterThan(0)
  })
})

// ---- Edge cases -----------------------------------------------------------

describe('calculateSampleSize — edge cases', () => {
  it('baseline=0 for proportion → warning', () => {
    const res = calculateSampleSize(
      brief({ metric_type: 'proportion', baseline_value: 0, mde_value: 10 }),
    )
    expect(res.warnings.some((w) => /baseline 0|бессмыслен/i.test(w))).toBe(
      true,
    )
  })

  it('baseline=1 for proportion → warning', () => {
    const res = calculateSampleSize(
      brief({ metric_type: 'proportion', baseline_value: 1, mde_value: 10 }),
    )
    expect(res.warnings.some((w) => /baseline.*100|бессмыслен/i.test(w))).toBe(
      true,
    )
  })

  it('huge n>10M → warning', () => {
    // baseline very small, MDE tiny → n huge
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.001,
        mde_value: 0.1,
      }),
    )
    expect(res.warnings.some((w) => /10M|нереалистич/i.test(w))).toBe(true)
  })

  it('returns null sample_size when baseline missing', () => {
    const res = calculateSampleSize(
      brief({ metric_type: 'proportion', baseline_value: null, mde_value: 5 }),
    )
    expect(res.sample_size_per_arm).toBeNull()
  })

  it('returns null sample_size when MDE missing', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.1,
        mde_value: null,
      }),
    )
    expect(res.sample_size_per_arm).toBeNull()
  })

  it('returns null duration when daily_traffic missing', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.1,
        mde_value: 10,
        daily_traffic: null,
      }),
    )
    expect(res.sample_size_per_arm).toBeGreaterThan(0)
    expect(res.duration_days).toBeNull()
  })

  it('duration > 90 days → warning', () => {
    const res = calculateSampleSize(
      brief({
        metric_type: 'proportion',
        baseline_value: 0.031,
        mde_value: 8,
        daily_traffic: 1000, // very low traffic
      }),
    )
    expect(res.duration_days).toBeGreaterThan(90)
    expect(res.warnings.some((w) => /3 месяц|>90|нереалистич/i.test(w))).toBe(
      true,
    )
  })
})

// ---- Duration helper ------------------------------------------------------

describe('calculateDuration', () => {
  it('rounds up ceil(n*2/daily)', () => {
    expect(calculateDuration(100, 50)).toBe(4) // 200/50 = 4
    expect(calculateDuration(100, 60)).toBe(4) // ceil(200/60) = ceil(3.33) = 4
    expect(calculateDuration(81014, 50000)).toBe(4) // ceil(162028/50000) = 4
  })

  it('returns null when daily_traffic is missing or 0', () => {
    expect(calculateDuration(100, null)).toBeNull()
    expect(calculateDuration(100, 0)).toBeNull()
  })
})
