import { describe, it, expect } from 'vitest'
import { buildReportHtml } from '../../../src/lib/results/report-html.js'

function makeState(over = {}) {
  return {
    test_id: 'cr-checkout-v1',
    title: 'Тест: CR checkout',
    brief: {
      metric_name: 'CR checkout',
      metric_type: 'proportion',
      advanced: { alpha: 0.05, power: 0.8 },
      mde: { value: 2, unit: 'relative_percent', direction: 'increase' },
      hypothesis: { text: 'Кнопка зелёная → CR вырастет на 2%' },
      decision_rules: {
        ship: 'delta_rel > 1',
        iterate: '',
        kill: 'ci_upper < 0',
      },
    },
    plan: { derived: { test_method: 'z_test_proportions', sample_size_per_arm: 5000 } },
    results: {
      source: 'ipynb',
      raw_results: {
        control_n: 5000,
        treatment_n: 5050,
        delta_rel: 2.3,
        p_value: 0.012,
        ci_lower: 0.005,
        ci_upper: 0.041,
      },
      user_overrides: {},
      images: [{ base64_png: 'AAA' }, { base64_png: 'BBB' }],
      user_decision: 'SHIP',
      user_checks: {},
    },
    ...over,
  }
}

describe('buildReportHtml', () => {
  it('produces valid HTML5 with all sections', () => {
    const html = buildReportHtml(makeState())
    expect(html).toMatch(/<!DOCTYPE html>/)
    expect(html).toMatch(/<title>cr-checkout-v1/)
    expect(html).toMatch(/TL;DR/)
    expect(html).toMatch(/Гипотеза и дизайн/)
    expect(html).toMatch(/Результаты/)
    expect(html).toMatch(/Sanity checks/)
    expect(html).toMatch(/Применение decision rules/)
    expect(html).toMatch(/Принятое решение/)
  })

  it('embeds PNG images as data URLs', () => {
    const html = buildReportHtml(makeState())
    expect(html).toMatch(/data:image\/png;base64,AAA/)
    expect(html).toMatch(/data:image\/png;base64,BBB/)
  })

  it('shows user_decision when set', () => {
    const html = buildReportHtml(makeState())
    expect(html).toMatch(/<strong>SHIP<\/strong>/)
  })

  it('shows [Заполни вручную] when no user_decision', () => {
    const s = makeState()
    s.results.user_decision = null
    const html = buildReportHtml(s)
    expect(html).toMatch(/Заполни вручную/)
  })

  it('manual flow (no images) renders without crash', () => {
    const s = makeState()
    s.results.images = []
    const html = buildReportHtml(s)
    expect(html).not.toMatch(/data:image\/png/)
    expect(html).toMatch(/n control = 5 000|n control = 5,000|n control = 5 000/)
  })

  it('user_overrides supersede raw_results', () => {
    const s = makeState()
    s.results.user_overrides = { delta_rel: 99.9 }
    const html = buildReportHtml(s)
    expect(html).toMatch(/99\.9/)
  })

  it('escapes HTML in user input', () => {
    const s = makeState()
    s.brief.hypothesis.text = '<script>alert("x")</script>'
    const html = buildReportHtml(s)
    expect(html).not.toMatch(/<script>alert/)
    expect(html).toMatch(/&lt;script&gt;/)
  })

  // FIX iter 1 — F-8/F-9c: explicit significance + novelty badges in TL;DR.
  it('shows an OK significance badge when p < alpha', () => {
    const html = buildReportHtml(makeState()) // p=0.012, alpha=0.05
    expect(html).toMatch(/significance-badge ok/)
    expect(html).toMatch(/Statistically significant/)
  })

  it('shows a WARN significance badge when p >= alpha', () => {
    const s = makeState()
    s.results.raw_results.p_value = 0.5
    const html = buildReportHtml(s)
    expect(html).toMatch(/significance-badge warn/)
    expect(html).toMatch(/Not statistically significant/)
  })

  it('shows a WARN novelty badge when novelty_flag is true', () => {
    const s = makeState()
    s.results.raw_results.novelty_flag = true
    const html = buildReportHtml(s)
    expect(html).toMatch(/novelty-badge warn/)
    expect(html).toMatch(/Novelty effect suspected/)
  })

  it('omits the novelty badge when novelty_flag is absent', () => {
    const html = buildReportHtml(makeState()) // no novelty_flag
    // CSS always defines .novelty-badge; assert the rendered div is absent.
    expect(html).not.toMatch(/class="novelty-badge/)
  })

  it('omits the novelty badge when novelty_flag is explicitly null', () => {
    const s = makeState()
    s.results.raw_results.novelty_flag = null
    const html = buildReportHtml(s)
    expect(html).not.toMatch(/class="novelty-badge/)
  })

  // FIX iter 2 — G-2: honest CI unit label in TL;DR (no *100 conversion).
  it('labels CI as абс. разность долей for proportion', () => {
    const html = buildReportHtml(makeState()) // metric_type: proportion
    expect(html).toMatch(/абс\. разность долей/)
  })

  it('labels CI with metric units for continuous', () => {
    const s = makeState()
    s.brief.metric_type = 'continuous'
    s.brief.metric_name = 'ARPU'
    const html = buildReportHtml(s)
    expect(html).toMatch(/абс\. разность, ед\. ARPU/)
  })
})
