import { describe, it, expect } from 'vitest'
import { parseDataPeekCsv } from '../../../src/lib/data-peek/csv.js'

function brief(over = {}) {
  return {
    metric_type: 'proportion',
    metric_column: 'converted',
    ratio_components: { numerator: null, denominator: null },
    baseline: { value: 0.1, unit: 'fraction' },
    ...over,
  }
}

describe('parseDataPeekCsv — happy paths', () => {
  it('continuous: computes baseline + std + raw_values', () => {
    const text = ['order_amount', '100', '120', '90', '110', '105'].join('\n')
    const res = parseDataPeekCsv(
      text,
      brief({ metric_type: 'continuous', metric_column: 'order_amount', baseline: { value: 105, unit: null } }),
    )
    expect(res.ok).toBe(true)
    expect(res.source).toBe('csv')
    expect(res.baseline_computed).toBeCloseTo(105, 5)
    expect(res.std_computed).toBeGreaterThan(0)
    expect(res.raw_values.length).toBe(5)
    expect(res.baseline_match_user_input).toBe(true)
  })

  it('proportion: computes mean and detects match', () => {
    const text = ['converted', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0'].join('\n')
    const res = parseDataPeekCsv(text, brief({ baseline: { value: 0.5, unit: 'fraction' } }))
    expect(res.ok).toBe(true)
    expect(res.baseline_computed).toBeCloseTo(0.5, 5)
    expect(res.baseline_match_user_input).toBe(true)
  })

  it('ratio: computes baseline, delta_method variance, ratio_mean_*', () => {
    const text = [
      'clicks,sessions',
      '10,100',
      '12,110',
      '8,90',
      '11,105',
    ].join('\n')
    const res = parseDataPeekCsv(
      text,
      brief({
        metric_type: 'ratio',
        ratio_components: { numerator: 'clicks', denominator: 'sessions' },
        baseline: { value: 0.1, unit: 'fraction' },
      }),
    )
    expect(res.ok).toBe(true)
    expect(res.ratio_mean_numerator).toBeCloseTo(10.25, 4)
    expect(res.ratio_mean_denominator).toBeCloseTo(101.25, 4)
    expect(res.ratio_variance).toBeGreaterThanOrEqual(0)
    expect(res.baseline_computed).toBeCloseTo(10.25 / 101.25, 6)
  })

  it('count: computes std (used by t-test for count metrics)', () => {
    const text = ['orders', '0', '1', '2', '3', '0', '1', '4', '2'].join('\n')
    const res = parseDataPeekCsv(
      text,
      brief({ metric_type: 'count', metric_column: 'orders', baseline: { value: 1.6, unit: null } }),
    )
    expect(res.ok).toBe(true)
    expect(res.std_computed).toBeGreaterThan(0)
  })

  it('strips BOM at start of file', () => {
    const text = '﻿' + ['order_amount', '100', '120'].join('\n')
    const res = parseDataPeekCsv(
      text,
      brief({ metric_type: 'continuous', metric_column: 'order_amount' }),
    )
    expect(res.ok).toBe(true)
    expect(res.baseline_computed).toBeCloseTo(110, 5)
  })

  it('computes stability_cv_under_threshold when day column present (stable)', () => {
    const lines = ['order_amount,day']
    for (let day = 1; day <= 10; day++) {
      for (let i = 0; i < 50; i++) lines.push(`${100 + (i % 5)},${day}`)
    }
    const res = parseDataPeekCsv(
      lines.join('\n'),
      brief({ metric_type: 'continuous', metric_column: 'order_amount' }),
    )
    expect(res.ok).toBe(true)
    expect(res.cv_value).toBeLessThan(0.3)
    expect(res.stability_cv_under_threshold).toBe(true)
    expect(res.n_days).toBe(10)
  })
})

describe('parseDataPeekCsv — errors', () => {
  it('rejects empty string', () => {
    const res = parseDataPeekCsv('', brief())
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/Пустой/)
  })

  it('rejects missing required column', () => {
    const text = ['foo', '1', '2'].join('\n')
    const res = parseDataPeekCsv(text, brief({ metric_column: 'converted' }))
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/converted/)
  })

  it('rejects ratio when ratio_components empty', () => {
    const text = ['clicks,sessions', '1,10'].join('\n')
    const res = parseDataPeekCsv(
      text,
      brief({
        metric_type: 'ratio',
        ratio_components: { numerator: null, denominator: null },
      }),
    )
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/Q03.1/)
  })

  it('rejects all-NaN column', () => {
    const text = ['converted', 'foo', 'bar', 'baz'].join('\n')
    const res = parseDataPeekCsv(text, brief())
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/валидных чисел/)
  })

  it('rejects when metric_type is not set', () => {
    const text = ['converted', '1', '0'].join('\n')
    const res = parseDataPeekCsv(text, brief({ metric_type: null }))
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/Q03/)
  })

  it('rejects files larger than maxBytes (50MB cap in prod)', () => {
    // Use injected small cap to avoid allocating 50MB in the test VM.
    const text = 'converted\n1\n0\n1\n0'
    const res = parseDataPeekCsv(text, brief(), { maxBytes: 10 })
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/50MB/)
  })
})

describe('parseDataPeekCsv — proportion sanity warning', () => {
  it('warns when proportion values look like percents (mean > 1)', () => {
    const text = ['converted', '12', '15', '8', '20'].join('\n')
    const res = parseDataPeekCsv(
      text,
      brief({ baseline: { value: 0.15, unit: 'fraction' } }),
    )
    expect(res.ok).toBe(true)
    expect(res.warnings.some((w) => /проценты/.test(w))).toBe(true)
  })
})
