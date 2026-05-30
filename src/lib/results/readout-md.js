// Sprint 7 S6 — generate a wiki-friendly markdown readout with YAML
// frontmatter. The `decision` field is ALWAYS empty (ADR-004 — tool must not
// pretend to take the call).

import { srmCheck, sanityCheck } from './checks.js'
import { evaluateAllRules, recommendNextStep } from './decision-rules.js'

function effectiveResults(results) {
  const raw = results?.raw_results || {}
  const over = results?.user_overrides || {}
  const out = { ...raw }
  for (const [k, v] of Object.entries(over)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out
}

function fmtNum(v, digits = 4) {
  return Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : 'null'
}

function fmtMark(v) {
  if (v === true) return '✓'
  if (v === false) return '⚠'
  return '—'
}

export function buildReadoutMd(state) {
  const brief = state?.brief || {}
  const plan = state?.plan || {}
  const results = state?.results || {}
  const eff = effectiveResults(results)
  const srm = srmCheck({ control_n: eff.control_n, treatment_n: eff.treatment_n })
  const sanity = sanityCheck({
    results: eff,
    plan: { derived: plan.derived || {}, mde: brief.mde, brief },
  })
  const rulesEval = evaluateAllRules(brief.decision_rules, eff)
  const userChecks = results.user_checks || {}
  const recommendation = recommendNextStep(rulesEval, userChecks)
  const today = new Date().toISOString().slice(0, 10)
  const testId = state?.test_id || 'unknown'
  const title = state?.title || brief.metric_name || 'A/B тест'

  const lines = []
  lines.push('---')
  lines.push(`test_id: ${testId}`)
  lines.push(`created: ${today}`)
  lines.push('status: completed')
  lines.push('results:')
  lines.push(`  control_n: ${Number.isFinite(Number(eff.control_n)) ? eff.control_n : 'null'}`)
  lines.push(`  treatment_n: ${Number.isFinite(Number(eff.treatment_n)) ? eff.treatment_n : 'null'}`)
  lines.push(`  delta_rel: ${fmtNum(eff.delta_rel, 4)}`)
  lines.push(`  p_value: ${fmtNum(eff.p_value, 4)}`)
  lines.push(`  ci_lower: ${fmtNum(eff.ci_lower, 4)}`)
  lines.push(`  ci_upper: ${fmtNum(eff.ci_upper, 4)}`)
  if (Number.isFinite(Number(eff.srm_pvalue))) {
    lines.push(`  srm_pvalue: ${fmtNum(eff.srm_pvalue, 4)}`)
  }
  lines.push(`  novelty_flag: ${eff.novelty_flag === true ? 'true' : 'false'}`)
  lines.push('decision: ""')
  lines.push('---')
  lines.push('')
  lines.push(`# ${title}`)
  lines.push('')
  lines.push('## TL;DR')
  lines.push('')
  lines.push(
    `Δ rel = ${fmtNum(eff.delta_rel, 2)}%, 95% CI [${fmtNum(eff.ci_lower, 4)}…${fmtNum(eff.ci_upper, 4)}], p = ${fmtNum(eff.p_value, 4)}.`,
  )
  lines.push('')
  lines.push('## Results')
  lines.push('')
  lines.push(`- n control = ${eff.control_n ?? '—'}, n treatment = ${eff.treatment_n ?? '—'}`)
  lines.push(`- Δ rel = ${fmtNum(eff.delta_rel, 2)}%`)
  lines.push(`- 95% CI = [${fmtNum(eff.ci_lower, 4)} … ${fmtNum(eff.ci_upper, 4)}]`)
  lines.push(`- p-value = ${fmtNum(eff.p_value, 4)}`)
  lines.push('')
  lines.push('## Sanity checks')
  lines.push('')
  lines.push(`- ${fmtMark(srm.pass)} SRM: p = ${fmtNum(srm.pvalue, 4)}`)
  lines.push(`- ${fmtMark(sanity.total_n_match)} Sample size vs план`)
  lines.push(`- ${fmtMark(sanity.direction_match)} Направление эффекта vs MDE direction`)
  if (eff.novelty_flag === true) {
    lines.push('- ⚠ Novelty effect замечен')
  }
  lines.push('')
  lines.push('## Decision rules application')
  lines.push('')
  const nonEmpty = rulesEval.filter((r) => !r.empty)
  if (nonEmpty.length === 0) {
    lines.push('_Decision rules не заполнены в брифе._')
  } else {
    for (const r of nonEmpty) {
      const userVal = userChecks[r.field]
      const effVal = userVal == null ? r.auto_eval : userVal
      const mark = effVal === true ? 'сработало' : effVal === false ? 'не сработало' : 'не оценено'
      lines.push(`- **${r.action}**: ${r.raw} — ${mark}`)
    }
  }
  lines.push('')
  lines.push('## Recommended next step')
  lines.push('')
  lines.push(recommendation)
  lines.push('')
  lines.push('## Decision')
  lines.push('')
  lines.push('_To be filled manually._')
  lines.push('')

  return lines.join('\n')
}
