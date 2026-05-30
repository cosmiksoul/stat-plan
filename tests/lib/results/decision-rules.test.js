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
