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
      // After ADR-011: metric_name = natural human label, metric_column =
      // CSV column code. test_id and filename derive from metric_column;
      // notebook header title uses metric_name.
      metric_name: 'CR в клик',
      metric_column: 'cr_to_click',
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
  it('header title uses natural metric_name; filename/test_id use metric_column slug', () => {
    const { json, filename } = buildNotebook(makeState())
    const header = flatSource(json.cells[0])
    // Natural label goes into the visible h1 title (no "Analysis:" prefix
    // per Sprint 5 FIX C-4 — deriveTitle already supplies "Тест: ").
    expect(header).toContain('# Тест: CR в клик')
    expect(header).not.toContain('# Analysis:')
    // Metric line shows the natural label too.
    expect(header).toContain('Metric: `CR в клик`')
    // test_id and filename derive from metric_column (slugified).
    expect(json.metadata.statplan.test_id).toBe('cr_to_click-v1')
    expect(filename).toBe('cr_to_click-v1_analysis.ipynb')
    // Subtitle no longer claims test_plan.md lies next to the notebook.
    expect(header).not.toContain('рядом лежит test_plan.md')
    expect(header).toContain('генерируется отдельно в stat·plan')
    // Sanity: method + numbers still present.
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
    // metric_column is the CSV column name; it shows up in the schema row.
    expect(header).toContain('cr_to_click')
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
    expect(text).toContain("metric_col = 'cr_to_click'")
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
  it('runs with no enabled cells (header + always-on export-cell pair)', () => {
    const state = makeState({
      notebook_config: { cells_enabled: [], demo_csv_choice: null },
    })
    const { json } = buildNotebook(state)
    // Sprint 7 ADR-015: export-cell (markdown + code) is always appended.
    expect(json.cells).toHaveLength(3)
    expect(json.cells[0].cell_type).toBe('markdown')
    expect(json.cells[1].cell_type).toBe('markdown') // export markdown
    expect(json.cells[2].cell_type).toBe('code') // export code
    expect(json.cells[2].metadata.tags).toContain('stat-plan-results')
  })

  it('derives test_id from metric_column when state.test_id is null', () => {
    const state = makeState({ test_id: null })
    const { filename } = buildNotebook(state)
    expect(filename).toBe('cr_to_click-v1_analysis.ipynb')
  })

  it('falls back test_id to metric_name when metric_column is empty', () => {
    const state = makeState({
      test_id: null,
      brief: {
        ...makeState().brief,
        metric_type: 'continuous',
        metric_column: '',
        metric_name: 'arpu',
      },
    })
    const { json, filename } = buildNotebook(state)
    expect(filename).toBe('arpu-v1_analysis.ipynb')
    // deriveMetricColumn falls back too, so the CSV col label = metric_name.
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
  it('preserves ё in test_id when metric_column contains ё', () => {
    const state = makeState({
      test_id: null,
      brief: {
        ...makeState().brief,
        metric_column: 'продлёнка_подписки',
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

// ---- Sprint 7 ADR-015: export-cell + plt.rcParams ----------------------

describe('Sprint 7 — export-cell with stat-plan-results tag', () => {
  it('always appends an export-cell tagged stat-plan-results', () => {
    const { json } = buildNotebook(makeState())
    const tagged = json.cells.find(
      (c) => c.metadata?.tags?.includes('stat-plan-results'),
    )
    expect(tagged).toBeDefined()
    expect(tagged.cell_type).toBe('code')
    expect(flatSource(tagged)).toContain('json.dumps')
    expect(flatSource(tagged)).toContain('globals().get')
  })

  it('export-cell reads canonical variable names', () => {
    const { json } = buildNotebook(makeState())
    const tagged = json.cells.find(
      (c) => c.metadata?.tags?.includes('stat-plan-results'),
    )
    const src = flatSource(tagged)
    for (const name of [
      'control_n',
      'treatment_n',
      'delta_rel',
      'p_value',
      'ci_lower',
      'ci_upper',
      'srm_pvalue',
      'novelty_flag',
      'guardrail_results',
    ]) {
      expect(src).toContain(`'${name}'`)
    }
  })

  it('main_test variants bind canonical p_value/ci_lower/ci_upper/delta_rel', () => {
    for (const method of ['z_test_proportions', 't_test', 'welch_t_test', 'bootstrap']) {
      const state = makeState({
        plan: {
          ...makeState().plan,
          derived: { ...makeState().plan.derived, test_method: method },
        },
      })
      const { json } = buildNotebook(state)
      const all = flatAllSources(json)
      expect(all).toContain('p_value = float(p)')
      expect(all).toContain('ci_lower = float(ci_lo)')
      expect(all).toContain('ci_upper = float(ci_hi)')
      expect(all).toContain('delta_rel = float(rel_lift) * 100')
    }
  })

  it('srm cell binds srm_pvalue (renamed from ambiguous p)', () => {
    const { json } = buildNotebook(makeState())
    const all = flatAllSources(json)
    expect(all).toContain('srm_pvalue')
    expect(all).toContain('chi2_srm')
  })

  it('guardrails cell binds guardrail_results (not generic results)', () => {
    const { json } = buildNotebook(makeState())
    const all = flatAllSources(json)
    expect(all).toContain('guardrail_results')
  })

  it('novelty cell binds novelty_flag bool', () => {
    const { json } = buildNotebook(makeState())
    const all = flatAllSources(json)
    expect(all).toContain('novelty_flag = bool(')
  })
})

describe('Sprint 7 — plt.rcParams in load cell', () => {
  it('load cell sets matplotlib dark theme via plt.rcParams', () => {
    const { json } = buildNotebook(makeState())
    const all = flatAllSources(json)
    expect(all).toContain('import matplotlib.pyplot as plt')
    expect(all).toContain('plt.rcParams.update')
    expect(all).toContain('figure.facecolor')
    expect(all).toContain('#0e1014')
  })

  it('load cell binds control_n / treatment_n from df', () => {
    const { json } = buildNotebook(makeState())
    const all = flatAllSources(json)
    expect(all).toContain("control_n = int((df['variant'] == 'control')")
    expect(all).toContain("treatment_n = int((df['variant'] == 'treatment')")
  })
})

// ---- Sprint 7 S11: schema_overrides ------------------------------------

describe('Sprint 7 — schema_overrides rename + type', () => {
  it('renames metric_column via override in Python code', () => {
    const state = makeState({
      notebook_config: {
        ...makeState().notebook_config,
        schema_overrides: { cr_to_click: { rename: 'cr_to_click_v2' } },
      },
    })
    const { json } = buildNotebook(state)
    const all = flatAllSources(json)
    expect(all).toContain("metric_col = 'cr_to_click_v2'")
    expect(all).not.toContain("metric_col = 'cr_to_click'")
  })

  it('renames randomization_unit_column via override', () => {
    const state = makeState({
      notebook_config: {
        ...makeState().notebook_config,
        schema_overrides: { user_id: { rename: 'visitor_id' } },
      },
    })
    const { json, schema } = buildNotebook(state)
    expect(schema[0].column).toBe('visitor_id')
    expect(schema[0].original).toBe('user_id')
  })

  it('renames guardrail columns and reflects in py_repr lists', () => {
    const state = makeState({
      notebook_config: {
        ...makeState().notebook_config,
        schema_overrides: { bounce_rate: { rename: 'bounce_pct' } },
      },
    })
    const { json } = buildNotebook(state)
    const all = flatAllSources(json)
    expect(all).toContain("guardrail_cols = ['bounce_pct']")
    expect(all).toContain("'name': 'bounce_pct'")
  })

  it('renames day column for novelty cell', () => {
    const state = makeState({
      notebook_config: {
        ...makeState().notebook_config,
        schema_overrides: { day: { rename: 'experiment_day' } },
      },
    })
    const { json } = buildNotebook(state)
    const all = flatAllSources(json)
    expect(all).toContain("day_col = 'experiment_day'")
  })

  it('expectedSchema reflects type override in preview row', () => {
    const state = makeState({
      notebook_config: {
        ...makeState().notebook_config,
        schema_overrides: { cr_to_click: { type: 'float (legacy)' } },
      },
    })
    const { schema } = buildNotebook(state)
    const metricRow = schema.find((r) => r.original === 'cr_to_click')
    expect(metricRow.type).toBe('float (legacy)')
  })

  it('empty rename string is ignored (falls back to original)', () => {
    const state = makeState({
      notebook_config: {
        ...makeState().notebook_config,
        schema_overrides: { cr_to_click: { rename: '   ' } },
      },
    })
    const { schema } = buildNotebook(state)
    const metricRow = schema.find((r) => r.original === 'cr_to_click')
    expect(metricRow.column).toBe('cr_to_click')
  })
})
