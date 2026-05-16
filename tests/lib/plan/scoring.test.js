import { describe, it, expect } from 'vitest'
import { scorePlan } from '../../../src/lib/plan/scoring.js'

// Minimal brief skeleton matching state.brief shape.
function makeBrief(overrides = {}) {
  return {
    goal_type: 'product_change',
    hypothesis: {
      text: 'Если показать блок, то CR вырастет на 8%, потому что больше офферов',
      slots: {
        change: true,
        metric: true,
        direction_magnitude: true,
        mechanism: true,
      },
    },
    metric_type: 'proportion',
    metric_name: 'cr_to_partner_click',
    baseline: { value: 0.031, unit: 'fraction' },
    randomization_unit: 'user',
    mde: { value: 8, unit: 'relative_percent', direction: 'increase' },
    daily_traffic: { value: 50000, unit: 'user' },
    guardrails: [
      { name: 'bounce_rate', direction: 'max', threshold: { value: 5, unit: 'relative_percent' } },
    ],
    stop_conditions: {
      srm_detected: true,
      guardrail_breach_24h: true,
      length_cap_days: 10,
      manual_stop: false,
    },
    decision_rules: {
      ship: 'CI not crossing 0 lower ≥ +3% rel',
      iterate: 'ns but positive in 2+ segments',
      kill: 'guardrail breach or CI ≤ −3%',
    },
    advanced: {
      alpha: 0.05,
      power: 0.8,
      two_sided: true,
      variance_reduction: null,
      stratification_by: null,
      holdback_percent: null,
    },
    ...overrides,
  }
}

function makeDerived(overrides = {}) {
  return {
    sample_size_per_arm: 80000,
    duration_days: 4,
    test_method: 'z_test_proportions',
    warnings: [],
    approximate: false,
    ...overrides,
  }
}

describe('scorePlan — total structure', () => {
  it('returns total, breakdown (4 groups), remarks[]', () => {
    const score = scorePlan(makeBrief(), makeDerived())
    expect(score).toHaveProperty('total')
    expect(score).toHaveProperty('breakdown')
    expect(score.breakdown).toHaveProperty('hypothesis')
    expect(score.breakdown).toHaveProperty('design')
    expect(score.breakdown).toHaveProperty('consistency')
    expect(score.breakdown).toHaveProperty('dataPeek')
    expect(score).toHaveProperty('remarks')
    expect(Array.isArray(score.remarks)).toBe(true)
  })

  it('total equals sum of breakdown', () => {
    const score = scorePlan(makeBrief(), makeDerived())
    const sum =
      score.breakdown.hypothesis +
      score.breakdown.design +
      score.breakdown.consistency +
      score.breakdown.dataPeek
    expect(score.total).toBe(sum)
  })

  it('total is in [0, 100]', () => {
    const score = scorePlan(makeBrief(), makeDerived())
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
  })
})

describe('scorePlan — group 1 (hypothesis, max 20)', () => {
  it('full hypothesis → 20', () => {
    const score = scorePlan(makeBrief(), makeDerived())
    expect(score.breakdown.hypothesis).toBe(20)
  })

  it('missing change slot → 15, remark on missing slot', () => {
    const brief = makeBrief({
      hypothesis: {
        text: 'CR вырастет на 8%',
        slots: { change: false, metric: true, direction_magnitude: true, mechanism: true },
      },
    })
    const score = scorePlan(brief, makeDerived())
    expect(score.breakdown.hypothesis).toBe(15)
    expect(score.remarks.some((r) => r.group === 'hypothesis' && /измен/i.test(r.message))).toBe(
      true,
    )
  })

  it('empty hypothesis → 0', () => {
    const brief = makeBrief({
      hypothesis: {
        text: '',
        slots: { change: false, metric: false, direction_magnitude: false, mechanism: false },
      },
    })
    const score = scorePlan(brief, makeDerived())
    expect(score.breakdown.hypothesis).toBe(0)
  })
})

describe('scorePlan — group 2 (design, max 30)', () => {
  it('all required fields present → 30', () => {
    const score = scorePlan(makeBrief(), makeDerived())
    expect(score.breakdown.design).toBe(30)
  })

  it('no guardrails → −3, remark', () => {
    const brief = makeBrief({ guardrails: [] })
    const score = scorePlan(brief, makeDerived())
    expect(score.breakdown.design).toBe(27)
    expect(score.remarks.some((r) => r.group === 'design' && /guardrail/i.test(r.message))).toBe(
      true,
    )
  })

  it('decision_rules with fewer than 2 → −3, remark', () => {
    const brief = makeBrief({ decision_rules: { ship: 'CI ok', iterate: '', kill: '' } })
    const score = scorePlan(brief, makeDerived())
    expect(score.breakdown.design).toBe(27)
    expect(score.remarks.some((r) => r.group === 'design' && /decision/i.test(r.message))).toBe(
      true,
    )
  })

  it('sample_size_per_arm null → −3 for sample, −3 for duration, remarks', () => {
    const derived = makeDerived({ sample_size_per_arm: null, duration_days: null })
    const score = scorePlan(makeBrief(), derived)
    expect(score.breakdown.design).toBe(24)
  })

  it('alpha out of range → −3', () => {
    const brief = makeBrief({
      advanced: { alpha: 0.5, power: 0.8, two_sided: true },
    })
    const score = scorePlan(brief, makeDerived())
    expect(score.breakdown.design).toBe(27)
    expect(score.remarks.some((r) => /alpha|α/i.test(r.message))).toBe(true)
  })
})

describe('scorePlan — group 3 (consistency, max 30)', () => {
  it('consistent z_test for proportion → full method points (6)', () => {
    const score = scorePlan(makeBrief(), makeDerived())
    // 6 (method) + 6 (mde realistic) + 6 (sample reachable: ceil(80000*2/50000)=4 days)
    // + 4 (baseline ok) + 4 (guardrail no conflict) + 4 (no VR set)
    expect(score.breakdown.consistency).toBe(30)
  })

  it('inconsistent z_test for continuous → critical remark, 0 method points', () => {
    const brief = makeBrief({ metric_type: 'continuous' })
    const derived = makeDerived({ test_method: 'z_test_proportions' })
    const score = scorePlan(brief, derived)
    expect(
      score.remarks.some((r) => r.severity === 'critical' && /метод|method/i.test(r.message)),
    ).toBe(true)
    expect(score.breakdown.consistency).toBeLessThan(30)
  })

  it('warning combo (t_test for proportion) → half method points, warn remark', () => {
    const brief = makeBrief({ metric_type: 'proportion' })
    const derived = makeDerived({ test_method: 't_test' })
    const score = scorePlan(brief, derived)
    // 3 method + 6 mde + 6 sample + 4 baseline + 4 guardrail + 4 VR = 27
    expect(score.breakdown.consistency).toBe(27)
    expect(score.remarks.some((r) => r.severity === 'warn' && /рекоменд|лучше/i.test(r.message))).toBe(
      true,
    )
  })

  it('MDE > 50% rel → −6, warn remark', () => {
    const brief = makeBrief({
      mde: { value: 60, unit: 'relative_percent', direction: 'increase' },
    })
    const score = scorePlan(brief, makeDerived())
    expect(score.breakdown.consistency).toBeLessThan(30)
    expect(score.remarks.some((r) => /MDE/i.test(r.message))).toBe(true)
  })

  it('unreachable sample (>14 days) → −6, warn remark with concrete number', () => {
    // 80000 per arm, daily 1000 → 160 days, way over 14
    const brief = makeBrief({ daily_traffic: { value: 1000, unit: 'user' } })
    const derived = makeDerived({ duration_days: 160 })
    const score = scorePlan(brief, derived)
    expect(score.breakdown.consistency).toBeLessThan(30)
    expect(
      score.remarks.some(
        (r) =>
          r.group === 'consistency' &&
          /14|дней|сэмпл|выборк/i.test(r.message),
      ),
    ).toBe(true)
  })

  it('guardrail name conflicts with metric_name → −4, warn remark', () => {
    const brief = makeBrief({
      metric_name: 'bounce_rate',
      guardrails: [
        { name: 'bounce_rate', direction: 'max', threshold: { value: 5, unit: 'relative_percent' } },
      ],
    })
    const score = scorePlan(brief, makeDerived())
    expect(score.remarks.some((r) => /guardrail.*main|совпада/i.test(r.message))).toBe(true)
  })
})

describe('scorePlan — group 4 (data peek, max 20)', () => {
  it('no data peek → 0', () => {
    const score = scorePlan(makeBrief(), makeDerived())
    expect(score.breakdown.dataPeek).toBe(0)
  })

  it('full data peek → 20', () => {
    const brief = makeBrief({
      data_peek: {
        uploaded: true,
        baseline_computed: 0.031,
        baseline_match_user_input: true,
        distribution_check: 'ok',
        stability_cv_under_threshold: true,
      },
    })
    const score = scorePlan(brief, makeDerived())
    expect(score.breakdown.dataPeek).toBe(20)
  })
})

describe('scorePlan — remarks are concrete', () => {
  it('unreachable sample remark mentions the actual number of days', () => {
    const brief = makeBrief({ daily_traffic: { value: 1000, unit: 'user' } })
    const derived = makeDerived({ duration_days: 160 })
    const score = scorePlan(brief, derived)
    const remark = score.remarks.find(
      (r) => r.group === 'consistency' && /дней|days/i.test(r.message),
    )
    expect(remark).toBeDefined()
    expect(remark.message).toMatch(/160/)
  })

  it('MDE warning is specific to the value, not generic', () => {
    const brief = makeBrief({
      mde: { value: 60, unit: 'relative_percent', direction: 'increase' },
    })
    const score = scorePlan(brief, makeDerived())
    const remark = score.remarks.find((r) => /MDE/i.test(r.message))
    expect(remark.message).toMatch(/60/)
  })

  it('each remark has id, group, severity, message', () => {
    const brief = makeBrief({ guardrails: [] })
    const score = scorePlan(brief, makeDerived())
    for (const r of score.remarks) {
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('group')
      expect(r).toHaveProperty('severity')
      expect(r).toHaveProperty('message')
      expect(['info', 'warn', 'critical']).toContain(r.severity)
    }
  })
})
