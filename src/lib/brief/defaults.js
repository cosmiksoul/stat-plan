// Per-question entry defaults for the brief.
// Pure function: given a brief and the id of the question the user is about to
// see, return a possibly-patched brief with auto-filled fields.
//
// Invariants:
//   - never overwrites fields the user has touched
//   - never re-applies after a successful application (uses brief.defaultsApplied)
//   - on no-op, returns the same brief reference for cheap identity checks
//
// Sprint 5-6 test_plan.md parser will dispatch ANSWER_QUESTION through the
// reducer too, so defaults and parser share one write path.

import { extractMetricName } from './hypothesis-parser.js'

function mdeRel(mde) {
  if (mde?.unit === 'relative_percent' && mde.value != null) {
    return `${mde.value / 2}% rel.`
  }
  return 'MDE/2 rel.'
}

function defaultDecisionRules(mde) {
  const half = mdeRel(mde)
  return {
    ship: `CI не пересекает 0 и нижняя граница ≥ +${half}`,
    iterate:
      'Статистически незначимо, но направление positive в 2+ сегментах — итерируем.',
    kill: `Guardrail breach или CI ≤ −${half}`,
  }
}

export function applyEnterDefaults(brief, questionId) {
  if (questionId === 'metric_name') {
    if (brief.defaultsApplied?.metric_name) return brief
    if (brief.metric_name) return brief
    const candidate = extractMetricName(brief.hypothesis?.text ?? '')
    if (!candidate) return brief
    return {
      ...brief,
      metric_name: candidate,
      defaultsApplied: { ...brief.defaultsApplied, metric_name: true },
    }
  }

  if (questionId === 'stop_and_decisions') {
    if (brief.defaultsApplied?.decision_rules) return brief
    const dr = brief.decision_rules ?? {}
    if (dr.ship || dr.iterate || dr.kill) return brief
    return {
      ...brief,
      decision_rules: defaultDecisionRules(brief.mde),
      defaultsApplied: { ...brief.defaultsApplied, decision_rules: true },
    }
  }

  return brief
}
