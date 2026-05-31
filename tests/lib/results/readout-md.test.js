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

  // FIX iter 1 — F-8/F-9c: bold significance + novelty lines in TL;DR.
  it('puts a bold significance verdict in TL;DR', () => {
    const md = buildReadoutMd(makeState()) // p=0.012, alpha=0.05
    expect(md).toMatch(/\*\*✅ Statistically significant\*\*/)
  })

  it('puts a bold novelty verdict when novelty_flag is set', () => {
    const s = makeState()
    s.results.raw_results.novelty_flag = true
    const md = buildReadoutMd(s)
    expect(md).toMatch(/\*\*⚠ Novelty effect suspected\*\*/)
  })

  it('omits the novelty verdict when novelty_flag is null (FIX iter 2 — G-1)', () => {
    const s = makeState()
    s.results.raw_results.novelty_flag = null
    const md = buildReadoutMd(s)
    expect(md).not.toMatch(/Novelty effect/)
  })

  // FIX iter 2 — G-2: honest CI unit label in TL;DR.
  it('labels CI with metric units for continuous (no *100)', () => {
    const s = makeState()
    s.brief.metric_type = 'continuous'
    s.brief.metric_name = 'ARPU'
    const md = buildReadoutMd(s)
    expect(md).toMatch(/_\(абс\. разность, ед\. ARPU\)_/)
  })
})
