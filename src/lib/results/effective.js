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
  return out
}
