import { describe, it, expect } from 'vitest'
import {
  validateBaseline,
  validateMde,
  validateDailyTraffic,
  validateGuardrails,
  validateHypothesisText,
} from '../../../src/lib/brief/validators.js'

describe('validateBaseline', () => {
  it('accepts a valid proportion in %', () => {
    expect(
      validateBaseline({ value: 3.1, unit: 'percent' }, 'proportion'),
    ).toEqual({ ok: true, message: null })
  })

  it('accepts a valid proportion as a fraction 0..1', () => {
    expect(
      validateBaseline({ value: 0.031, unit: 'fraction' }, 'proportion'),
    ).toEqual({ ok: true, message: null })
  })

  it('rejects proportion > 100%', () => {
    const r = validateBaseline({ value: 150, unit: 'percent' }, 'proportion')
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/100/)
  })

  it('rejects proportion <= 0%', () => {
    expect(
      validateBaseline({ value: 0, unit: 'percent' }, 'proportion').ok,
    ).toBe(false)
    expect(
      validateBaseline({ value: -1, unit: 'percent' }, 'proportion').ok,
    ).toBe(false)
  })

  it('rejects proportion fraction >= 1', () => {
    expect(
      validateBaseline({ value: 1.5, unit: 'fraction' }, 'proportion').ok,
    ).toBe(false)
  })

  it('accepts a positive continuous baseline regardless of unit', () => {
    expect(
      validateBaseline({ value: 250, unit: '₽' }, 'continuous'),
    ).toEqual({ ok: true, message: null })
  })

  it('rejects non-positive continuous baseline', () => {
    expect(
      validateBaseline({ value: 0, unit: '₽' }, 'continuous').ok,
    ).toBe(false)
    expect(
      validateBaseline({ value: -5, unit: '₽' }, 'continuous').ok,
    ).toBe(false)
  })

  it('returns ok=true on empty value (treated as not-yet-answered)', () => {
    expect(
      validateBaseline({ value: null, unit: null }, 'proportion'),
    ).toEqual({ ok: true, message: null })
  })
})

describe('validateMde', () => {
  it('accepts a small relative_percent MDE', () => {
    expect(
      validateMde(
        { value: 8, unit: 'relative_percent' },
        { value: 3.1, unit: 'percent' },
      ),
    ).toEqual({ ok: true, message: null })
  })

  it('warns when relative_percent MDE > 50%', () => {
    const r = validateMde(
      { value: 60, unit: 'relative_percent' },
      { value: 3.1, unit: 'percent' },
    )
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/крупн/i)
  })

  it('accepts absolute_percentage_points smaller than baseline', () => {
    expect(
      validateMde(
        { value: 0.5, unit: 'absolute_percentage_points' },
        { value: 5, unit: 'percent' },
      ).ok,
    ).toBe(true)
  })

  it('warns when absolute_percentage_points exceeds baseline', () => {
    const r = validateMde(
      { value: 6, unit: 'absolute_percentage_points' },
      { value: 5, unit: 'percent' },
    )
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/baseline/i)
  })

  it('accepts any absolute_value MDE > 0', () => {
    expect(
      validateMde(
        { value: 50, unit: 'absolute_value' },
        { value: 200, unit: '₽' },
      ).ok,
    ).toBe(true)
  })

  it('returns ok=true when MDE value is empty', () => {
    expect(
      validateMde(
        { value: null, unit: 'relative_percent' },
        { value: 3.1, unit: 'percent' },
      ),
    ).toEqual({ ok: true, message: null })
  })
})

describe('validateDailyTraffic', () => {
  it('passes when traffic unit matches randomization unit', () => {
    expect(
      validateDailyTraffic({ value: 42000, unit: 'user' }, 'user'),
    ).toEqual({ ok: true, message: null })
  })

  it('warns when traffic unit and randomization unit differ', () => {
    const r = validateDailyTraffic(
      { value: 50000, unit: 'session' },
      'user',
    )
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/совпада|совпадать|единиц/i)
  })

  it('returns ok=true when traffic value is empty', () => {
    expect(
      validateDailyTraffic({ value: null, unit: 'user' }, 'user'),
    ).toEqual({ ok: true, message: null })
  })

  it('does not warn when randomization unit is unknown', () => {
    expect(
      validateDailyTraffic({ value: 1000, unit: 'session' }, 'unknown').ok,
    ).toBe(true)
  })
})

describe('validateGuardrails', () => {
  it('warns on empty list', () => {
    const r = validateGuardrails([])
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/guardrail/i)
  })

  it('passes when at least one guardrail is present', () => {
    expect(
      validateGuardrails([
        {
          name: 'bounce_rate',
          column: 'bounce_rate',
          direction: 'max',
          threshold: { value: 5, unit: 'relative_percent' },
        },
      ]),
    ).toEqual({ ok: true, message: null })
  })
})

describe('validateHypothesisText', () => {
  it('returns ok=true on non-empty text', () => {
    expect(validateHypothesisText('Если X, то Y вырастет')).toEqual({
      ok: true,
      message: null,
    })
  })

  it('returns ok=false on empty text', () => {
    expect(validateHypothesisText('').ok).toBe(false)
    expect(validateHypothesisText('   ').ok).toBe(false)
  })
})
