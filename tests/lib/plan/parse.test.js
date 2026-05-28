import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseTestPlanMd } from '../../../src/lib/plan/parse.js'
import { renderTestPlanMd } from '../../../src/lib/plan/render.js'

// Freeze date so render's `created:` is stable.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-20T10:00:00Z'))
})

// ---- Fixtures ------------------------------------------------------------

function validProportionMd() {
  return `---
test_id: bm-main-cta-v2
title: New CTA test
created: 2026-05-20
status: draft
approved_at: null

# Test design
metric_type: proportion
metric_name: cr_to_partner_click
baseline: 0.031
test_method: z_test_proportions
randomization_unit: user
alpha: 0.05
power: 0.8

# Effect
mde:
  value: 8
  unit: relative_percent
direction: increase

# Sample
sample_size_per_arm: 79620
duration_days: 4
daily_traffic_available: 50000

# Optional techniques
variance_reduction: null
stratification_by: null
holdback_percent: null

# Guardrails
guardrails:
  - name: bounce_rate
    direction: max
    threshold: 5
    unit: relative_percent
  - name: time_on_site
    direction: min
    threshold: -10
    unit: relative_percent

# Data peek info
data_peek:
  uploaded: false
  baseline_computed: null
  std_computed: null
  baseline_match_user_input: null
  distribution_check: null

# Scoring snapshot
score: 78
---

# Test Plan: New CTA test

## Hypothesis
Если показать блок, то CR вырастет на 8%, потому что больше офферов

## Guardrails
- bounce_rate (max +5% rel.)

## Stop conditions
- SRM detected (chi² p < 0.001)

## Decision rules
- **SHIP**: CI ≥ +3% rel.

## Notes
_(пусто)_
`
}

function continuousMd() {
  return `---
test_id: arpu-test-v1
title: ARPU lift
created: 2026-05-20
status: draft
approved_at: null

metric_type: continuous
metric_name: arpu
baseline: 100
test_method: t_test
randomization_unit: user
alpha: 0.05
power: 0.8

mde:
  value: 5
  unit: relative_percent
direction: increase

sample_size_per_arm: 6280
duration_days: 1
daily_traffic_available: 30000

variance_reduction: null
stratification_by: null
holdback_percent: null

guardrails: []

data_peek:
  uploaded: false
  baseline_computed: null
  std_computed: null
  baseline_match_user_input: null
  distribution_check: null

score: 70
---

# Test Plan: ARPU lift

## Hypothesis
ARPU вырастет на 5% после переработки прайсинга
`
}

function ratioMd() {
  return `---
test_id: ctr-ratio-v1
title: CTR ratio test
created: 2026-05-20
status: draft
approved_at: null

metric_type: ratio
metric_name: ctr
baseline: 0.12
test_method: delta_method
randomization_unit: session
alpha: 0.05
power: 0.8

mde:
  value: 10
  unit: relative_percent
direction: increase

sample_size_per_arm: 100000
duration_days: 7
daily_traffic_available: 30000

variance_reduction: null
stratification_by: null
holdback_percent: null

guardrails: []

data_peek:
  uploaded: false
  baseline_computed: null
  std_computed: null
  baseline_match_user_input: null
  distribution_check: null

score: 65
---

# Test Plan: CTR ratio test

## Hypothesis
CTR вырастет на 10%
`
}

function countMd() {
  return `---
test_id: events-count-v1
title: Events per user
created: 2026-05-20
status: draft
approved_at: null

metric_type: count
metric_name: events_per_user
baseline: 4.2
test_method: bootstrap
randomization_unit: user
alpha: 0.05
power: 0.8

mde:
  value: 15
  unit: relative_percent
direction: increase

sample_size_per_arm: 20000
duration_days: 5
daily_traffic_available: 10000

variance_reduction: null
stratification_by: null
holdback_percent: null

guardrails: []

data_peek:
  uploaded: false
  baseline_computed: null
  std_computed: null
  baseline_match_user_input: null
  distribution_check: null

score: 60
---

# Test Plan: Events per user

## Hypothesis
Среднее число событий вырастет на 15%
`
}

function approvedMd() {
  return validProportionMd()
    .replace('status: draft', 'status: approved')
    .replace('approved_at: null', 'approved_at: "2026-05-20T10:00:00.000Z"')
}

// State fixture mirroring tests/lib/plan/render.test.js fullState() — used
// for the round-trip cross-check.
function fullStateForRoundTrip(overrides = {}) {
  return {
    brief: {
      goal_type: 'product_change',
      goal_description: '',
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
      ratio_components: { numerator: null, denominator: null },
      metric_name: 'cr_to_partner_click',
      metric_column: 'converted',
      baseline: { value: 0.031, unit: 'fraction' },
      randomization_unit: 'user',
      cluster_field: null,
      mde: { value: 8, unit: 'relative_percent', direction: 'increase' },
      daily_traffic: { value: 50000, unit: 'user' },
      guardrails: [
        {
          name: 'bounce_rate',
          direction: 'max',
          threshold: { value: 5, unit: 'relative_percent' },
        },
        {
          name: 'time_on_site',
          direction: 'min',
          threshold: { value: -10, unit: 'relative_percent' },
        },
      ],
      stop_conditions: {
        srm_detected: true,
        guardrail_breach_24h: true,
        length_cap_days: 10,
        manual_stop: false,
      },
      decision_rules: { ship: 'CI ≥ +3% rel.', iterate: '', kill: '' },
      advanced: {
        alpha: 0.05,
        power: 0.8,
        two_sided: true,
        variance_reduction: null,
        stratification_by: null,
        holdback_percent: null,
      },
      defaultsApplied: { metric_name: false, decision_rules: false },
      ...(overrides.brief || {}),
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
      ...(overrides.plan || {}),
    },
  }
}

// Fields the YAML carries — for round-trip equality assertions.
function extractBriefShape(brief) {
  return {
    goal_type: brief.goal_type,
    goal_description: brief.goal_description,
    metric_type: brief.metric_type,
    metric_name: brief.metric_name,
    metric_column: brief.metric_column,
    ratio_components: brief.ratio_components,
    cluster_field: brief.cluster_field,
    baseline: brief.baseline,
    randomization_unit: brief.randomization_unit,
    mde: brief.mde,
    daily_traffic: brief.daily_traffic,
    guardrails: brief.guardrails,
    stop_conditions: brief.stop_conditions,
    decision_rules: brief.decision_rules,
    advanced: brief.advanced,
    hypothesis_text: brief.hypothesis.text,
  }
}

// ---- Happy-path: 4 metric_types ----------------------------------------

describe('parseTestPlanMd — happy path per metric_type', () => {
  it('parses a complete proportion plan', () => {
    const r = parseTestPlanMd(validProportionMd())
    expect(r.ok).toBe(true)
    expect(r.error).toBeNull()
    expect(r.brief.metric_type).toBe('proportion')
    // Legacy YAML (no metric_label): metric_name maps to brief.metric_column.
    expect(r.brief.metric_column).toBe('cr_to_partner_click')
    expect(r.brief.metric_name).toBe('')
    expect(r.brief.baseline).toEqual({ value: 0.031, unit: 'fraction' })
    expect(r.brief.randomization_unit).toBe('user')
    expect(r.brief.advanced.alpha).toBe(0.05)
    expect(r.brief.advanced.power).toBe(0.8)
    expect(r.brief.mde).toEqual({
      value: 8,
      unit: 'relative_percent',
      direction: 'increase',
    })
    expect(r.brief.daily_traffic).toEqual({ value: 50000, unit: 'user' })
    expect(r.brief.guardrails).toHaveLength(2)
    expect(r.brief.guardrails[0]).toEqual({
      name: 'bounce_rate',
      direction: 'max',
      threshold: { value: 5, unit: 'relative_percent' },
    })
    expect(r.plan.status).toBe('draft')
    expect(r.plan.editedExternally).toBe(true)
    expect(r.plan.briefSubmitted).toBe(true)
  })

  it('parses a continuous plan', () => {
    const r = parseTestPlanMd(continuousMd())
    expect(r.ok).toBe(true)
    expect(r.brief.metric_type).toBe('continuous')
    expect(r.brief.baseline).toEqual({ value: 100, unit: null })
    expect(r.brief.guardrails).toEqual([])
  })

  it('parses a ratio plan', () => {
    const r = parseTestPlanMd(ratioMd())
    expect(r.ok).toBe(true)
    expect(r.brief.metric_type).toBe('ratio')
    expect(r.brief.randomization_unit).toBe('session')
    expect(r.brief.daily_traffic).toEqual({ value: 30000, unit: 'session' })
  })

  it('parses a count plan', () => {
    const r = parseTestPlanMd(countMd())
    expect(r.ok).toBe(true)
    expect(r.brief.metric_type).toBe('count')
    expect(r.brief.baseline).toEqual({ value: 4.2, unit: null })
  })
})

// ---- Round-trip: render → parse → equality ------------------------------

describe('parseTestPlanMd — round-trip with render', () => {
  it('round-trips a proportion + CUPED state', () => {
    const original = fullStateForRoundTrip({
      brief: {
        advanced: {
          alpha: 0.05,
          power: 0.8,
          two_sided: true,
          variance_reduction: 'cuped',
          stratification_by: 'geo',
          holdback_percent: 10,
        },
      },
    })
    const md = renderTestPlanMd(original)
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(extractBriefShape(r.brief)).toEqual(
      extractBriefShape(original.brief),
    )
  })

  it('round-trips a minimal continuous state', () => {
    const original = fullStateForRoundTrip({
      brief: {
        metric_type: 'continuous',
        metric_name: 'arpu',
        baseline: { value: 100, unit: null },
        mde: { value: 5, unit: 'relative_percent', direction: 'increase' },
        daily_traffic: { value: 30000, unit: 'user' },
        guardrails: [],
        hypothesis: {
          text: 'ARPU вырастет на 5% после редизайна',
          slots: {},
        },
      },
      plan: {
        derived: {
          sample_size_per_arm: 6280,
          duration_days: 1,
          test_method: 't_test',
          warnings: [],
          approximate: true,
        },
      },
    })
    const md = renderTestPlanMd(original)
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(extractBriefShape(r.brief)).toEqual(
      extractBriefShape(original.brief),
    )
  })
})

// ---- Approved status ---------------------------------------------------

describe('parseTestPlanMd — approved status', () => {
  it('reads status=approved and maps approved_at to ISO string', () => {
    const r = parseTestPlanMd(approvedMd())
    expect(r.ok).toBe(true)
    expect(r.plan.status).toBe('approved')
    expect(r.plan.approvedAt).toBe('2026-05-20T10:00:00.000Z')
  })
})

// ---- Structural errors (ok: false) -------------------------------------

describe('parseTestPlanMd — structural errors', () => {
  it('rejects an empty string', () => {
    const r = parseTestPlanMd('')
    expect(r.ok).toBe(false)
    expect(r.error.message).toMatch(/пуст/i)
  })

  it('rejects markdown without frontmatter delimiters', () => {
    const r = parseTestPlanMd('# Just a heading\n\nSome text.\n')
    expect(r.ok).toBe(false)
    expect(r.error.message).toMatch(/frontmatter|---/i)
  })

  it('rejects frontmatter with no closing delimiter', () => {
    const r = parseTestPlanMd(
      '---\ntest_id: foo\nstatus: draft\n\nbody text\n',
    )
    expect(r.ok).toBe(false)
    expect(r.error.message).toMatch(/закрыв|frontmatter/i)
  })

  it('rejects malformed YAML (unclosed bracket)', () => {
    const broken = `---
metric_type: proportion
guardrails: [
---

body
`
    const r = parseTestPlanMd(broken)
    expect(r.ok).toBe(false)
    expect(r.error.message).toMatch(/YAML/i)
  })

  it('rejects non-string input', () => {
    const r = parseTestPlanMd(null)
    expect(r.ok).toBe(false)
    expect(r.error.message).toMatch(/строк/i)
  })
})

// ---- Field-level validation (warnings, parsing continues) ---------------

describe('parseTestPlanMd — field validation produces warnings', () => {
  it('warns on invalid metric_type and falls back to null', () => {
    const md = validProportionMd().replace(
      'metric_type: proportion',
      'metric_type: weird',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.metric_type).toBeNull()
    expect(r.warnings.join(' ')).toMatch(/metric_type/)
  })

  it('warns on invalid mde.unit', () => {
    const md = validProportionMd().replace(
      'unit: relative_percent\ndirection: increase',
      'unit: weird_unit\ndirection: increase',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.warnings.some((w) => w.includes('mde.unit'))).toBe(true)
  })

  it('warns when alpha is not a number', () => {
    const md = validProportionMd().replace('alpha: 0.05', 'alpha: "abc"')
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    // alpha falls back to default 0.05
    expect(r.brief.advanced.alpha).toBe(0.05)
    expect(r.warnings.some((w) => w.includes('alpha'))).toBe(true)
  })

  it('warns when required metric_name is missing', () => {
    const md = validProportionMd().replace(
      /metric_name: cr_to_partner_click\n/,
      '',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.metric_name).toBe('')
    expect(r.warnings.some((w) => w.includes('metric_name'))).toBe(true)
  })

  it('handles empty guardrails array without warning', () => {
    const r = parseTestPlanMd(continuousMd())
    expect(r.ok).toBe(true)
    expect(r.brief.guardrails).toEqual([])
    expect(
      r.warnings.some((w) => w.toLowerCase().includes('guardrail')),
    ).toBe(false)
  })
})

// ---- Hypothesis section --------------------------------------------------

describe('parseTestPlanMd — hypothesis section', () => {
  it('warns when ## Hypothesis section is missing', () => {
    const md = validProportionMd().replace(
      /## Hypothesis\nЕсли[^\n]+\n/,
      '',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.hypothesis.text).toBe('')
    expect(r.warnings.some((w) => w.includes('Hypothesis'))).toBe(true)
  })

  it('captures multi-line hypothesis text', () => {
    const md = validProportionMd().replace(
      /## Hypothesis\nЕсли[^\n]+\n/,
      '## Hypothesis\nЕсли мы покажем новый блок,\nто CR вырастет на 8%,\nпотому что больше офферов\n\n',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.hypothesis.text).toContain('Если мы покажем')
    expect(r.brief.hypothesis.text).toContain('потому что больше офферов')
  })

  it('re-derives mde.direction from hypothesis verb', () => {
    const md = validProportionMd().replace(
      'direction: increase',
      'direction: any',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    // Hypothesis says "вырастет" → direction should be increase
    expect(r.brief.mde.direction).toBe('increase')
  })
})

// ---- Frontmatter vs section mismatch -----------------------------------

describe('parseTestPlanMd — frontmatter wins over section', () => {
  it('ignores ## Guardrails section content, uses frontmatter list', () => {
    // Frontmatter has 2 guardrails; body section text has 1.
    const md = validProportionMd().replace(
      /## Guardrails\n- bounce_rate \(max \+5% rel\.\)\n/,
      '## Guardrails\n- bounce_rate (max +5% rel.)\n- something_else\n- third_one\n',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    // Two guardrails from frontmatter, body section ignored.
    expect(r.brief.guardrails).toHaveLength(2)
    expect(r.brief.guardrails.map((g) => g.name)).toEqual([
      'bounce_rate',
      'time_on_site',
    ])
  })

  it('ignores ## Decision rules section content', () => {
    // Decision rules don't appear in brief output after parse (no field for them in YAML).
    const r = parseTestPlanMd(validProportionMd())
    expect(r.ok).toBe(true)
    expect(r.brief.decision_rules).toEqual({
      ship: '',
      iterate: '',
      kill: '',
    })
  })
})

// ---- Edge cases / robustness -------------------------------------------

describe('parseTestPlanMd — edge cases', () => {
  it('strips BOM from start of file', () => {
    const md = '﻿' + validProportionMd()
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.metric_type).toBe('proportion')
  })

  it('handles CRLF line endings', () => {
    const md = validProportionMd().replace(/\n/g, '\r\n')
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.metric_type).toBe('proportion')
  })

  it('exposes test_id and title from frontmatter for caller', () => {
    const r = parseTestPlanMd(validProportionMd())
    expect(r.test_id).toBe('bm-main-cta-v2')
    expect(r.title).toBe('New CTA test')
  })

  it('preserves data_peek when valid', () => {
    const md = validProportionMd().replace(
      'uploaded: false',
      'uploaded: true',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.data_peek).toMatchObject({ uploaded: true })
  })
})

// ---- Phase C: metric_name semantic shift + goal_description -------------

describe('parseTestPlanMd — metric_name / metric_label semantic shift', () => {
  it('reads metric_label as natural label and metric_name as column code', () => {
    const md = validProportionMd().replace(
      /metric_name: cr_to_partner_click\n/,
      'metric_name: cr_to_partner_click\nmetric_label: "конверсия в клик по партнёру"\n',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.metric_column).toBe('cr_to_partner_click')
    expect(r.brief.metric_name).toBe('конверсия в клик по партнёру')
  })

  it('legacy YAML without metric_label leaves brief.metric_name empty', () => {
    const r = parseTestPlanMd(validProportionMd())
    expect(r.ok).toBe(true)
    expect(r.brief.metric_column).toBe('cr_to_partner_click')
    expect(r.brief.metric_name).toBe('')
  })

  it('round-trips brief.metric_column + brief.metric_name through render+parse', () => {
    const original = fullStateForRoundTrip({
      brief: {
        metric_column: 'cr_first_deposit',
        metric_name: 'конверсия в первый депозит',
      },
    })
    const md = renderTestPlanMd(original)
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.metric_column).toBe('cr_first_deposit')
    expect(r.brief.metric_name).toBe('конверсия в первый депозит')
  })
})

describe('parseTestPlanMd — goal_description', () => {
  it('reads goal_description from YAML when present', () => {
    const md = validProportionMd().replace(
      /metric_name: cr_to_partner_click\n/,
      'metric_name: cr_to_partner_click\ngoal_description: "тестируем баннер прайсинга"\n',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.goal_description).toBe('тестируем баннер прайсинга')
  })

  it('round-trips non-empty goal_description', () => {
    const original = fullStateForRoundTrip({
      brief: {
        goal_description: 'тестируем баннер прайсинга',
      },
    })
    const md = renderTestPlanMd(original)
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.goal_description).toBe('тестируем баннер прайсинга')
  })
})

// ---- Sprint 4 iter 2: round-trip extensions -----------------------------

describe('parseTestPlanMd — Sprint 4 iter 2 readers', () => {
  it('reads goal_type and sets defaultsApplied.goal_type=true', () => {
    const md = validProportionMd().replace(
      /metric_name: cr_to_partner_click\n/,
      'metric_name: cr_to_partner_click\ngoal_type: other\ngoal_description: "оптимизация воронки"\n',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.goal_type).toBe('other')
    expect(r.brief.goal_description).toBe('оптимизация воронки')
    expect(r.brief.defaultsApplied.goal_type).toBe(true)
    expect(r.brief.defaultsApplied.randomization_unit).toBe(true)
  })

  it('reads stop_conditions object with length_cap_days', () => {
    const md = validProportionMd().replace(
      /---\n\n# Test Plan/,
      'stop_conditions:\n  srm_detected: true\n  guardrail_breach_24h: false\n  length_cap_days: 14\n  manual_stop: true\n---\n\n# Test Plan',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.stop_conditions).toEqual({
      srm_detected: true,
      guardrail_breach_24h: false,
      length_cap_days: 14,
      manual_stop: true,
    })
  })

  it('reads decision_rules object with custom rules', () => {
    const md = validProportionMd().replace(
      /---\n\n# Test Plan/,
      'decision_rules:\n  ship: "ship me"\n  iterate: ""\n  kill: "kill it"\n---\n\n# Test Plan',
    )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.decision_rules).toEqual({
      ship: 'ship me',
      iterate: '',
      kill: 'kill it',
    })
  })

  it('reads ratio_components numerator/denominator + cluster_field + two_sided', () => {
    const md = validProportionMd()
      .replace(
        /metric_name: cr_to_partner_click\n/,
        'metric_name: cr_to_partner_click\nratio_numerator: clicks\nratio_denominator: views\ncluster_field: campaign_id\ntwo_sided: false\n',
      )
    const r = parseTestPlanMd(md)
    expect(r.ok).toBe(true)
    expect(r.brief.ratio_components).toEqual({
      numerator: 'clicks',
      denominator: 'views',
    })
    expect(r.brief.cluster_field).toBe('campaign_id')
    expect(r.brief.advanced.two_sided).toBe(false)
  })

  it('legacy YAML without new fields parses with silent defaults (no warnings for absence)', () => {
    const r = parseTestPlanMd(validProportionMd())
    expect(r.ok).toBe(true)
    // Defaults from emptyBriefShape
    expect(r.brief.goal_type).toBeNull()
    expect(r.brief.ratio_components).toEqual({ numerator: null, denominator: null })
    expect(r.brief.cluster_field).toBeNull()
    expect(r.brief.advanced.two_sided).toBe(true)
    expect(r.brief.stop_conditions).toEqual({
      srm_detected: true,
      guardrail_breach_24h: true,
      length_cap_days: null,
      manual_stop: false,
    })
    expect(r.brief.decision_rules).toEqual({ ship: '', iterate: '', kill: '' })
    // None of the new optional fields should produce a warning when absent.
    const newFieldWarnings = r.warnings.filter((w) =>
      /goal_type|ratio_numerator|ratio_denominator|cluster_field|two_sided|stop_conditions|decision_rules/.test(w),
    )
    expect(newFieldWarnings).toEqual([])
  })
})
