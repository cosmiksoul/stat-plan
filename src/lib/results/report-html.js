// Sprint 7 S5 — generate a self-contained HTML one-pager from full state.
// No external CSS/JS, dark stat·plan palette inline. Embeds PNG graphs from
// the uploaded ipynb as `data:image/png;base64,...`. Designed to open in any
// browser, print to PDF via Ctrl+P.

import { srmCheck, sanityCheck } from './checks.js'
import { evaluateAllRules, recommendNextStep } from './decision-rules.js'

const STYLES = `
  body { background: #0e1014; color: #ededed; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif; max-width: 920px; margin: 0 auto; padding: 32px 24px 80px; line-height: 1.55; }
  header { border-bottom: 1px solid #2a2d33; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 26px; margin: 0 0 4px; color: #ededed; }
  h2 { font-size: 18px; margin: 28px 0 10px; color: #a3e635; border-bottom: 1px solid #2a2d33; padding-bottom: 6px; }
  .meta { color: #a8a8a8; font-size: 13px; }
  section { margin-bottom: 24px; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #2a2d33; }
  th { color: #a8a8a8; font-weight: 500; }
  .tldr { background: #1a1d23; border-left: 3px solid #a3e635; padding: 12px 16px; border-radius: 4px; font-size: 15px; }
  .ok { color: #a3e635; }
  .warn { color: #fbbf24; }
  .bad { color: #f87171; }
  .muted { color: #6b7280; font-style: italic; }
  img.graph { max-width: 100%; height: auto; border: 1px solid #2a2d33; border-radius: 6px; margin: 12px 0; background: #1a1d23; }
  footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #2a2d33; color: #6b7280; font-size: 12px; }
  .final-decision { background: #1a1d23; border: 1px dashed #3a3f47; padding: 16px; border-radius: 4px; min-height: 40px; }
`

function esc(v) {
  if (v == null) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtPct(v, digits = 2) {
  if (!Number.isFinite(Number(v))) return '—'
  return `${Number(v).toFixed(digits)}%`
}

function fmtNum(v, digits = 4) {
  if (!Number.isFinite(Number(v))) return '—'
  return Number(v).toFixed(digits)
}

function fmtInt(v) {
  if (!Number.isFinite(Number(v))) return '—'
  return Number(v).toLocaleString('ru-RU')
}

function effectiveResults(results) {
  const raw = results?.raw_results || {}
  const over = results?.user_overrides || {}
  const out = { ...raw }
  for (const [k, v] of Object.entries(over)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out
}

function buildTldr(state, eff) {
  const decision = state?.results?.user_decision
  const delta = fmtPct(eff.delta_rel, 2)
  const ciLow = fmtNum(eff.ci_lower, 4)
  const ciHigh = fmtNum(eff.ci_upper, 4)
  const p = fmtNum(eff.p_value, 4)
  const decisionStr = decision || '—'
  return `Δ rel = ${delta}, 95% CI [${ciLow}…${ciHigh}], p = ${p}. Решение: <strong>${esc(decisionStr)}</strong>.`
}

function buildImages(images) {
  if (!Array.isArray(images) || images.length === 0) return ''
  return images
    .map(
      (img) =>
        `<img class="graph" alt="График из ноутбука" src="data:image/png;base64,${img.base64_png}" />`,
    )
    .join('\n    ')
}

export function buildReportHtml(state) {
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
  const testId = state?.test_id || '—'
  const title = state?.title || brief.metric_name || 'A/B тест'
  const hypothesis = brief?.hypothesis?.text || '—'

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>${esc(testId)} — A/B Test Report</title>
<style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>${esc(title)}</h1>
    <p class="meta">test_id: <code>${esc(testId)}</code> · ${esc(today)}</p>
  </header>

  <section>
    <h2>TL;DR</h2>
    <p class="tldr">${buildTldr(state, eff)}</p>
  </section>

  <section>
    <h2>Гипотеза и дизайн</h2>
    <p>${esc(hypothesis)}</p>
    <table>
      <tr><th>Метрика</th><td>${esc(brief.metric_name || '—')} (${esc(brief.metric_type || '—')})</td></tr>
      <tr><th>Метод</th><td>${esc(plan?.derived?.test_method || '—')}</td></tr>
      <tr><th>Sample size / arm (план)</th><td>${fmtInt(plan?.derived?.sample_size_per_arm)}</td></tr>
      <tr><th>α / power</th><td>${fmtNum(brief?.advanced?.alpha, 3)} / ${fmtNum(brief?.advanced?.power, 2)}</td></tr>
      <tr><th>MDE</th><td>${fmtNum(brief?.mde?.value, 2)} (${esc(brief?.mde?.unit || '—')}, ${esc(brief?.mde?.direction || 'any')})</td></tr>
    </table>
  </section>

  <section>
    <h2>Результаты</h2>
    <ul>
      <li>Δ rel = <strong>${fmtPct(eff.delta_rel, 2)}</strong>, 95% CI [${fmtNum(eff.ci_lower, 4)}…${fmtNum(eff.ci_upper, 4)}]</li>
      <li>p-value = ${fmtNum(eff.p_value, 4)}</li>
      <li>n control = ${fmtInt(eff.control_n)}, n treatment = ${fmtInt(eff.treatment_n)}</li>
    </ul>
    ${buildImages(results.images)}
  </section>

  <section>
    <h2>Sanity checks</h2>
    <ul>
      <li>${srm.pass === true ? '<span class="ok">✓</span>' : srm.pass === false ? '<span class="bad">⚠</span>' : '<span class="muted">—</span>'} SRM: p = ${fmtNum(srm.pvalue, 4)}</li>
      <li>${sanity.total_n_match === true ? '<span class="ok">✓</span>' : sanity.total_n_match === false ? '<span class="warn">⚠</span>' : '<span class="muted">—</span>'} Sample size vs план</li>
      <li>${sanity.direction_match === true ? '<span class="ok">✓</span>' : sanity.direction_match === false ? '<span class="warn">⚠</span>' : '<span class="muted">—</span>'} Направление эффекта vs MDE direction</li>
      ${
        Number.isFinite(Number(eff.srm_pvalue))
          ? `<li>SRM p-value из ноутбука: ${fmtNum(eff.srm_pvalue, 4)}</li>`
          : ''
      }
      ${eff.novelty_flag === true ? '<li><span class="warn">⚠</span> Novelty effect замечен</li>' : ''}
    </ul>
  </section>

  <section>
    <h2>Применение decision rules</h2>
    <ul>
      ${rulesEval
        .filter((r) => !r.empty)
        .map((r) => {
          const userVal = userChecks[r.field]
          const eff = userVal == null ? r.auto_eval : userVal
          const mark = eff === true ? '<span class="ok">сработало</span>' : eff === false ? '<span class="muted">не сработало</span>' : '<span class="muted">не оценено</span>'
          return `<li><strong>${esc(r.action)}</strong>: ${esc(r.raw)} — ${mark}</li>`
        })
        .join('\n      ') || '<li class="muted">Decision rules не заполнены в брифе.</li>'}
    </ul>
    <p><strong>Recommended next step:</strong> ${esc(recommendation)}</p>
  </section>

  <section>
    <h2>Принятое решение</h2>
    <div class="final-decision">
      ${results.user_decision ? `<strong>${esc(results.user_decision)}</strong>` : '<span class="muted">[Заполни вручную]</span>'}
    </div>
  </section>

  <footer>Generated by stat·plan · ${esc(today)}</footer>
</body>
</html>
`
}
