import { describe, it, expect } from 'vitest'
import {
  buildFileMap,
  buildZipFileName,
} from '../../../src/lib/results/zip.js'

function makeState() {
  return {
    test_id: 'cr-checkout-v1',
    title: 'CR checkout',
    brief: {
      metric_name: 'CR checkout',
      metric_type: 'proportion',
      advanced: { alpha: 0.05, power: 0.8 },
      mde: { value: 2, unit: 'relative_percent', direction: 'increase' },
      decision_rules: { ship: '', iterate: '', kill: '' },
    },
    plan: { derived: { sample_size_per_arm: 5000 } },
    results: {
      raw_results: { control_n: 5000, treatment_n: 5000, delta_rel: 1, p_value: 0.5, ci_lower: 0, ci_upper: 0.02 },
      user_overrides: {},
      user_decision: null,
      images: [],
      user_checks: {},
    },
  }
}

describe('buildFileMap', () => {
  it('always includes report.html and readout.md', () => {
    const files = buildFileMap(makeState())
    expect(files['report.html']).toMatch(/<!DOCTYPE html>/)
    expect(files['readout.md']).toMatch(/test_id:/)
  })

  it('includes test_plan.md when provided', () => {
    const files = buildFileMap(makeState(), { testPlanMd: '# plan' })
    expect(files['test_plan.md']).toBe('# plan')
  })

  it('includes analysis.ipynb when ipynbRawText provided', () => {
    const files = buildFileMap(makeState(), { ipynbRawText: '{"nbformat":4}' })
    expect(files['analysis.ipynb']).toBe('{"nbformat":4}')
  })

  it('omits experiment_results.csv when csvText empty', () => {
    const files = buildFileMap(makeState())
    expect(files['experiment_results.csv']).toBeUndefined()
  })

  it('includes experiment_results.csv when csvText provided', () => {
    const files = buildFileMap(makeState(), { csvText: 'user_id,variant\n1,A\n' })
    expect(files['experiment_results.csv']).toMatch(/user_id,variant/)
  })
})

describe('buildZipFileName', () => {
  it('format: {test_id}_{YYYY-MM-DD}.zip', () => {
    const name = buildZipFileName(makeState())
    expect(name).toMatch(/^cr-checkout-v1_\d{4}-\d{2}-\d{2}\.zip$/)
  })

  it('falls back to stat-plan-test when test_id missing', () => {
    const name = buildZipFileName({})
    expect(name).toMatch(/^stat-plan-test_\d{4}-\d{2}-\d{2}\.zip$/)
  })
})
