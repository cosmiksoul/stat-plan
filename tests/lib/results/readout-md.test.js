import { describe, it, expect } from 'vitest'
import { buildReadoutMd } from '../../../src/lib/results/readout-md.js'

function makeState(over = {}) {
  return {
    test_id: 'cr-checkout-v1',
    title: 'CR checkout',
    brief: {
      metric_name: 'CR checkout',
      metric_type: 'proportion',
      advanced: { alpha: 0.05, power: 0.8 },
      mde: { value: 2, unit: 'relative_percent', direction: 'increase' },
      decision_rules: { ship: 'delta_rel > 1', iterate: '', kill: '' },
    },
    plan: { derived: { sample_size_per_arm: 5000 } },
    results: {
      raw_results: {
        control_n: 5000,
        treatment_n: 5020,
        delta_rel: 2.3,
        p_value: 0.012,
        ci_lower: 0.005,
        ci_upper: 0.041,
      },
      user_overrides: {},
      user_decision: null,
      user_checks: {},
    },
    ...over,
  }
}

describe('buildReadoutMd', () => {
  it('starts with YAML frontmatter containing test_id and empty decision', () => {
    const md = buildReadoutMd(makeState())
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toMatch(/test_id: cr-checkout-v1/)
    expect(md).toMatch(/decision: ""/)
  })

  it('contains all required markdown sections', () => {
    const md = buildReadoutMd(makeState())
    expect(md).toMatch(/^# CR checkout/m)
    expect(md).toMatch(/## TL;DR/)
    expect(md).toMatch(/## Results/)
    expect(md).toMatch(/## Sanity checks/)
    expect(md).toMatch(/## Decision rules application/)
    expect(md).toMatch(/## Recommended next step/)
    expect(md).toMatch(/## Decision/)
    expect(md).toMatch(/_To be filled manually\._/)
  })

  it('lists non-empty decision rules with their label', () => {
    const md = buildReadoutMd(makeState())
    expect(md).toMatch(/\*\*SHIP\*\*:/)
    expect(md).not.toMatch(/\*\*ITERATE\*\*:/)
  })

  it('shows "не заполнены" when all rules empty', () => {
    const s = makeState()
    s.brief.decision_rules = { ship: '', iterate: '', kill: '' }
    const md = buildReadoutMd(s)
    expect(md).toMatch(/не заполнены/)
  })

  it('embeds results numerics from user_overrides over raw_results', () => {
    const s = makeState()
    s.results.user_overrides = { delta_rel: 7.7 }
    const md = buildReadoutMd(s)
    expect(md).toMatch(/delta_rel: 7\.7/)
  })
})
