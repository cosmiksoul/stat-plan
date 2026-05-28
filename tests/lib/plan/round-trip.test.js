// Canonical round-trip contract: every field that we promise to preserve
// through render → parse must survive a render+parse cycle bit-identically.
// When you add a new brief field that should round-trip, add it here.
//
// Per ADR-002: YAML frontmatter wins over markdown body — these tests
// only assert what frontmatter carries.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderTestPlanMd } from '../../../src/lib/plan/render.js'
import { parseTestPlanMd } from '../../../src/lib/plan/parse.js'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-28T10:00:00Z'))
})

function makeState(briefOverrides = {}, planOverrides = {}) {
  return {
    brief: {
      goal_type: 'product_change',
      goal_description: '',
      hypothesis: {
        text: 'Если показать блок, то CR вырастет на 5%, потому что больше офферов',
        slots: {
          change: true,
          metric: true,
          direction_magnitude: true,
          mechanism: true,
        },
      },
      metric_type: 'proportion',
      ratio_components: { numerator: null, denominator: null },
      metric_name: 'cr_to_partner_click',
      metric_column: 'converted',
      baseline: { value: 0.031, unit: 'fraction' },
      randomization_unit: 'user',
      cluster_field: null,
      mde: { value: 5, unit: 'relative_percent', direction: 'increase' },
      daily_traffic: { value: 50000, unit: 'user' },
      guardrails: [],
      stop_conditions: {
        srm_detected: true,
        guardrail_breach_24h: true,
        length_cap_days: null,
        manual_stop: false,
      },
      decision_rules: { ship: '', iterate: '', kill: '' },
      advanced: {
        alpha: 0.05,
        power: 0.8,
        two_sided: true,
        variance_reduction: null,
        stratification_by: null,
        holdback_percent: null,
      },
      ...briefOverrides,
    },
    plan: {
      status: 'draft',
      approvedAt: null,
      derived: {
        sample_size_per_arm: 79620,
        duration_days: 4,
        test_method: 'z_test_proportions',
        warnings: [],
        approximate: false,
      },
      score: { total: 80 },
      ...planOverrides,
    },
  }
}

describe('full round-trip — every brief field that the YAML carries', () => {
  it('preserves ratio + cluster + custom rules + advanced opts in one go', () => {
    const original = makeState({
      goal_type: 'other',
      goal_description: 'оптимизация воронки партнёрки',
      metric_type: 'ratio',
      ratio_components: { numerator: 'clicks', denominator: 'views' },
      metric_name: 'CTR главного баннера',
      metric_column: 'ctr',
      randomization_unit: 'cluster',
      cluster_field: 'campaign_id',
      stop_conditions: {
        srm_detected: true,
        guardrail_breach_24h: false,
        length_cap_days: 14,
        manual_stop: true,
      },
      decision_rules: {
        ship: 'custom ship',
        iterate: 'custom iterate',
        kill: 'custom kill',
      },
      advanced: {
        alpha: 0.01,
        power: 0.9,
        two_sided: false,
        variance_reduction: 'cuped',
        stratification_by: 'geo',
        holdback_percent: 10,
      },
    })

    const md = renderTestPlanMd(original)
    const parsed = parseTestPlanMd(md)

    expect(parsed.ok).toBe(true)

    expect(parsed.brief.goal_type).toBe('other')
    expect(parsed.brief.goal_description).toBe(
      'оптимизация воронки партнёрки',
    )
    expect(parsed.brief.metric_type).toBe('ratio')
    expect(parsed.brief.metric_column).toBe('ctr')
    expect(parsed.brief.metric_name).toBe('CTR главного баннера')
    expect(parsed.brief.ratio_components).toEqual({
      numerator: 'clicks',
      denominator: 'views',
    })
    expect(parsed.brief.randomization_unit).toBe('cluster')
    expect(parsed.brief.cluster_field).toBe('campaign_id')
    expect(parsed.brief.stop_conditions).toEqual(original.brief.stop_conditions)
    expect(parsed.brief.decision_rules).toEqual(original.brief.decision_rules)
    expect(parsed.brief.advanced.alpha).toBe(0.01)
    expect(parsed.brief.advanced.power).toBe(0.9)
    expect(parsed.brief.advanced.two_sided).toBe(false)
    expect(parsed.brief.advanced.variance_reduction).toBe('cuped')
    expect(parsed.brief.advanced.stratification_by).toBe('geo')
    expect(parsed.brief.advanced.holdback_percent).toBe(10)
  })

  it('preserves goal_description length with cyrillic + ё (BUG-9b sanity check)', () => {
    const goal = 'оптимизация воронки партнёрки'
    expect(goal.length).toBe(29)

    const original = makeState({ goal_type: 'other', goal_description: goal })
    const md = renderTestPlanMd(original)
    const parsed = parseTestPlanMd(md)

    expect(parsed.ok).toBe(true)
    expect(parsed.brief.goal_description).toBe(goal)
    expect(parsed.brief.goal_description.length).toBe(29)
  })

  it('preserves length_cap_days=14 and recovers length cap from YAML, not body', () => {
    const original = makeState({
      stop_conditions: {
        srm_detected: true,
        guardrail_breach_24h: true,
        length_cap_days: 14,
        manual_stop: false,
      },
    })
    const md = renderTestPlanMd(original)
    const parsed = parseTestPlanMd(md)
    expect(parsed.brief.stop_conditions.length_cap_days).toBe(14)
  })

  it('preserves non-default decision_rules (no overwrite by parser defaults)', () => {
    const original = makeState({
      decision_rules: {
        ship: 'CI > +2% rel.',
        iterate: 'positive trend ≥ 3 segments',
        kill: 'guardrail breach > 24h',
      },
    })
    const md = renderTestPlanMd(original)
    const parsed = parseTestPlanMd(md)
    expect(parsed.brief.decision_rules).toEqual(original.brief.decision_rules)
  })
})
