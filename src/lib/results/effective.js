// Sprint 7 — small helper used by UI + html/md builders. Effective results
// = raw_results from ipynb tagged cell, with user_overrides on top (ignoring
// empty/null/undefined overrides so the form can clear a field without
// wiping the parsed value).

export function effectiveResults(results) {
  const raw = results?.raw_results || {}
  const over = results?.user_overrides || {}
  const out = { ...raw }
  for (const [k, v] of Object.entries(over)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  // Sprint 8 P-14 — derive % rel CI bounds from control_mean so decision rules
  // written as "CI ≤ −2.5% rel" compare correctly across metric types. Absent
  // control_mean (old ipynb) → derived stay undefined → unit-aware rules fall
  // back to manual checkbox.
  const cm = Number(out.control_mean)
  if (Number.isFinite(cm) && cm !== 0) {
    if (Number.isFinite(Number(out.ci_lower))) {
      out.ci_lower_pct_rel = (Number(out.ci_lower) / cm) * 100
    }
    if (Number.isFinite(Number(out.ci_upper))) {
      out.ci_upper_pct_rel = (Number(out.ci_upper) / cm) * 100
    }
  }
  return out
}
