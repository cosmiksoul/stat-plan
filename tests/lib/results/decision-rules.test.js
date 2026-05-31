import { describe, it, expect } from 'vitest'
import {
  parseDecisionRule,
  evaluateRule,
  evaluateAllRules,
  recommendNextStep,
} from '../../../src/lib/results/decision-rules.js'

describe('parseDecisionRule', () => {
  it('plain condition "p_value < 0.05"', () => {
    const r = parseDecisionRule('p_value < 0.05')
    expect(r.parsed).toBe(true)
    expect(r.variable).toBe('p_value')
    expect(r.operator).toBe('<')
    expect(r.threshold).toBe(0.05)
  })

  it('full sentence "if delta_rel > 5 then SHIP"', () => {
    const r = parseDecisionRule('if delta_rel > 5 then SHIP')
    expect(r.parsed).toBe(true)
    expect(r.variable).toBe('delta_rel')
    expect(r.threshold).toBe(5)
  })

  it('handles >= and <=', () => {
    expect(parseDecisionRule('ci_lower >= 0').operator).toBe('>=')
    expect(parseDecisionRule('ci_upper <= -0.01').operator).toBe('<=')
  })

  it('handles == operator', () => {
    const r = parseDecisionRule('delta_rel == 0')
    expect(r.parsed).toBe(true)
    expect(r.operator).toBe('==')
  })

  it('case-insensitive variable name', () => {
    const r = parseDecisionRule('CI_LOWER > 0')
    expect(r.parsed).toBe(true)
    expect(r.variable).toBe('ci_lower')
  })

  it('empty string → not parsed', () => {
    const r = parseDecisionRule('')
    expect(r.parsed).toBe(false)
  })

  it('free-form Russian → not parsed', () => {
    const r = parseDecisionRule('если эффект растёт — катим')
    expect(r.parsed).toBe(false)
  })

  it('handles negative thresholds', () => {
    const r = parseDecisionRule('delta_rel < -2')
    expect(r.parsed).toBe(true)
    expect(r.threshold).toBe(-2)
  })

  // G-4 (FIX iter 2) — tolerant of real PM phrasing.
  it('bare CI with ≥ → ci_lower (unicode + % rel suffix)', () => {
    const r = parseDecisionRule('CI ≥ +5% rel.')
    expect(r).toMatchObject({ parsed: true, variable: 'ci_lower', operator: '>=', threshold: 5 })
  })

  it('Russian "Нижняя граница ≥ +5% rel." → ci_lower', () => {
    const r = parseDecisionRule('Нижняя граница ≥ +5% rel.')
    expect(r).toMatchObject({ parsed: true, variable: 'ci_lower', operator: '>=', threshold: 5 })
  })

  it('bare CI with ≤ and unicode minus → ci_upper', () => {
    const r = parseDecisionRule('CI ≤ −2.5% rel.')
    expect(r).toMatchObject({ parsed: true, variable: 'ci_upper', operator: '<=', threshold: -2.5 })
  })

  it('Russian "Верхняя граница <= -2.5%" → ci_upper', () => {
    const r = parseDecisionRule('Верхняя граница <= -2.5%')
    expect(r).toMatchObject({ parsed: true, variable: 'ci_upper', operator: '<=', threshold: -2.5 })
  })

  it('mixed sentence "Guardrail breach или CI ≤ −5% rel." parses the CI condition', () => {
    const r = parseDecisionRule('Guardrail breach или CI ≤ −5% rel.')
    expect(r).toMatchObject({ parsed: true, variable: 'ci_upper', operator: '<=', threshold: -5 })
    expect(r.raw).toContain('Guardrail breach')
  })

  it('semantic sentence with no numeric condition → not parsed', () => {
    const r = parseDecisionRule(
      'Статистически незначимо, но направление positive в 2+ сегментах — итерируем.',
    )
    expect(r.parsed).toBe(false)
  })

  it('explicit ci_lower/ci_upper are never remapped by the bare-CI logic', () => {
    expect(parseDecisionRule('ci_lower <= 0.01')).toMatchObject({
      variable: 'ci_lower',
      operator: '<=',
    })
    expect(parseDecisionRule('ci_upper >= 0.01')).toMatchObject({
      variable: 'ci_upper',
      operator: '>=',
    })
  })
})

describe('evaluateRule — G-4 CI mapping (FIX iter 2 / Sprint 8 unit-aware)', () => {
  // Sprint 8 P-14d: "% rel" rules now read the derived *_pct_rel field.
  it('ci_upper <= -2.5% rel fires against ci_upper_pct_rel', () => {
    const r = parseDecisionRule('CI ≤ −2.5% rel.')
    expect(r.unit).toBe('pct_rel')
    expect(evaluateRule(r, { ci_upper_pct_rel: -3 })).toBe(true)
  })

  it('ci_lower >= 5% rel fires against ci_lower_pct_rel', () => {
    const r = parseDecisionRule('CI ≥ +5% rel.')
    expect(evaluateRule(r, { ci_lower_pct_rel: 7 })).toBe(true)
  })
})

describe('parseDecisionRule — Sprint 8 aliases (P-13)', () => {
  it('"Lift ≥ +5% rel." → delta_rel >= 5', () => {
    expect(parseDecisionRule('Lift ≥ +5% rel.')).toMatchObject({
      parsed: true,
      variable: 'delta_rel',
      operator: '>=',
      threshold: 5,
      unit: 'pct_rel',
    })
  })

  it('"Эффект > 0" → delta_rel > 0', () => {
    expect(parseDecisionRule('Эффект > 0')).toMatchObject({
      parsed: true,
      variable: 'delta_rel',
      operator: '>',
      threshold: 0,
    })
  })

  it('"Δ rel >= 5" → delta_rel >= 5', () => {
    expect(parseDecisionRule('Δ rel >= 5')).toMatchObject({
      parsed: true,
      variable: 'delta_rel',
      operator: '>=',
      threshold: 5,
    })
  })

  it('"p value < 0.05" → p_value < 0.05', () => {
    expect(parseDecisionRule('p value < 0.05')).toMatchObject({
      parsed: true,
      variable: 'p_value',
      operator: '<',
      threshold: 0.05,
    })
  })

  it('"relative effect <= -2" → delta_rel <= -2', () => {
    expect(parseDecisionRule('relative effect <= -2')).toMatchObject({
      parsed: true,
      variable: 'delta_rel',
      operator: '<=',
      threshold: -2,
    })
  })
})

describe('parseDecisionRule / evaluateRule — Sprint 8 unit-aware (P-14d)', () => {
  it('no suffix → unit null, compares raw ci bound', () => {
    const r = parseDecisionRule('ci_upper <= -2.5')
    expect(r.unit).toBeNull()
    expect(evaluateRule(r, { ci_upper: -3 })).toBe(true)
  })

  it('% rel rule returns null when pct_rel field is absent (backward-compat)', () => {
    const r = parseDecisionRule('CI ≤ −2.5% rel.')
    expect(evaluateRule(r, { ci_upper: -3 })).toBeNull()
  })

  it('delta_rel % rel compares the raw (already-percent) value', () => {
    const r = parseDecisionRule('Lift ≥ +5% rel.')
    expect(evaluateRule(r, { delta_rel: 7 })).toBe(true)
  })
})

describe('evaluateRule', () => {
  it('basic > true case', () => {
    const r = parseDecisionRule('delta_rel > 5')
    expect(evaluateRule(r, { delta_rel: 7 })).toBe(true)
  })

  it('basic > false case', () => {
    const r = parseDecisionRule('delta_rel > 5')
    expect(evaluateRule(r, { delta_rel: 3 })).toBe(false)
  })

  it('< operator', () => {
    const r = parseDecisionRule('p_value < 0.05')
    expect(evaluateRule(r, { p_value: 0.01 })).toBe(true)
    expect(evaluateRule(r, { p_value: 0.5 })).toBe(false)
  })

  it('missing variable in results → null', () => {
    const r = parseDecisionRule('p_value < 0.05')
    expect(evaluateRule(r, {})).toBeNull()
  })

  it('unparsed rule → null', () => {
    expect(evaluateRule({ parsed: false }, { delta_rel: 1 })).toBeNull()
  })
})

describe('evaluateAllRules', () => {
  it('maps three labelled fields with their actions', () => {
    const dr = {
      ship: 'delta_rel > 5',
      iterate: '',
      kill: 'ci_upper < 0',
    }
    const res = evaluateAllRules(dr, { delta_rel: 10, ci_upper: 0.02 })
    expect(res).toHaveLength(3)
    expect(res[0]).toMatchObject({ field: 'ship', action: 'SHIP', auto_eval: true })
    expect(res[1]).toMatchObject({ field: 'iterate', empty: true })
    expect(res[2]).toMatchObject({ field: 'kill', action: 'KILL', auto_eval: false })
  })

  it('null decision_rules → three empty rules', () => {
    const res = evaluateAllRules(null, {})
    expect(res.every((r) => r.empty)).toBe(true)
  })
})

describe('recommendNextStep', () => {
  it('SHIP wins priority over ITERATE', () => {
    const rules = evaluateAllRules(
      { ship: 'delta_rel > 5', iterate: 'delta_rel > 1', kill: '' },
      { delta_rel: 10 },
    )
    const rec = recommendNextStep(rules)
    expect(rec).toMatch(/SHIP/)
  })

  it('no rules fired → fallback sentence', () => {
    const rules = evaluateAllRules(
      { ship: 'delta_rel > 100', iterate: '', kill: '' },
      { delta_rel: 1 },
    )
    const rec = recommendNextStep(rules)
    expect(rec).toMatch(/Ни одно/)
  })

  it('user override beats auto_eval', () => {
    const rules = evaluateAllRules(
      { ship: '', iterate: '', kill: 'delta_rel < -100' },
      { delta_rel: 5 },
    )
    // auto says KILL didn't fire; user marks it as fired
    const rec = recommendNextStep(rules, { kill: true })
    expect(rec).toMatch(/KILL/)
  })
})
