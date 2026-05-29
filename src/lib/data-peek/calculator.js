// Sprint 6: build a data_peek payload from manually-entered numbers (no CSV).
// Used by DataPeekManualForm.
//
// Manual peek delivers partial scoring: +5 pts (uploaded). Cannot compute
// distribution_check or stability_cv_under_threshold without raw data — those
// stay null and scoring.js skips the corresponding bonuses.

import { deltaMethodVariance } from './stats.js'

function isPositiveNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

function isNonNegativeNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

function isFiniteNum(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

function baseShape(brief) {
  return {
    ok: true,
    source: 'manual',
    uploaded: true,
    baseline_computed: brief?.baseline?.value ?? null,
    std_computed: null,
    ratio_variance: null,
    ratio_mean_numerator: null,
    ratio_mean_denominator: null,
    ratio_cov_nd: null,
    baseline_match_user_input: true, // manual = user-asserted by definition
    distribution_check: null,
    skewness: null,
    kurtosis: null,
    cv_value: null,
    stability_cv_under_threshold: null,
    raw_values: null,
    n_rows: null,
    n_days: null,
    warnings: [],
    error: null,
  }
}

function errShape(errors) {
  return { ok: false, source: 'manual', errors, error: null }
}

export function buildManualDataPeek({ metric_type, fields, brief } = {}) {
  if (metric_type === 'proportion') {
    return errShape({
      _form: 'Peek для proportion не требуется — baseline уже задан в Q05.',
    })
  }

  if (metric_type === 'continuous') {
    const sigma = fields?.sigma
    if (!isPositiveNum(sigma)) {
      return errShape({ sigma: 'Введи σ > 0.' })
    }
    return { ...baseShape(brief), std_computed: sigma }
  }

  if (metric_type === 'count') {
    // Poisson default σ = √baseline.value, but user can override.
    const baseline = brief?.baseline?.value
    let sigma = fields?.sigma
    if (sigma == null && isPositiveNum(baseline)) sigma = Math.sqrt(baseline)
    if (!isPositiveNum(sigma)) {
      return errShape({ sigma: 'Введи σ > 0 (по умолчанию √baseline для Poisson).' })
    }
    return { ...baseShape(brief), std_computed: sigma }
  }

  if (metric_type === 'ratio') {
    const errs = {}
    const { mean_n, mean_d, var_n, var_d, cov_nd } = fields || {}
    if (!isFiniteNum(mean_n)) errs.mean_n = 'Введи среднее числителя.'
    if (!isPositiveNum(mean_d))
      errs.mean_d = 'Введи среднее знаменателя > 0.'
    if (!isNonNegativeNum(var_n)) errs.var_n = 'Var(N) ≥ 0.'
    if (!isNonNegativeNum(var_d)) errs.var_d = 'Var(D) ≥ 0.'
    if (!isFiniteNum(cov_nd)) errs.cov_nd = 'Введи Cov(N,D) (можно 0).'
    if (Object.keys(errs).length > 0) return errShape(errs)

    const ratioVar = deltaMethodVariance({
      mean_n,
      mean_d,
      var_n,
      var_d,
      cov_nd,
    })
    if (!isFiniteNum(ratioVar)) {
      return errShape({ _form: 'Не удалось вычислить ratio_variance — проверь поля.' })
    }
    const baselineFromInputs = mean_n / mean_d
    return {
      ...baseShape(brief),
      baseline_computed: baselineFromInputs,
      ratio_variance: ratioVar,
      ratio_mean_numerator: mean_n,
      ratio_mean_denominator: mean_d,
      ratio_cov_nd: cov_nd,
    }
  }

  return errShape({ _form: `Неизвестный metric_type=${String(metric_type)}.` })
}
