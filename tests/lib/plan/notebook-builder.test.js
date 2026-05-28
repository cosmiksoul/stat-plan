import { describe, it, expect } from 'vitest'
import { buildNotebook, CELL_CATALOG } from '../../../src/lib/plan/notebook-builder.js'

const MANDATORY = [
  'load',
  'srm',
  'balance',
  'novelty',
  'main_test',
  'guardrails',
]

function makeState(overrides = {}) {
  return {
    test_id: null,
    title: null,
    brief: {
      goal_type: 'product_change',
      hypothesis: { text: 'CR вырастет', slots: {} },
      metric_type: 'proportion',
      metric_name: 'cr_to_click',
      metric_column: 'converted',
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
      ],
      stop_conditions: {},
      decision_rules: { ship: 'CI ≥ +3% rel.', iterate: '', kill: '' },
      advanced: { alpha: 0.05, power: 0.8, two_sided: true },
    },
    plan: {
      status: 'approved',
      derived: {
        sample_size_per_arm: 80000,
        duration_days: 5,
        test_method: 'z_test_proportions',
        warnings: [],
        approximate: false,
      },
      score: { total: 80 },
    },
    notebook_config: {
      cells_enabled: [...MANDATORY],
      demo_csv_choice: null,
    },
    ...overrides,
  }
}

function flatSource(cell) {
  return Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '')
}

function flatAllSources(json) {
  return json.cells.map(flatSource).join('\n')
}

// ---- 4 happy-path: one per test_method ---------------------------------

describe('buildNotebook — happy path per test_method', () => {
  it('builds for z_test_proportions', () => {
    const { json, warnings } = buildNotebook(makeState())
    expect(json.nbformat).toBe(4)
    expect(json.metadata.statplan.test_id).toBe('cr_to_click-v1')
    expect(flatAllSources(json)).toContain('proportions_ztest')
    expect(warnings.filter((w) => w.includes('пропущена'))).toEqual([])
  })

  it('builds for t_test', () => {
    const state = makeState({
      brief: {
        ...makeState().brief,
        metric_type: 'continuous',
        metric_name: 'arpu',
        metric_column: 'arpu',
        baseline: { value: 100, unit: null },
      },
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, test_method: 't_test' },
      },
    })
    const { json } = buildNotebook(state)
    expect(flatAllSources(json)).toContain('equal_var=True')
  })

  it('builds for welch_t_test', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: {
          ...makeState().plan.derived,
          test_method: 'welch_t_test',
        },
      },
    })
    const { json } = buildNotebook(state)
    expect(flatAllSources(json)).toContain('equal_var=False')
  })

  it('builds for bootstrap', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, test_method: 'bootstrap' },
      },
    })
    const { json } = buildNotebook(state)
    expect(flatAllSources(json)).toContain('np.random.default_rng')
    expect(flatAllSources(json)).toContain('boot_diffs')
  })
})

// ---- Optional cells & ordering -----------------------------------------

describe('buildNotebook — optional cells', () => {
  it('includes segments and bootstrap_ci when enabled, after main_test', () => {
    const state = makeState({
      notebook_config: {
        cells_enabled: [...MANDATORY, 'segments', 'bootstrap_ci'],
        demo_csv_choice: null,
      },
    })
    const { json, finalEnabled } = buildNotebook(state)
    expect(finalEnabled).toContain('segments')
    expect(finalEnabled).toContain('bootstrap_ci')
    // segments and bootstrap_ci come after main_test in the cells_enabled
    // order; both should appear in the body somewhere.
    const text = flatAllSources(json)
    expect(text).toContain('Сегментный анализ')
    expect(text).toContain('Bootstrap CI')
  })
})

// ---- Conditional skips --------------------------------------------------

describe('buildNotebook — conditional skips', () => {
  it('skips novelty when duration_days < 3 and adds a warning', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, duration_days: 2 },
      },
    })
    const { json, warnings, finalEnabled } = buildNotebook(state)
    expect(finalEnabled).not.toContain('novelty')
    expect(flatAllSources(json)).not.toContain('Novelty effect')
    expect(warnings.some((w) => w.includes('novelty'))).toBe(true)
  })

  it('skips guardrails when brief.guardrails is empty', () => {
    const state = makeState({
      brief: { ...makeState().brief, guardrails: [] },
    })
    const { json, warnings, finalEnabled } = buildNotebook(state)
    expect(finalEnabled).not.toContain('guardrails')
    expect(flatAllSources(json)).not.toContain('## Guardrails')
    expect(warnings.some((w) => w.includes('guardrails'))).toBe(true)
  })

  it('warns when test_method is mannwhitney (uses bootstrap fallback)', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, test_method: 'mannwhitney' },
      },
    })
    const { warnings, json } = buildNotebook(state)
    expect(warnings.some((w) => w.includes('mannwhitney'))).toBe(true)
    expect(flatAllSources(json)).toContain('Bootstrap')
  })
})

// ---- Header cell --------------------------------------------------------

describe('buildNotebook — header cell', () => {
  it('contains test_id, method, sample size, duration, alpha/power, MDE', () => {
    const { json } = buildNotebook(makeState())
    const header = flatSource(json.cells[0])
    expect(header).toContain('Analysis: cr_to_click-v1')
    expect(header).toContain('cr_to_click')
    expect(header).toContain('z_test_proportions')
    expect(header).toContain('80000')
    expect(header).toContain('5 days')
    expect(header).toContain('α = 0.05')
    expect(header).toContain('power = 0.8')
    expect(header).toContain('8% rel.')
  })

  it('contains Expected CSV schema with main columns', () => {
    const { json } = buildNotebook(makeState())
    const header = flatSource(json.cells[0])
    expect(header).toContain('Expected CSV schema')
    expect(header).toContain('user_id')
    expect(header).toContain('variant')
    expect(header).toContain('converted')
    expect(header).toContain('bounce_rate')
    expect(header).toContain('day') // novelty enabled
  })

  it('lists decision rules from brief', () => {
    const { json } = buildNotebook(makeState())
    const header = flatSource(json.cells[0])
    expect(header).toContain('SHIP')
    expect(header).toContain('CI ≥ +3% rel.')
  })
})

// ---- Placeholders -------------------------------------------------------

describe('buildNotebook — placeholders', () => {
  it('substitutes {{metric_column}} with the brief column name', () => {
    const { json } = buildNotebook(makeState())
    const text = flatAllSources(json)
    expect(text).toContain("metric_col = 'converted'")
  })

  it('leaves no {{...}} markers in the final JSON', () => {
    const { json } = buildNotebook(makeState())
    const serialized = JSON.stringify(json)
    expect(serialized).not.toMatch(/\{\{\w+\}\}/)
  })

  it('substitutes {{guardrails_py_list}} with a Python list literal', () => {
    const { json } = buildNotebook(makeState())
    const text = flatAllSources(json)
    expect(text).toContain("guardrail_cols = ['bounce_rate']")
  })
})

// ---- Filename + JSON shape ---------------------------------------------

describe('buildNotebook — filename and JSON shape', () => {
  it('filename uses test_id + _analysis.ipynb', () => {
    const { filename } = buildNotebook(makeState())
    expect(filename).toBe('cr_to_click-v1_analysis.ipynb')
  })

  it('uses explicit state.test_id when provided', () => {
    const state = makeState({ test_id: 'custom-id-xyz' })
    const { filename, json } = buildNotebook(state)
    expect(filename).toBe('custom-id-xyz_analysis.ipynb')
    expect(json.metadata.statplan.test_id).toBe('custom-id-xyz')
  })

  it('JSON.stringify on the result does not throw', () => {
    const { json } = buildNotebook(makeState())
    expect(() => JSON.stringify(json)).not.toThrow()
  })

  it('every code cell has execution_count and outputs fields', () => {
    const { json } = buildNotebook(makeState())
    for (const cell of json.cells) {
      if (cell.cell_type === 'code') {
        expect(cell).toHaveProperty('execution_count')
        expect(cell).toHaveProperty('outputs')
        expect(Array.isArray(cell.outputs)).toBe(true)
      }
    }
  })
})

// ---- Edge cases ---------------------------------------------------------

describe('buildNotebook — edge cases', () => {
  it('runs with no enabled cells (just produces a header)', () => {
    const state = makeState({
      notebook_config: { cells_enabled: [], demo_csv_choice: null },
    })
    const { json } = buildNotebook(state)
    expect(json.cells).toHaveLength(1)
    expect(json.cells[0].cell_type).toBe('markdown')
  })

  it('derives test_id from metric_name when state.test_id is null', () => {
    const state = makeState({ test_id: null })
    const { filename } = buildNotebook(state)
    expect(filename).toBe('cr_to_click-v1_analysis.ipynb')
  })

  it('falls back to metric_name when metric_column is empty (parsed-md case)', () => {
    const state = makeState({
      brief: {
        ...makeState().brief,
        metric_type: 'continuous',
        metric_column: '',
        metric_name: 'arpu',
      },
    })
    const { json } = buildNotebook(state)
    const text = flatAllSources(json)
    expect(text).toContain("metric_col = 'arpu'")
  })
})

// ---- Header fallback warning blockquote (Sprint 4 FIX A.2) -------------

describe('buildNotebook — header fallback warning', () => {
  it('adds ⚠️ blockquote for delta_method with delta-method mention', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, test_method: 'delta_method' },
      },
    })
    const { json } = buildNotebook(state)
    const header = flatSource(json.cells[0])
    expect(header).toContain('⚠️')
    expect(header).toContain('delta_method')
    expect(header).toContain('delta-method')
  })

  it('adds ⚠️ blockquote for mannwhitney with mannwhitney mention', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, test_method: 'mannwhitney' },
      },
    })
    const { json } = buildNotebook(state)
    const header = flatSource(json.cells[0])
    expect(header).toContain('⚠️')
    expect(header).toContain('mannwhitney')
  })

  it('does NOT add ⚠️ blockquote for z_test_proportions', () => {
    const { json } = buildNotebook(makeState())
    const header = flatSource(json.cells[0])
    expect(header).not.toContain('⚠️')
  })
})

// ---- Slugify ё (Sprint 4 FIX A.3) --------------------------------------

describe('buildNotebook — slugify keeps ё', () => {
  it('preserves ё in test_id when metric_name contains ё', () => {
    const state = makeState({
      test_id: null,
      brief: {
        ...makeState().brief,
        metric_name: 'продлёнка подписки',
      },
    })
    const { filename, json } = buildNotebook(state)
    expect(filename).toContain('ё')
    expect(json.metadata.statplan.test_id).toContain('ё')
  })
})

// ---- Duration grammar (Sprint 4 FIX A.4) -------------------------------

describe('buildNotebook — header duration grammar', () => {
  it('renders "1 day" singular for duration_days=1', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, duration_days: 1 },
      },
    })
    const { json } = buildNotebook(state)
    const header = flatSource(json.cells[0])
    expect(header).toContain('1 day\n')
    expect(header).not.toContain('1 days')
  })

  it('renders "2 days" plural for duration_days=2', () => {
    const state = makeState({
      plan: {
        ...makeState().plan,
        derived: { ...makeState().plan.derived, duration_days: 2 },
      },
    })
    const { json } = buildNotebook(state)
    const header = flatSource(json.cells[0])
    expect(header).toContain('2 days')
  })
})

// ---- Catalog ------------------------------------------------------------

describe('CELL_CATALOG', () => {
  it('lists 8 cells: 6 mandatory + 2 optional', () => {
    const ids = Object.keys(CELL_CATALOG)
    expect(ids).toEqual([
      'load',
      'srm',
      'balance',
      'novelty',
      'main_test',
      'guardrails',
      'segments',
      'bootstrap_ci',
    ])
    const mandatory = ids.filter((id) => CELL_CATALOG[id].mandatory)
    expect(mandatory).toHaveLength(6)
  })
})
