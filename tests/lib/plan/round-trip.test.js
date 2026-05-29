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

  // Sprint 5 FIX C-2: when the user didn't fill the CSV column code, the
  // YAML must NOT carry metric_label (so parse can apply the P-7 legacy
  // heuristic and restore brief.metric_column = '' instead of overwriting
  // it with the natural-text label).
  it('preserves empty metric_column round-trip via P-7 legacy heuristic (C-2)', () => {
    const original = makeState({
      metric_column: '',
      metric_name: 'конверсия в первый депозит',
    })
    const md = renderTestPlanMd(original)

    // YAML must carry the natural text in metric_name and an explicit null
    // metric_label — that's the legacy-shaped output that lets parse route
    // it back symmetrically.
    expect(md).toContain('metric_name: конверсия в первый депозит')
    expect(md).toContain('metric_label: null')

    const parsed = parseTestPlanMd(md)
    expect(parsed.ok).toBe(true)
    expect(parsed.brief.metric_column).toBe('')
    expect(parsed.brief.metric_name).toBe('конверсия в первый депозит')
    // The legacy warning is expected here — see fix-prompt C-2 technical notes.
    expect(parsed.warnings.some((w) => /legacy формат/.test(w))).toBe(true)
  })

  // Sprint 6: data_peek extended schema (ratio_variance, stability_cv_under_threshold,
  // raw_values, etc.) must survive a render → parse cycle. Pre-Sprint 6 the
  // first two fields were used by sample-size.js / scoring.js but never parsed,
  // so a round-trip would silently lose them.
  it('preserves data_peek extended fields for ratio metric (Sprint 6)', () => {
    const peek = {
      uploaded: true,
      source: 'csv',
      baseline_computed: 0.0987,
      std_computed: null,
      ratio_variance: 0.0004,
      ratio_mean_numerator: 10.25,
      ratio_mean_denominator: 101.25,
      ratio_cov_nd: 0.05,
      baseline_match_user_input: true,
      distribution_check: 'ok',
      skewness: 0.1,
      kurtosis: 0.2,
      cv_value: 0.12,
      stability_cv_under_threshold: true,
      raw_values: [0.09, 0.10, 0.11, 0.10, 0.09],
    }
    const original = makeState({
      metric_type: 'ratio',
      ratio_components: { numerator: 'clicks', denominator: 'sessions' },
      metric_name: 'CTR',
      metric_column: 'ctr',
      baseline: { value: 0.1, unit: 'fraction' },
      data_peek: peek,
    })

    const md = renderTestPlanMd(original)
    expect(md).toContain('ratio_variance: 0.0004')
    expect(md).toContain('stability_cv_under_threshold: true')

    const parsed = parseTestPlanMd(md)
    expect(parsed.ok).toBe(true)
    expect(parsed.brief.data_peek).toMatchObject({
      uploaded: true,
      source: 'csv',
      baseline_computed: 0.0987,
      ratio_variance: 0.0004,
      ratio_mean_numerator: 10.25,
      ratio_mean_denominator: 101.25,
      ratio_cov_nd: 0.05,
      distribution_check: 'ok',
      skewness: 0.1,
      kurtosis: 0.2,
      cv_value: 0.12,
      stability_cv_under_threshold: true,
    })
    expect(parsed.brief.data_peek.raw_values).toEqual([
      0.09, 0.1, 0.11, 0.1, 0.09,
    ])
  })
})
