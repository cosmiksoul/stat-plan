// Parse test_plan.md back into state.brief + state.plan partial shape.
// Round-trip contract with render.js (Sprint 3): given a state, render it,
// parse the output, and the brief subset that the YAML can carry must equal
// the original brief subset. See tests/lib/plan/parse.test.js.
//
// Strict-parsing path (ADR-002): unrecoverable structural problems return
// { ok: false, error }. Bad/missing fields inside a parseable frontmatter
// degrade to defaults plus warnings — the user gets a usable state plus a
// clear list of what was ignored.

import yaml from 'js-yaml'
import { parseHypothesis } from '../brief/hypothesis-parser.js'
import { deriveDirection } from './direction.js'

// ---- Enums (mirror DATA_MODEL.md) ---------------------------------------

const ENUM_METRIC_TYPE = ['proportion', 'continuous', 'ratio', 'count']
const ENUM_STATUS = ['draft', 'approved']
const ENUM_TEST_METHOD = [
  'z_test_proportions',
  't_test',
  'welch_t_test',
  'mannwhitney',
  'bootstrap',
  'delta_method',
]
const ENUM_RANDOMIZATION_UNIT = ['user', 'session', 'cluster']
const ENUM_MDE_UNIT = [
  'relative_percent',
  'absolute_percentage_points',
  'absolute_value',
]
const ENUM_DIRECTION = ['increase', 'decrease', 'any']
const ENUM_GUARDRAIL_DIRECTION = ['max', 'min']
const ENUM_GUARDRAIL_UNIT = [
  'relative_percent',
  'absolute_percentage_points',
  'absolute_value',
]

// ---- Default partial brief (only fields the parser touches) -------------

function emptyBriefShape() {
  return {
    goal_type: null,
    hypothesis: {
      text: '',
      slots: {
        change: false,
        metric: false,
        direction_magnitude: false,
        mechanism: false,
      },
    },
    metric_type: null,
    ratio_components: { numerator: null, denominator: null },
    metric_name: '',
    metric_column: '',
    baseline: { value: null, unit: null },
    randomization_unit: null,
    cluster_field: null,
    mde: { value: null, unit: 'relative_percent', direction: 'increase' },
    daily_traffic: { value: null, unit: 'user' },
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
    data_peek: null,
    goal_description: '',
    defaultsApplied: {
      metric_name: false,
      decision_rules: false,
      goal_type: false,
      randomization_unit: false,
    },
  }
}

// ---- Helpers ------------------------------------------------------------

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

function isStr(v) {
  return typeof v === 'string'
}

function isBool(v) {
  return typeof v === 'boolean'
}

// Find the YAML frontmatter block. Returns { yaml, body, ok, error }.
function splitFrontmatterAndBody(md) {
  const lines = md.split('\n')
  if (lines[0]?.trim() !== '---') {
    return {
      ok: false,
      error: {
        message:
          'Не найден YAML frontmatter (первая строка должна быть ---).',
      },
    }
  }
  // Find the closing --- on its own line, starting from line 2.
  let closingIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIdx = i
      break
    }
  }
  if (closingIdx === -1) {
    return {
      ok: false,
      error: {
        message:
          'Не найдена закрывающая строка --- для YAML frontmatter.',
      },
    }
  }
  const yamlText = lines.slice(1, closingIdx).join('\n')
  const body = lines.slice(closingIdx + 1).join('\n')
  return { ok: true, yamlText, body }
}

// Extract a `## SectionName` block from markdown body. Returns the text
// between the heading and the next `## ` (or end-of-file). Returns null
// if the section doesn't exist.
function extractSection(body, sectionTitle) {
  const headingRe = new RegExp(
    `^##\\s+${sectionTitle}\\s*$`,
    'im',
  )
  const match = body.match(headingRe)
  if (!match) return null
  const startIdx = match.index + match[0].length
  const rest = body.slice(startIdx)
  // Find next `## ` heading (any heading at level 2+).
  const nextHeading = rest.match(/^##\s+/m)
  const endIdx = nextHeading ? nextHeading.index : rest.length
  return rest.slice(0, endIdx).trim()
}

// Coerce baseline number to brief.baseline shape, depending on metric_type.
// Proportion: typical YAML value is 0..1 fraction → unit: 'fraction'.
// Continuous/ratio/count: unit: null, value as-is.
function coerceBaseline(yamlValue, metricType) {
  if (!isNum(yamlValue)) return { value: null, unit: null }
  if (metricType === 'proportion') {
    return { value: yamlValue, unit: 'fraction' }
  }
  return { value: yamlValue, unit: null }
}

// ---- Field-level mapping (frontmatter → brief / plan) -------------------

function mapFrontmatter(fm, warnings) {
  const brief = emptyBriefShape()

  // Required: metric_type
  if (fm.metric_type == null) {
    warnings.push('Поле metric_type отсутствует — оставлено пустым.')
  } else if (!ENUM_METRIC_TYPE.includes(fm.metric_type)) {
    warnings.push(
      `Невалидное значение metric_type=${JSON.stringify(fm.metric_type)}, поле сброшено.`,
    )
  } else {
    brief.metric_type = fm.metric_type
  }

  // YAML.metric_name carries the code identifier (snake_case CSV column);
  // it maps onto brief.metric_column. The human-language label is stored
  // separately as YAML.metric_label and maps onto brief.metric_name.
  //
  // Legacy heuristic (P-7): pre-ADR-011 files put the human label into
  // metric_name (no metric_label field existed). Detect those by looking
  // for whitespace, Cyrillic, or uppercase Latin in metric_name AND the
  // absence of metric_label — and route them to metric_label instead, so
  // brief.metric_column stays empty for the user to fill in by hand.
  const LEGACY_METRIC_NAME_RE = /[\sА-ЯЁа-яёA-Z]/
  const hasLabel =
    fm.metric_label != null &&
    fm.metric_label !== false &&
    isStr(fm.metric_label) &&
    fm.metric_label !== ''

  if (fm.metric_name != null) {
    if (isStr(fm.metric_name)) {
      const looksLegacy =
        !hasLabel && LEGACY_METRIC_NAME_RE.test(fm.metric_name)
      if (looksLegacy) {
        brief.metric_name = fm.metric_name
        brief.metric_column = ''
        warnings.push(
          'Обнаружен legacy формат test_plan.md (metric_name содержит натуральный текст). Перенесено в metric_label. Заполни код колонки вручную.',
        )
      } else {
        brief.metric_column = fm.metric_name
      }
    } else {
      warnings.push('Поле metric_name не строка — оставлено пустым.')
    }
  } else {
    warnings.push('Поле metric_name отсутствует — оставлено пустым.')
  }

  if (fm.metric_label != null && fm.metric_label !== false) {
    if (isStr(fm.metric_label)) {
      brief.metric_name = fm.metric_label
    } else {
      warnings.push('Поле metric_label не строка — оставлено пустым.')
    }
  }

  if (fm.goal_description != null && fm.goal_description !== false) {
    if (isStr(fm.goal_description)) {
      brief.goal_description = fm.goal_description
    } else {
      warnings.push('Поле goal_description не строка — оставлено пустым.')
    }
  }

  // Optional: goal_type (context-only, doesn't participate in derived calc)
  if (fm.goal_type != null && fm.goal_type !== false) {
    if (isStr(fm.goal_type)) brief.goal_type = fm.goal_type
    else warnings.push('Поле goal_type не строка — оставлено null.')
  }

  // Optional: ratio_components (only meaningful when metric_type=ratio)
  if (isStr(fm.ratio_numerator)) {
    brief.ratio_components.numerator = fm.ratio_numerator
  }
  if (isStr(fm.ratio_denominator)) {
    brief.ratio_components.denominator = fm.ratio_denominator
  }

  // Required: baseline (number)
  if (fm.baseline == null) {
    warnings.push('Поле baseline отсутствует.')
  } else if (!isNum(fm.baseline)) {
    warnings.push(
      `Поле baseline не число (${JSON.stringify(fm.baseline)}) — сброшено.`,
    )
  } else {
    brief.baseline = coerceBaseline(fm.baseline, brief.metric_type)
  }

  // Required: randomization_unit
  if (fm.randomization_unit == null) {
    warnings.push('Поле randomization_unit отсутствует.')
  } else if (!ENUM_RANDOMIZATION_UNIT.includes(fm.randomization_unit)) {
    warnings.push(
      `Невалидное randomization_unit=${JSON.stringify(fm.randomization_unit)} — сброшено.`,
    )
  } else {
    brief.randomization_unit = fm.randomization_unit
  }

  // Optional: cluster_field (only meaningful when randomization_unit=cluster)
  if (isStr(fm.cluster_field)) brief.cluster_field = fm.cluster_field

  // Required: alpha, power (numbers, end up in advanced)
  if (fm.alpha != null) {
    if (isNum(fm.alpha) && fm.alpha > 0 && fm.alpha < 1) {
      brief.advanced.alpha = fm.alpha
    } else {
      warnings.push(
        `Поле alpha=${JSON.stringify(fm.alpha)} вне диапазона (0..1) — оставлено по умолчанию 0.05.`,
      )
    }
  }
  if (fm.power != null) {
    if (isNum(fm.power) && fm.power > 0 && fm.power < 1) {
      brief.advanced.power = fm.power
    } else {
      warnings.push(
        `Поле power=${JSON.stringify(fm.power)} вне диапазона (0..1) — оставлено по умолчанию 0.8.`,
      )
    }
  }

  // Optional: two_sided (advanced)
  if (fm.two_sided != null) {
    if (isBool(fm.two_sided)) brief.advanced.two_sided = fm.two_sided
    else warnings.push('Поле two_sided не boolean — оставлено true.')
  }

  // MDE: nested { value, unit }
  if (fm.mde == null) {
    warnings.push('Поле mde отсутствует.')
  } else if (typeof fm.mde !== 'object' || Array.isArray(fm.mde)) {
    warnings.push('Поле mde не объект — сброшено.')
  } else {
    const v = fm.mde.value
    const u = fm.mde.unit
    if (isNum(v)) brief.mde.value = v
    else if (v != null) warnings.push(`mde.value не число (${JSON.stringify(v)}).`)
    if (u != null) {
      if (ENUM_MDE_UNIT.includes(u)) brief.mde.unit = u
      else
        warnings.push(
          `Невалидный mde.unit=${JSON.stringify(u)} — оставлено по умолчанию relative_percent.`,
        )
    }
  }

  // direction (top-level)
  if (fm.direction != null) {
    if (ENUM_DIRECTION.includes(fm.direction)) {
      brief.mde.direction = fm.direction
    } else {
      warnings.push(
        `Невалидное direction=${JSON.stringify(fm.direction)} — оставлено по умолчанию increase.`,
      )
    }
  }

  // daily_traffic_available (single number → { value, unit })
  if (fm.daily_traffic_available == null) {
    warnings.push('Поле daily_traffic_available отсутствует.')
  } else if (!isNum(fm.daily_traffic_available)) {
    warnings.push(
      `daily_traffic_available не число (${JSON.stringify(fm.daily_traffic_available)}).`,
    )
  } else {
    brief.daily_traffic = {
      value: fm.daily_traffic_available,
      unit: brief.randomization_unit || 'user',
    }
  }

  // Optional techniques → advanced
  if (fm.variance_reduction != null) {
    if (fm.variance_reduction === false) {
      brief.advanced.variance_reduction = null
    } else if (isStr(fm.variance_reduction)) {
      brief.advanced.variance_reduction = fm.variance_reduction
    }
  }
  if (fm.stratification_by != null) {
    if (fm.stratification_by === false) brief.advanced.stratification_by = null
    else if (isStr(fm.stratification_by))
      brief.advanced.stratification_by = fm.stratification_by
  }
  if (fm.holdback_percent != null) {
    if (isNum(fm.holdback_percent)) {
      brief.advanced.holdback_percent = fm.holdback_percent
    } else if (fm.holdback_percent === false) {
      brief.advanced.holdback_percent = null
    }
  }

  // Guardrails (required, may be empty)
  if (Array.isArray(fm.guardrails)) {
    brief.guardrails = fm.guardrails
      .map((g, i) => {
        if (typeof g !== 'object' || g === null) {
          warnings.push(`guardrails[${i}] не объект — пропущен.`)
          return null
        }
        const name = isStr(g.name) ? g.name : null
        const direction = ENUM_GUARDRAIL_DIRECTION.includes(g.direction)
          ? g.direction
          : null
        const value = isNum(g.threshold) ? g.threshold : null
        const unit = ENUM_GUARDRAIL_UNIT.includes(g.unit)
          ? g.unit
          : 'relative_percent'
        if (name == null || direction == null) {
          warnings.push(
            `guardrails[${i}] без name или direction — пропущен.`,
          )
          return null
        }
        return { name, direction, threshold: { value, unit } }
      })
      .filter(Boolean)
  } else if (fm.guardrails != null) {
    warnings.push('Поле guardrails не массив — оставлено пустым.')
  }

  // Optional: stop_conditions (object). Missing == defaults silently.
  if (fm.stop_conditions != null) {
    if (
      typeof fm.stop_conditions === 'object' &&
      !Array.isArray(fm.stop_conditions)
    ) {
      const sc = fm.stop_conditions
      brief.stop_conditions = {
        srm_detected: isBool(sc.srm_detected) ? sc.srm_detected : true,
        guardrail_breach_24h: isBool(sc.guardrail_breach_24h)
          ? sc.guardrail_breach_24h
          : true,
        length_cap_days: isNum(sc.length_cap_days) ? sc.length_cap_days : null,
        manual_stop: isBool(sc.manual_stop) ? sc.manual_stop : false,
      }
    } else {
      warnings.push('Поле stop_conditions не объект — оставлены дефолты.')
    }
  }

  // Optional: decision_rules (object). Missing == defaults silently.
  if (fm.decision_rules != null) {
    if (
      typeof fm.decision_rules === 'object' &&
      !Array.isArray(fm.decision_rules)
    ) {
      const dr = fm.decision_rules
      brief.decision_rules = {
        ship: isStr(dr.ship) ? dr.ship : '',
        iterate: isStr(dr.iterate) ? dr.iterate : '',
        kill: isStr(dr.kill) ? dr.kill : '',
      }
    } else {
      warnings.push('Поле decision_rules не объект — оставлены дефолты.')
    }
  }

  // data_peek (optional object, store as-is for forward compat)
  if (fm.data_peek != null) {
    if (typeof fm.data_peek === 'object' && !Array.isArray(fm.data_peek)) {
      brief.data_peek = {
        uploaded: isBool(fm.data_peek.uploaded)
          ? fm.data_peek.uploaded
          : false,
        baseline_computed: isNum(fm.data_peek.baseline_computed)
          ? fm.data_peek.baseline_computed
          : null,
        std_computed: isNum(fm.data_peek.std_computed)
          ? fm.data_peek.std_computed
          : null,
        baseline_match_user_input:
          isBool(fm.data_peek.baseline_match_user_input)
            ? fm.data_peek.baseline_match_user_input
            : null,
        distribution_check: isStr(fm.data_peek.distribution_check)
          ? fm.data_peek.distribution_check
          : null,
      }
    } else {
      warnings.push('Поле data_peek не объект — проигнорировано.')
    }
  }

  // Mark defaults as already applied for fields that were loaded from YAML,
  // so the subsequent GOTO_QUESTION → applyEnterDefaults won't overwrite
  // them with their hard-coded defaults (e.g. goal_type='other' loaded
  // from file must not be reset to 'product_change' on Q01 entry).
  if (brief.goal_type) brief.defaultsApplied.goal_type = true
  if (brief.randomization_unit) brief.defaultsApplied.randomization_unit = true

  return brief
}

function mapPlan(fm, warnings) {
  let status = 'draft'
  if (fm.status != null) {
    if (ENUM_STATUS.includes(fm.status)) {
      status = fm.status
    } else {
      warnings.push(
        `Невалидное status=${JSON.stringify(fm.status)} — установлено draft.`,
      )
    }
  } else {
    warnings.push('Поле status отсутствует — установлено draft.')
  }

  let approvedAt = null
  if (fm.approved_at != null && fm.approved_at !== false) {
    if (isStr(fm.approved_at)) {
      approvedAt = fm.approved_at
    } else if (fm.approved_at instanceof Date) {
      approvedAt = fm.approved_at.toISOString()
    }
  }

  // test_method validation — informational, since derived is recomputed.
  if (fm.test_method != null && !ENUM_TEST_METHOD.includes(fm.test_method)) {
    warnings.push(
      `Невалидное test_method=${JSON.stringify(fm.test_method)} — будет пересчитано автоматически.`,
    )
  }

  return {
    status,
    approvedAt,
    editedExternally: true,
    briefSubmitted: true,
  }
}

// ---- Public API ---------------------------------------------------------

export function parseTestPlanMd(mdString) {
  const warnings = []

  if (typeof mdString !== 'string') {
    return {
      ok: false,
      brief: null,
      plan: null,
      warnings: [],
      error: { message: 'Ожидается строка с содержимым test_plan.md.' },
    }
  }

  const clean = stripBom(mdString)

  if (clean.trim().length === 0) {
    return {
      ok: false,
      brief: null,
      plan: null,
      warnings: [],
      error: { message: 'Пустой файл.' },
    }
  }

  const split = splitFrontmatterAndBody(clean)
  if (!split.ok) {
    return {
      ok: false,
      brief: null,
      plan: null,
      warnings: [],
      error: split.error,
    }
  }

  let frontmatter
  try {
    frontmatter = yaml.load(split.yamlText)
  } catch (e) {
    const line = e.mark?.line != null ? e.mark.line + 1 : undefined
    return {
      ok: false,
      brief: null,
      plan: null,
      warnings: [],
      error: {
        message: `Ошибка парсинга YAML: ${e.reason || e.message || 'неизвестная'}.`,
        line,
      },
    }
  }

  if (frontmatter == null || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return {
      ok: false,
      brief: null,
      plan: null,
      warnings: [],
      error: { message: 'YAML frontmatter не объект.' },
    }
  }

  const brief = mapFrontmatter(frontmatter, warnings)
  const plan = mapPlan(frontmatter, warnings)

  // Hypothesis from `## Hypothesis` section in body
  const hypothesisText = extractSection(split.body, 'Hypothesis')
  if (hypothesisText == null) {
    warnings.push(
      'Секция ## Hypothesis не найдена — гипотеза будет пустой.',
    )
  } else if (hypothesisText.length === 0) {
    warnings.push(
      'Секция ## Hypothesis пустая — гипотеза будет пустой.',
    )
  } else {
    brief.hypothesis.text = hypothesisText
    brief.hypothesis.slots = parseHypothesis(hypothesisText)
    // Re-derive direction from text so brief.mde.direction reflects the
    // hypothesis verb (matches UPDATE_HYPOTHESIS reducer behavior).
    const derived = deriveDirection(hypothesisText)
    if (derived !== 'any') brief.mde.direction = derived
  }

  // Document-level fields read informationally — they don't live in brief.
  // test_id, title, created, sample_size_per_arm, duration_days, score,
  // test_method: ignored on parse (regenerated by render / RECOMPUTE_PLAN).
  const testId = isStr(frontmatter.test_id) ? frontmatter.test_id : null
  const title = isStr(frontmatter.title) ? frontmatter.title : null

  return {
    ok: true,
    brief,
    plan,
    test_id: testId,
    title,
    warnings,
    error: null,
  }
}
