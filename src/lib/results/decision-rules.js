// Sprint 7 S3 — parse and evaluate user-written decision rules.
//
// brief.decision_rules has shape `{ ship, iterate, kill }` (three labelled
// strings). The label is the action; the value is the condition. Users may
// write the condition in shorthand (`delta_rel > 5`) or as a full sentence
// (`if delta_rel > 5 then SHIP` / Russian / arrows). Parser extracts
// `<variable> <op> <threshold>` and auto-evaluates against results.
//
// Unparseable rules round-trip as-is — UI shows a manual checkbox so the
// user marks fired/not-fired themselves.

// G-4 — tolerant of real PM phrasing: unicode ≤/≥/− , bare "CI", Russian
// "нижняя/верхняя граница", "% rel." suffixes. Longer alternatives come first
// so they win over the bare `ci`. No `\b` — JS word boundaries are ASCII-only
// and would break the Cyrillic alternatives.
// Sprint 8 P-13 — alias real PM phrasing (lift / эффект / Δ rel / p value).
// Sprint 8 P-14d — optional trailing `% rel` suffix → unit-aware comparison.
// Longer alternatives first; bare `ci` last. No `\b` (ASCII-only, breaks
// Cyrillic). m[1]=variable, m[2]=operator, m[3]=threshold, m[4]=unit suffix.
const COND_REGEX = new RegExp(
  '(ci_lower|ci_upper|p_value|delta_rel|ci\\s+lower|ci\\s+upper|' +
    'нижняя\\s+граница|верхняя\\s+граница|' +
    'relative\\s+effect|delta\\s*rel|[Δδ]\\s*rel|' +
    'p\\s*value|p-value|p-значение|' +
    'lift|эффект|ci)' +
    '\\s*(>=|<=|==|>|<)\\s*([+-]?\\d+(?:\\.\\d+)?)' +
    '\\s*(%\\s*rel(?:ative)?|%)?',
  'i',
)

export const ACTIONS = ['SHIP', 'ITERATE', 'KILL']
export const FIELDS = ['ship', 'iterate', 'kill']

// Map a matched variable token to a canonical results key. Bare "CI" is
// resolved by operator: "CI ≤ X" = whole CI below X = ci_upper; "CI ≥ X" =
// whole CI above X = ci_lower. Explicit ci_lower/ci_upper are never remapped.
function normalizeVariable(rawVar, operator) {
  let v = rawVar.toLowerCase().replace(/\s+/g, '_')
  v = v.replace(/^δ_?/, '') // 'δ_rel' / 'δrel' → 'rel'
  if (['ci_lower', 'ci_upper', 'p_value', 'delta_rel'].includes(v)) return v
  if (v === 'нижняя_граница') return 'ci_lower'
  if (v === 'верхняя_граница') return 'ci_upper'
  if (['lift', 'эффект', 'relative_effect', 'rel'].includes(v)) return 'delta_rel'
  if (['p-value', 'p-значение'].includes(v)) return 'p_value'
  if (v === 'ci') {
    if (operator === '<=' || operator === '<') return 'ci_upper'
    if (operator === '>=' || operator === '>') return 'ci_lower'
    return 'ci_lower'
  }
  return null
}

export function parseDecisionRule(text) {
  const raw = (text ?? '').toString()
  const result = {
    parsed: false,
    variable: null,
    operator: null,
    threshold: null,
    unit: null,
    raw,
  }
  if (!raw.trim()) return result
  const normalized = raw
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
  const m = normalized.match(COND_REGEX)
  if (!m) return result
  const operator = m[2]
  const variable = normalizeVariable(m[1], operator)
  if (!variable) return result
  const threshold = Number(m[3])
  if (!Number.isFinite(threshold)) return result
  const unit = /rel/.test((m[4] || '').toLowerCase()) ? 'pct_rel' : null
  return {
    parsed: true,
    variable,
    operator,
    threshold,
    unit,
    raw,
  }
}

export function evaluateRule(rule, results) {
  if (!rule?.parsed || !results) return null
  // P-14d — `% rel` rules on CI bounds read the derived pct_rel field.
  let key = rule.variable
  if (
    rule.unit === 'pct_rel' &&
    (rule.variable === 'ci_lower' || rule.variable === 'ci_upper')
  ) {
    key = `${rule.variable}_pct_rel`
  }
  const value = Number(results[key])
  if (!Number.isFinite(value)) return null
  switch (rule.operator) {
    case '>':
      return value > rule.threshold
    case '<':
      return value < rule.threshold
    case '>=':
      return value >= rule.threshold
    case '<=':
      return value <= rule.threshold
    case '==':
      return value === rule.threshold
    default:
      return null
  }
}

export function evaluateAllRules(decision_rules, results) {
  const dr = decision_rules || {}
  return FIELDS.map((field) => {
    const raw = (dr[field] ?? '').toString()
    const action = field.toUpperCase()
    const empty = !raw.trim()
    if (empty) {
      return {
        field,
        action,
        raw,
        parsed: false,
        variable: null,
        operator: null,
        threshold: null,
        unit: null,
        auto_eval: null,
        empty: true,
      }
    }
    const parsed = parseDecisionRule(raw)
    return {
      field,
      action,
      raw,
      parsed: parsed.parsed,
      variable: parsed.variable,
      operator: parsed.operator,
      threshold: parsed.threshold,
      unit: parsed.unit,
      auto_eval: parsed.parsed ? evaluateRule(parsed, results) : null,
      empty: false,
    }
  })
}

// Produce a short "Recommended next step" sentence from rules evaluation +
// user-checked status. If multiple actions fire, the order SHIP→ITERATE→KILL
// wins. If nothing fires, returns a "no rule matched" sentence.
export function recommendNextStep(rulesEval, userChecks = {}) {
  // userChecks: { ship: bool|null, iterate: bool|null, kill: bool|null }
  // Effective fired = userChecks[field] ?? auto_eval; ignore empty rules.
  const fired = []
  for (const r of rulesEval) {
    if (r.empty) continue
    const userVal = userChecks[r.field]
    const effective = userVal == null ? r.auto_eval : userVal
    if (effective === true) fired.push(r)
  }
  if (fired.length === 0) {
    return 'Ни одно из decision rules не сработало. Решение остаётся за PM.'
  }
  const priority = { SHIP: 0, ITERATE: 1, KILL: 2 }
  fired.sort((a, b) => priority[a.action] - priority[b.action])
  const names = fired.map((r) => r.action).join(', ')
  return `Сработали правила: ${names}. Рекомендуемое следующее действие — ${fired[0].action}.`
}
