// Build a Jupyter nbformat-4 JSON from state + selected cell templates.
// No React, no Python execution. The output is a pure JS object that the
// UI serializes via JSON.stringify and hands to the user as a Blob.
//
// Templates live in templates/notebook/*.cells.json — each one carries
// metadata (id, name, requires, default_enabled) plus an array of cells
// in the nbformat shape. Placeholders inside source strings (`{{var}}`)
// are substituted at build time from a flat map built from state.

import loadCells from '../../../templates/notebook/load.cells.json'
import srmCells from '../../../templates/notebook/srm.cells.json'
import balanceCells from '../../../templates/notebook/balance.cells.json'
import noveltyCells from '../../../templates/notebook/novelty.cells.json'
import guardrailsCells from '../../../templates/notebook/guardrails.cells.json'
import segmentsCells from '../../../templates/notebook/segments.cells.json'
import bootstrapCiCells from '../../../templates/notebook/bootstrap_ci.cells.json'
import mainTestMeta from '../../../templates/notebook/main_test/_meta.json'
import mainTestZ from '../../../templates/notebook/main_test/z_test.cells.json'
import mainTestT from '../../../templates/notebook/main_test/t_test.cells.json'
import mainTestWelch from '../../../templates/notebook/main_test/welch.cells.json'
import mainTestBootstrap from '../../../templates/notebook/main_test/bootstrap.cells.json'
import { slugify } from '../util/slugify.js'

const TEMPLATES = {
  load: loadCells,
  srm: srmCells,
  balance: balanceCells,
  novelty: noveltyCells,
  guardrails: guardrailsCells,
  segments: segmentsCells,
  bootstrap_ci: bootstrapCiCells,
}

const MAIN_TEST_VARIANTS = {
  z_test_proportions: mainTestZ,
  t_test: mainTestT,
  welch_t_test: mainTestWelch,
  // bootstrap, mannwhitney, delta_method all share the bootstrap variant
  // (universal fallback per Sprint 4 scope; builder warns when it kicks in).
  bootstrap: mainTestBootstrap,
  mannwhitney: mainTestBootstrap,
  delta_method: mainTestBootstrap,
}

const FALLBACK_TEST_METHOD = 'bootstrap'

// ---- Public catalog (drives the UI cells-list) --------------------------

export const CELL_CATALOG = {
  load: { ...loadCells, mandatory: true },
  srm: { ...srmCells, mandatory: true },
  balance: { ...balanceCells, mandatory: true },
  novelty: { ...noveltyCells, mandatory: true },
  main_test: { ...mainTestMeta, mandatory: true },
  guardrails: { ...guardrailsCells, mandatory: true },
  segments: { ...segmentsCells, mandatory: false },
  bootstrap_ci: { ...bootstrapCiCells, mandatory: false },
}

// ---- Helpers ------------------------------------------------------------

function deriveTestId(state) {
  if (state.test_id) return state.test_id
  // After ADR-011: test_id / filename derive from the column code, not the
  // natural label. Fallback chain: metric_column → metric_name → goal_type.
  const base =
    state.brief?.metric_column ||
    state.brief?.metric_name ||
    state.brief?.goal_type ||
    'test'
  return `${slugify(base)}-v1`
}

function deriveTitle(state) {
  if (state.title) return state.title
  // After ADR-011: header title uses the natural human label (metric_name).
  // Falls back to the column code if no label was provided.
  const name = state.brief?.metric_name || state.brief?.metric_column
  return name ? `Тест: ${name}` : 'Тест-план без названия'
}

function deriveMetricColumn(brief) {
  if (brief?.metric_column) return brief.metric_column
  // Sensible default: 'converted' for proportion (matches our demo csv),
  // otherwise fall back to metric_name as a column name.
  if (brief?.metric_type === 'proportion') return 'converted'
  return brief?.metric_name || 'metric'
}

function pyRepr(value) {
  // Stringify JS primitives / arrays / objects as Python literals.
  // Strings: single-quoted; bools: capitalized; None for null.
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'None'
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(', ')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([k, v]) => `${pyRepr(k)}: ${pyRepr(v)}`,
    )
    return `{${entries.join(', ')}}`
  }
  return 'None'
}

function expectedSchema(state, cellsEnabled) {
  const brief = state.brief || {}
  const ru = brief.randomization_unit || 'user'
  const metricCol = deriveMetricColumn(brief)
  const rows = [
    {
      column: `${ru}_id`,
      type: 'int / string',
      required: true,
      description: 'Идентификатор единицы рандомизации',
    },
    {
      column: 'variant',
      type: 'string',
      required: true,
      description: '"control" или "treatment"',
    },
    {
      column: metricCol,
      type: brief.metric_type === 'proportion' ? 'int (0/1)' : 'float',
      required: true,
      description: `Основная метрика (${brief.metric_type || 'metric'})`,
    },
  ]
  for (const g of brief.guardrails || []) {
    rows.push({
      column: g.name,
      type: 'float',
      required: cellsEnabled.includes('guardrails'),
      description: 'Guardrail',
    })
  }
  if (cellsEnabled.includes('novelty')) {
    rows.push({
      column: 'day',
      type: 'int (1..N)',
      required: true,
      description: 'Номер дня (для novelty check)',
    })
  }
  if (cellsEnabled.includes('segments')) {
    rows.push({
      column: 'geo',
      type: 'string',
      required: false,
      description: 'Сегмент для сегментного анализа',
    })
  }
  return rows
}

function buildPlaceholderMap(state) {
  const brief = state.brief || {}
  const plan = state.plan || {}
  const derived = plan.derived || {}
  const ru = brief.randomization_unit || 'user'
  return {
    test_id: deriveTestId(state),
    title: deriveTitle(state),
    metric_name: brief.metric_name || '',
    metric_type: brief.metric_type || '',
    metric_column: deriveMetricColumn(brief),
    // baseline.unit is set to 'fraction' (proportions, already 0..1) or null
    // (continuous/ratio/count) by parse.js; values are already in the right
    // shape, so no normalization is needed here.
    baseline: brief.baseline?.value ?? 0,
    mde_value: brief.mde?.value ?? '',
    mde_unit: brief.mde?.unit || '',
    direction: brief.mde?.direction || 'any',
    alpha: brief.advanced?.alpha ?? 0.05,
    power: brief.advanced?.power ?? 0.8,
    test_method: derived.test_method || FALLBACK_TEST_METHOD,
    sample_size_per_arm: derived.sample_size_per_arm ?? '',
    duration_days: derived.duration_days ?? '',
    randomization_unit: ru,
    randomization_unit_column: `${ru}_id`,
    guardrails_py_list: pyRepr((brief.guardrails || []).map((g) => g.name)),
    guardrails_py_objects: pyRepr(
      (brief.guardrails || []).map((g) => ({
        name: g.name,
        direction: g.direction,
        threshold: g.threshold?.value ?? 0,
        unit: g.threshold?.unit || 'relative_percent',
      })),
    ),
  }
}

// Replace {{key}} occurrences inside a single source line.
function substituteInString(s, map, missing) {
  return s.replace(/\{\{(\w+)\}\}/g, (whole, name) => {
    if (Object.prototype.hasOwnProperty.call(map, name)) {
      return String(map[name])
    }
    missing.add(name)
    return whole
  })
}

function substituteCell(cell, map, missing) {
  const source = Array.isArray(cell.source)
    ? cell.source.map((line) => substituteInString(line, map, missing))
    : substituteInString(cell.source || '', map, missing)
  const out = { ...cell, source }
  if (cell.cell_type === 'code') {
    out.execution_count = cell.execution_count ?? null
    out.outputs = cell.outputs ?? []
  }
  out.metadata = cell.metadata ?? {}
  return out
}

function buildHeaderCell(state, cellsEnabled, schema) {
  const brief = state.brief || {}
  const plan = state.plan || {}
  const derived = plan.derived || {}
  const today = new Date().toISOString().slice(0, 10)
  const lines = []
  lines.push(`# Analysis: ${deriveTitle(state)}\n`)
  lines.push('\n')
  lines.push(`> Сгенерировано stat·plan ${today}.\n`)
  lines.push(
    '> Test plan: см. test_plan.md, генерируется отдельно в stat·plan (шаг 2).\n',
  )
  lines.push('\n')
  lines.push('## Test parameters\n')
  lines.push(`- Metric: \`${brief.metric_name || '—'}\` (${brief.metric_type || '—'})\n`)
  lines.push(`- Method: \`${derived.test_method || FALLBACK_TEST_METHOD}\`\n`)
  if (derived.sample_size_per_arm != null) {
    lines.push(`- Sample size per arm: ${derived.sample_size_per_arm}\n`)
  }
  if (derived.duration_days != null) {
    const dayWord = derived.duration_days === 1 ? 'day' : 'days'
    lines.push(`- Duration: ${derived.duration_days} ${dayWord}\n`)
  }
  lines.push(`- α = ${brief.advanced?.alpha ?? 0.05}, power = ${brief.advanced?.power ?? 0.8}\n`)
  if (brief.mde?.value != null) {
    const unit = brief.mde.unit === 'relative_percent' ? '% rel.' : ''
    lines.push(`- MDE: ${brief.mde.value}${unit}\n`)
  }
  lines.push('\n')
  lines.push('## Decision rules\n')
  const dr = brief.decision_rules || {}
  if (dr.ship) lines.push(`- **SHIP**: ${dr.ship}\n`)
  if (dr.iterate) lines.push(`- **ITERATE**: ${dr.iterate}\n`)
  if (dr.kill) lines.push(`- **KILL**: ${dr.kill}\n`)
  if (!dr.ship && !dr.iterate && !dr.kill) {
    lines.push('- (decision rules не заполнены в брифе)\n')
  }
  lines.push('\n')
  lines.push('## Expected CSV schema\n')
  lines.push('\n')
  lines.push('| Column | Type | Required | Description |\n')
  lines.push('|--------|------|----------|-------------|\n')
  for (const row of schema) {
    lines.push(
      `| \`${row.column}\` | ${row.type} | ${row.required ? '✓' : 'optional'} | ${row.description} |\n`,
    )
  }
  lines.push('\n')
  if (
    derived.test_method === 'delta_method' ||
    derived.test_method === 'mannwhitney'
  ) {
    lines.push(
      `> ⚠️ **Внимание:** в плане выбран метод \`${derived.test_method}\`. Этот ноутбук использует **bootstrap-вариант**\n`,
    )
    lines.push(
      '> ячейки main_test как универсальный fallback в Sprint 4. Bootstrap-CI на разности средних — это\n',
    )
    lines.push(
      `> **не то же самое**, что ${derived.test_method} (delta-method даёт CI через Taylor expansion над ratio,\n`,
    )
    lines.push(
      '> mannwhitney работает на рангах). Для строгого теста замени main_test-ячейку соответствующей\n',
    )
    lines.push('> реализацией.\n')
    lines.push('\n')
  }
  lines.push('**To run:** укажи путь к CSV в первой code-ячейке (`CSV_PATH`), запусти все ячейки сверху вниз.\n')

  return {
    cell_type: 'markdown',
    metadata: {},
    source: lines,
  }
}

function selectMainTestVariant(testMethod, warnings) {
  const variant = MAIN_TEST_VARIANTS[testMethod]
  if (variant) {
    if (
      testMethod === 'mannwhitney' ||
      testMethod === 'delta_method'
    ) {
      warnings.push(
        `Для метода ${testMethod} используется bootstrap-вариант ячейки main_test.`,
      )
    }
    return variant
  }
  warnings.push(
    `Неизвестный test_method=${JSON.stringify(testMethod)} — использован bootstrap-вариант.`,
  )
  return MAIN_TEST_VARIANTS[FALLBACK_TEST_METHOD]
}

// ---- Public API ---------------------------------------------------------

export function buildNotebook(state) {
  const warnings = []
  const brief = state?.brief || {}
  const derived = state?.plan?.derived || {}
  const userCellsEnabled = Array.isArray(state?.notebook_config?.cells_enabled)
    ? state.notebook_config.cells_enabled
    : []

  // Determine which cells actually run (conditional skips).
  const finalEnabled = userCellsEnabled.filter((id) => {
    if (id === 'novelty') {
      if ((derived.duration_days ?? 0) < 3) {
        warnings.push(
          'Ячейка novelty пропущена — duration_days меньше 3 дней.',
        )
        return false
      }
    }
    if (id === 'guardrails') {
      if (!Array.isArray(brief.guardrails) || brief.guardrails.length === 0) {
        warnings.push('Ячейка guardrails пропущена — guardrails не заданы.')
        return false
      }
    }
    return true
  })

  const placeholderMap = buildPlaceholderMap(state)
  const missingPlaceholders = new Set()
  const schema = expectedSchema(state, finalEnabled)

  const headerCell = buildHeaderCell(state, finalEnabled, schema)
  const cells = [headerCell]

  for (const id of finalEnabled) {
    let template
    if (id === 'main_test') {
      template = selectMainTestVariant(
        derived.test_method || FALLBACK_TEST_METHOD,
        warnings,
      )
    } else {
      template = TEMPLATES[id]
    }
    if (!template) {
      warnings.push(`Шаблон ячейки ${id} не найден — пропущен.`)
      continue
    }
    for (const cell of template.cells) {
      cells.push(substituteCell(cell, placeholderMap, missingPlaceholders))
    }
  }

  if (missingPlaceholders.size > 0) {
    warnings.push(
      `Не подставлены плейсхолдеры: ${[...missingPlaceholders].join(', ')}.`,
    )
  }

  const json = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { name: 'python3', display_name: 'Python 3' },
      language_info: { name: 'python' },
      statplan: {
        test_id: deriveTestId(state),
        version: '0.1',
      },
    },
    cells,
  }

  const filename = `${deriveTestId(state)}_analysis.ipynb`

  return { filename, json, warnings, schema, finalEnabled }
}

// ---- Convenience helpers exposed for the UI -----------------------------

export function getExpectedSchema(state) {
  const enabled = state?.notebook_config?.cells_enabled ?? []
  return expectedSchema(state, enabled)
}
