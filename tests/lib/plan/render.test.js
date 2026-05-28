import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderTestPlanMd } from '../../../src/lib/plan/render.js'

// Freeze date so "created:" is stable across runs.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-16T12:00:00Z'))
})

function fullState() {
  return {
    brief: {
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
      decision_rules: {
        ship: 'CI не пересекает 0, нижняя граница ≥ +3% rel.',
        iterate: 'Статистически незначимо, но direction positive в 2+ сегментах',
        kill: 'Guardrail breach или CI ≤ −3% rel.',
      },
      advanced: {
        alpha: 0.05,
        power: 0.8,
        two_sided: true,
        variance_reduction: null,
        stratification_by: null,
        holdback_percent: null,
      },
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
    },
  }
}

describe('renderTestPlanMd — structure', () => {
  it('starts and ends frontmatter with --- delimiters', () => {
    const md = renderTestPlanMd(fullState())
    expect(md.startsWith('---\n')).toBe(true)
    // Second --- is on its own line
    const lines = md.split('\n')
    const dashLines = lines
      .map((l, i) => [l, i])
      .filter(([l]) => l === '---')
    expect(dashLines.length).toBeGreaterThanOrEqual(2)
  })

  it('frontmatter is on top, markdown sections come after', () => {
    const md = renderTestPlanMd(fullState())
    const frontmatterEnd = md.indexOf('\n---\n', 4) // skip the opening ---
    const firstHeadingIdx = md.indexOf('# Test Plan')
    expect(firstHeadingIdx).toBeGreaterThan(frontmatterEnd)
  })

  it('includes all required frontmatter fields', () => {
    const md = renderTestPlanMd(fullState())
    expect(md).toContain('test_id:')
    expect(md).toContain('status: draft')
    expect(md).toContain('metric_type: proportion')
    expect(md).toContain('metric_name: cr_to_partner_click')
    expect(md).toContain('test_method: z_test_proportions')
    expect(md).toContain('randomization_unit: user')
    expect(md).toContain('alpha: 0.05')
    expect(md).toContain('power: 0.8')
    expect(md).toContain('sample_size_per_arm: 79620')
    expect(md).toContain('duration_days: 4')
    expect(md).toContain('daily_traffic_available: 50000')
  })

  it('renders MDE as nested object with value and unit', () => {
    const md = renderTestPlanMd(fullState())
    expect(md).toMatch(/mde:\n {2}value: 8\n {2}unit: relative_percent/)
    expect(md).toContain('direction: increase')
  })

  it('renders guardrails as a YAML list with name/direction/threshold/unit', () => {
    const md = renderTestPlanMd(fullState())
    expect(md).toMatch(
      /guardrails:\n {2}- name: bounce_rate\n {4}direction: max\n {4}threshold: 5\n {4}unit: relative_percent/,
    )
    expect(md).toMatch(
      /- name: time_on_site\n {4}direction: min\n {4}threshold: -10\n {4}unit: relative_percent/,
    )
  })

  it('includes hypothesis text in markdown section', () => {
    const md = renderTestPlanMd(fullState())
    expect(md).toMatch(/## Hypothesis\nЕсли показать блок/)
  })

  it('renders decision rules with SHIP/ITERATE/KILL bullets', () => {
    const md = renderTestPlanMd(fullState())
    expect(md).toMatch(/- \*\*SHIP\*\*:/)
    expect(md).toMatch(/- \*\*ITERATE\*\*:/)
    expect(md).toMatch(/- \*\*KILL\*\*:/)
  })

  it('renders stop conditions as bullets', () => {
    const md = renderTestPlanMd(fullState())
    expect(md).toMatch(/## Stop conditions/)
    expect(md).toContain('- SRM detected')
    expect(md).toContain('- Guardrail breach > 24h')
    expect(md).toContain('- Length cap: 10 days')
  })

  it('approved status reflects in frontmatter', () => {
    const state = fullState()
    state.plan.status = 'approved'
    state.plan.approvedAt = '2026-05-16T12:00:00.000Z'
    const md = renderTestPlanMd(state)
    expect(md).toContain('status: approved')
    expect(md).toContain('approved_at:')
  })
})

describe('renderTestPlanMd — minimal state', () => {
  it('renders without crashing on empty brief', () => {
    const minimal = {
      brief: {
        hypothesis: { text: '', slots: {} },
        baseline: { value: null, unit: null },
        mde: { value: null, unit: 'relative_percent', direction: 'increase' },
        daily_traffic: { value: null, unit: 'user' },
        guardrails: [],
        stop_conditions: {},
        decision_rules: {},
        advanced: { alpha: 0.05, power: 0.8 },
      },
      plan: { status: 'draft', approvedAt: null, derived: {}, score: {} },
    }
    const md = renderTestPlanMd(minimal)
    expect(md).toContain('---')
    expect(md).toContain('sample_size_per_arm: null')
    expect(md).toContain('guardrails:\n  []')
  })
})

describe('renderTestPlanMd — continuous metric', () => {
  it('handles continuous metric with t_test', () => {
    const state = fullState()
    state.brief.metric_type = 'continuous'
    state.brief.baseline = { value: 100, unit: null }
    state.brief.mde = { value: 5, unit: 'relative_percent', direction: 'increase' }
    state.plan.derived = {
      sample_size_per_arm: 6280,
      duration_days: 1,
      test_method: 't_test',
      warnings: [],
      approximate: true,
    }
    const md = renderTestPlanMd(state)
    expect(md).toContain('metric_type: continuous')
    expect(md).toContain('test_method: t_test')
    expect(md).toContain('baseline: 100')
  })
})

describe('renderTestPlanMd — snapshot of full output', () => {
  it('matches inline snapshot for full state', () => {
    const md = renderTestPlanMd(fullState())
    expect(md).toMatchInlineSnapshot(`
      "---
      test_id: cr_to_partner_click-v1
      title: "Тест: cr_to_partner_click"
      created: 2026-05-16
      status: draft
      approved_at: null

      # Test design
      metric_type: proportion
      metric_name: cr_to_partner_click
      metric_label: cr_to_partner_click
      goal_description: null
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

      # Scoring snapshot (информационно, при загрузке игнорируется и пересчитывается)
      score: 80
      ---

      # Test Plan: Тест: cr_to_partner_click

      ## Hypothesis
      Если показать блок, то CR вырастет на 8%, потому что больше офферов

      ## Guardrails
      - bounce_rate (max +5% rel.)
      - time_on_site (min −10% rel.)

      ## Stop conditions
      - SRM detected (chi² p < 0.001)
      - Guardrail breach > 24h
      - Length cap: 10 days

      ## Decision rules
      - **SHIP**: CI не пересекает 0, нижняя граница ≥ +3% rel.
      - **ITERATE**: Статистически незначимо, но direction positive в 2+ сегментах
      - **KILL**: Guardrail breach или CI ≤ −3% rel.

      ## Notes
      _(пусто)_
      "
    `)
  })
})
