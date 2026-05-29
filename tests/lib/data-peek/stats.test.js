import { describe, it, expect } from 'vitest'
import {
  skewness,
  kurtosis,
  deltaMethodVariance,
  dailyCV,
  distributionLabel,
} from '../../../src/lib/data-peek/stats.js'

// Deterministic normal-ish sample using Box-Muller from a fixed seed via LCG.
function lcg(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}
function normalSample(n, mu = 0, sigma = 1, seed = 42) {
  const rand = lcg(seed)
  const out = []
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.max(rand(), 1e-12)
    const u2 = rand()
    const r = Math.sqrt(-2 * Math.log(u1))
    out.push(mu + sigma * r * Math.cos(2 * Math.PI * u2))
    if (out.length < n)
      out.push(mu + sigma * r * Math.sin(2 * Math.PI * u2))
  }
  return out
}

describe('skewness', () => {
  it('returns ~0 for a normal sample', () => {
    const sample = normalSample(2000, 0, 1, 7)
    const sk = skewness(sample)
    expect(Math.abs(sk)).toBeLessThan(0.2)
  })

  it('is positive for a log-normal sample (right-skewed)', () => {
    const sample = normalSample(2000, 0, 1, 11).map((x) => Math.exp(x))
    const sk = skewness(sample)
    expect(sk).toBeGreaterThan(0.5)
  })

  it('is negative for a left-skewed sample', () => {
    // Mirror a log-normal around 0.
    const sample = normalSample(2000, 0, 1, 13).map((x) => -Math.exp(x))
    const sk = skewness(sample)
    expect(sk).toBeLessThan(-0.5)
  })

  it('returns null for arrays with fewer than 3 values', () => {
    expect(skewness([])).toBeNull()
    expect(skewness([1, 2])).toBeNull()
  })
})

describe('kurtosis (excess)', () => {
  it('returns ~0 for a normal sample', () => {
    const sample = normalSample(4000, 0, 1, 23)
    const ku = kurtosis(sample)
    expect(Math.abs(ku)).toBeLessThan(0.4)
  })

  it('is positive for a heavy-tailed sample', () => {
    // Cauchy-ish: ratio of normals → very heavy tail.
    const a = normalSample(2000, 0, 1, 31)
    const b = normalSample(2000, 0, 1, 37).map((x) => (x === 0 ? 1e-6 : x))
    const sample = a.map((x, i) => x / b[i])
    const ku = kurtosis(sample)
    expect(ku).toBeGreaterThan(3)
  })

  it('is negative for a uniform sample (light-tailed)', () => {
    const rand = lcg(41)
    const sample = []
    for (let i = 0; i < 2000; i++) sample.push(rand())
    const ku = kurtosis(sample)
    expect(ku).toBeLessThan(-0.5)
  })
})

describe('deltaMethodVariance', () => {
  it('matches canonical example (μN=10, μD=100, var_n=4, var_d=100, cov=5)', () => {
    // 4/10000 - 2·10·5/1_000_000 + 100·100/100_000_000 = 0.0004 - 0.0001 + 0.0001 = 0.0004
    const v = deltaMethodVariance({
      mean_n: 10,
      mean_d: 100,
      var_n: 4,
      var_d: 100,
      cov_nd: 5,
    })
    expect(v).toBeCloseTo(0.0004, 8)
  })

  it('reduces to var_n / μD² when var_d=0 and cov=0', () => {
    const v = deltaMethodVariance({
      mean_n: 5,
      mean_d: 50,
      var_n: 9,
      var_d: 0,
      cov_nd: 0,
    })
    expect(v).toBeCloseTo(9 / 2500, 10)
  })

  it('returns null when mean_d === 0 or any input is non-finite', () => {
    expect(
      deltaMethodVariance({
        mean_n: 1,
        mean_d: 0,
        var_n: 1,
        var_d: 1,
        cov_nd: 0,
      }),
    ).toBeNull()
    expect(
      deltaMethodVariance({
        mean_n: NaN,
        mean_d: 1,
        var_n: 1,
        var_d: 1,
        cov_nd: 0,
      }),
    ).toBeNull()
  })
})

describe('dailyCV', () => {
  it('stable daily means → CV < 0.3', () => {
    const rows = []
    for (let day = 1; day <= 14; day++) {
      // Each day has 100 observations clustered around 1.0 with tiny noise.
      for (let i = 0; i < 100; i++) {
        rows.push({ day, value: 1 + (i % 5) * 0.001 })
      }
    }
    const { cv, n_days } = dailyCV(rows)
    expect(n_days).toBe(14)
    expect(cv).toBeLessThan(0.3)
  })

  it('volatile daily means → CV > 0.3', () => {
    const rows = []
    for (let day = 1; day <= 10; day++) {
      // Day means range 0.1..10 → very volatile.
      const dayMean = day
      for (let i = 0; i < 50; i++) rows.push({ day, value: dayMean })
    }
    const { cv } = dailyCV(rows)
    expect(cv).toBeGreaterThan(0.3)
  })

  it('returns cv:null when no day column / empty rows', () => {
    expect(dailyCV([]).cv).toBeNull()
    expect(dailyCV([{ value: 1 }, { value: 2 }]).cv).toBeNull()
  })
})

describe('distributionLabel', () => {
  it('returns "ok" for symmetric + light-tailed', () => {
    expect(distributionLabel({ skewness: 0.2, kurtosis: 0.5 })).toBe('ok')
  })

  it('returns "skewed" when |skew| > 1 but kurtosis OK', () => {
    expect(distributionLabel({ skewness: 1.5, kurtosis: 1 })).toBe('skewed')
  })

  it('returns "heavy_tailed" when kurtosis > 3 but skew OK', () => {
    expect(distributionLabel({ skewness: 0.2, kurtosis: 5 })).toBe(
      'heavy_tailed',
    )
  })

  it('returns "skewed_heavy" when both flags trigger', () => {
    expect(distributionLabel({ skewness: 2, kurtosis: 6 })).toBe(
      'skewed_heavy',
    )
  })
})
