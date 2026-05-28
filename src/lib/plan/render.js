// Render test_plan.md from state.brief + derived + plan metadata.
// Template lives in templates/test_plan.md.tmpl and is imported as raw text
// via Vite's `?raw` suffix. Simple {{placeholder}} substitution — complex
// blocks (YAML lists, MD lists) are pre-serialized in JS, since rolling a
// real template engine for this is overkill and adding a dep is forbidden
// per ADR-010.
//
// YAML is hand-built. Strict format matters because Sprint 4+ parser must
// round-trip it. See DATA_MODEL.md for the schema this output must match.

import TEMPLATE from '../../../templates/test_plan.md.tmpl?raw'

// ---- YAML helpers --------------------------------------------------------

function yamlScalar(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  // Strings: quote if contains special YAML chars; otherwise bare.
  if (typeof v === 'string') {
    if (v === '') return '""'
    if (/[:#"'`{}\[\],&*!|>%@\\\n]/.test(v) || /^\s|\s$/.test(v))
      return JSON.stringify(v)
    return v
  }
  return JSON.stringify(v)
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => (line.length > 0 ? pad + line : line))
    .join('\n')
}

function renderGuardrailsYaml(guardrails) {
  if (!Array.isArray(guardrails) || guardrails.length === 0) return '  []'
  return guardrails
    .map((g) => {
      const lines = []
      lines.push(`  - name: ${yamlScalar(g.name ?? null)}`)
      lines.push(`    direction: ${yamlScalar(g.direction ?? null)}`)
      const threshold = g.threshold ?? {}
      lines.push(`    threshold: ${yamlScalar(threshold.value ?? null)}`)
      lines.push(`    unit: ${yamlScalar(threshold.unit ?? null)}`)
      return lines.join('\n')
    })
    .join('\n')
}

function renderDataPeekYaml(dp) {
  const lines = [
    `  uploaded: ${yamlScalar(dp?.uploaded ?? false)}`,
    `  baseline_computed: ${yamlScalar(dp?.baseline_computed ?? null)}`,
    `  std_computed: ${yamlScalar(dp?.std_computed ?? null)}`,
    `  baseline_match_user_input: ${yamlScalar(dp?.baseline_match_user_input ?? null)}`,
    `  distribution_check: ${yamlScalar(dp?.distribution_check ?? null)}`,
  ]
  return lines.join('\n')
}

function renderStopConditionsYaml(stops) {
  const s = stops ?? {}
  return [
    `  srm_detected: ${yamlScalar(s.srm_detected ?? true)}`,
    `  guardrail_breach_24h: ${yamlScalar(s.guardrail_breach_24h ?? true)}`,
    `  length_cap_days: ${yamlScalar(s.length_cap_days ?? null)}`,
    `  manual_stop: ${yamlScalar(s.manual_stop ?? false)}`,
  ].join('\n')
}

function renderDecisionRulesYaml(dr) {
  const r = dr ?? {}
  return [
    `  ship: ${yamlScalar(r.ship ?? '')}`,
    `  iterate: ${yamlScalar(r.iterate ?? '')}`,
    `  kill: ${yamlScalar(r.kill ?? '')}`,
  ].join('\n')
}

// ---- MD section helpers --------------------------------------------------

function renderGuardrailsMd(guardrails) {
  if (!Array.isArray(guardrails) || guardrails.length === 0) return '_(не заданы)_'
  return guardrails
    .map((g) => {
      const t = g.threshold ?? {}
      const sign = g.direction === 'max' ? '+' : g.direction === 'min' ? '−' : ''
      const valueText =
        t.value != null && t.unit === 'relative_percent'
          ? `${sign}${Math.abs(t.value)}% rel.`
          : t.value != null
            ? `${sign}${Math.abs(t.value)}`
            : ''
      return `- ${g.name ?? '(unnamed)'} (${g.direction ?? '?'} ${valueText})`.trim()
    })
    .join('\n')
}

function renderStopConditionsMd(stops, mde) {
  const items = []
  if (stops?.srm_detected) items.push('- SRM detected (chi² p < 0.001)')
  if (stops?.guardrail_breach_24h) items.push('- Guardrail breach > 24h')
  if (stops?.length_cap_days)
    items.push(`- Length cap: ${stops.length_cap_days} days`)
  if (stops?.manual_stop) items.push('- Manual stop allowed')
  if (items.length === 0) return '_(не заданы)_'
  return items.join('\n')
}

function renderDecisionRulesMd(dr) {
  const items = []
  if (dr?.ship) items.push(`- **SHIP**: ${dr.ship}`)
  if (dr?.iterate) items.push(`- **ITERATE**: ${dr.iterate}`)
  if (dr?.kill) items.push(`- **KILL**: ${dr.kill}`)
  if (items.length === 0) return '_(не заданы)_'
  return items.join('\n')
}

// ---- Field normalizers --------------------------------------------------

function normalizeBaselineForYaml(baseline) {
  if (baseline?.value == null) return null
  if (baseline.unit === 'percent') return baseline.value / 100
  return baseline.value
}

function slugify(s) {
  if (!s) return 'test'
  return s
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_\s-]/giu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'test'
}

function deriveTestId(brief) {
  const base = brief.metric_name || brief.goal_type || 'test'
  return `${slugify(base)}-v1`
}

function deriveTitle(brief) {
  return brief.metric_name
    ? `Тест: ${brief.metric_name}`
    : 'Тест-план без названия'
}

// ---- Facade --------------------------------------------------------------

export function renderTestPlanMd(state) {
  const brief = state?.brief ?? {}
  const plan = state?.plan ?? {}
  const derived = plan.derived ?? {}
  const score = plan.score ?? {}
  const advanced = brief.advanced ?? {}
  const today = new Date().toISOString().slice(0, 10)

  const titleStr = deriveTitle(brief)
  const substitutions = {
    test_id: deriveTestId(brief),
    title: yamlScalar(titleStr),
    title_heading: titleStr,
    created: today,
    status: plan.status ?? 'draft',
    approved_at: yamlScalar(plan.approvedAt ?? null),

    goal_type: yamlScalar(brief.goal_type ?? null),
    goal_description: yamlScalar(brief.goal_description || null),

    metric_type: yamlScalar(brief.metric_type ?? null),
    metric_name: yamlScalar(brief.metric_column || brief.metric_name || null),
    metric_label: yamlScalar(brief.metric_name || null),
    ratio_numerator: yamlScalar(brief.ratio_components?.numerator ?? null),
    ratio_denominator: yamlScalar(brief.ratio_components?.denominator ?? null),
    baseline: yamlScalar(normalizeBaselineForYaml(brief.baseline)),
    test_method: yamlScalar(derived.test_method ?? null),
    randomization_unit: yamlScalar(brief.randomization_unit ?? null),
    cluster_field: yamlScalar(brief.cluster_field ?? null),
    alpha: yamlScalar(advanced.alpha ?? null),
    power: yamlScalar(advanced.power ?? null),
    two_sided: yamlScalar(advanced.two_sided ?? true),

    mde_value: yamlScalar(brief.mde?.value ?? null),
    mde_unit: yamlScalar(brief.mde?.unit ?? null),
    direction: yamlScalar(brief.mde?.direction ?? 'any'),

    sample_size_per_arm: yamlScalar(derived.sample_size_per_arm ?? null),
    duration_days: yamlScalar(derived.duration_days ?? null),
    daily_traffic_available: yamlScalar(brief.daily_traffic?.value ?? null),

    variance_reduction: yamlScalar(advanced.variance_reduction ?? null),
    stratification_by: yamlScalar(advanced.stratification_by ?? null),
    holdback_percent: yamlScalar(advanced.holdback_percent ?? null),

    guardrails_yaml: renderGuardrailsYaml(brief.guardrails),
    stop_conditions_yaml: renderStopConditionsYaml(brief.stop_conditions),
    decision_rules_yaml: renderDecisionRulesYaml(brief.decision_rules),
    data_peek_yaml: renderDataPeekYaml(brief.data_peek),
    score: yamlScalar(score.total ?? null),

    hypothesis_text: brief.hypothesis?.text || '_(не заполнено)_',
    guardrails_md: renderGuardrailsMd(brief.guardrails),
    stop_conditions_md: renderStopConditionsMd(brief.stop_conditions, brief.mde),
    decision_rules_md: renderDecisionRulesMd(brief.decision_rules),
    notes: brief.notes || '_(пусто)_',
  }

  let out = TEMPLATE
  for (const [key, val] of Object.entries(substitutions)) {
    // Re-render title twice (once in YAML, once in heading) — replace all
    out = out.split(`{{${key}}}`).join(String(val))
  }
  return out
}
