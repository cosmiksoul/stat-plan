// Sprint 6: stats primitives used by csv.js and calculator.js.
// Pure functions, no React/state. Tested in tests/lib/data-peek/stats.test.js.
//
// References:
// - skewness/kurtosis: biased sample estimators (1/n), matching numpy defaults
//   with `bias=True`. Excess kurtosis = m4/m2^2 - 3 (so normal ≈ 0).
// - delta method: ADR-009; Var(N/D) ≈ Var(N)/μD² − 2·μN·Cov(N,D)/μD³ + μN²·Var(D)/μD⁴
// - distributionLabel thresholds match scoring.js expectation:
//   `'ok'` triggers the +5 pts bonus in scoreDataPeek.

function mean(values) {
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += values[i]
  return sum / values.length
}

function centralMoment(values, m, k) {
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - m
    sum += Math.pow(d, k)
  }
  return sum / values.length
}

export function skewness(values) {
  if (!Array.isArray(values) || values.length < 3) return null
  const m = mean(values)
  const m2 = centralMoment(values, m, 2)
  if (m2 === 0) return 0
  const m3 = centralMoment(values, m, 3)
  return m3 / Math.pow(m2, 1.5)
}

export function kurtosis(values) {
  if (!Array.isArray(values) || values.length < 4) return null
  const m = mean(values)
  const m2 = centralMoment(values, m, 2)
  if (m2 === 0) return 0
  const m4 = centralMoment(values, m, 4)
  return m4 / (m2 * m2) - 3
}

export function deltaMethodVariance({
  mean_n,
  mean_d,
  var_n,
  var_d,
  cov_nd,
}) {
  if (
    !Number.isFinite(mean_n) ||
    !Number.isFinite(mean_d) ||
    !Number.isFinite(var_n) ||
    !Number.isFinite(var_d) ||
    !Number.isFinite(cov_nd)
  ) {
    return null
  }
  if (mean_d === 0) return null
  const d2 = mean_d * mean_d
  const d3 = d2 * mean_d
  const d4 = d3 * mean_d
  return (
    var_n / d2 -
    (2 * mean_n * cov_nd) / d3 +
    (mean_n * mean_n * var_d) / d4
  )
}

export function dailyCV(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { cv: null, n_days: 0 }
  }
  const byDay = new Map()
  for (const row of rows) {
    if (row?.day == null) continue
    const key = String(row.day)
    const arr = byDay.get(key) || []
    arr.push(row.value)
    byDay.set(key, arr)
  }
  if (byDay.size === 0) return { cv: null, n_days: 0 }
  const dailyMeans = []
  for (const arr of byDay.values()) {
    if (arr.length > 0) dailyMeans.push(mean(arr))
  }
  if (dailyMeans.length < 2) {
    return { cv: null, n_days: dailyMeans.length }
  }
  const m = mean(dailyMeans)
  if (m === 0) return { cv: null, n_days: dailyMeans.length }
  const variance = centralMoment(dailyMeans, m, 2)
  const sigma = Math.sqrt(variance)
  return { cv: sigma / Math.abs(m), n_days: dailyMeans.length }
}

export function distributionLabel({ skewness, kurtosis }) {
  const sk = Number.isFinite(skewness) ? Math.abs(skewness) : 0
  const ku = Number.isFinite(kurtosis) ? kurtosis : 0
  const isSkewed = sk > 1
  const isHeavy = ku > 3
  if (isSkewed && isHeavy) return 'skewed_heavy'
  if (isSkewed) return 'skewed'
  if (isHeavy) return 'heavy_tailed'
  return 'ok'
}
