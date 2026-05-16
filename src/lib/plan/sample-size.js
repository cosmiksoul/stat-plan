// Sample size calculation per ADR-009 + SAMPLE_SIZE_CALC.md.
//
// Supported methods:
//   z_test_proportions — exact (Fleiss non-pooled SE for H1)
//   t_test / welch_t_test — normal approximation, needs σ
//   mannwhitney — t_test × 1.157 (ARE=0.864)
//   bootstrap — t_test fallback with warning
//   delta_method — needs data peek; without it falls back to bootstrap
//
// Tolerance: spec target n's in SAMPLE_SIZE_CALC.md are illustrative and
// off by 1-8% from the strict formula text. The formula is authoritative.
//
// Helpers normalInv/normalCdf are implemented from scratch (no deps) per
// ADR-010 (no new npm dependencies).

// ---- Normal distribution helpers -----------------------------------------

// Beasley-Springer-Moro inverse normal CDF, accurate to ~1e-9.
export function normalInv(p) {
  if (p <= 0 || p >= 1) {
    throw new Error(`normalInv: p must be in (0, 1), got ${p}`)
  }

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ]
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ]
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ]
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q, r
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  }
  if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    )
  }
  q = Math.sqrt(-2 * Math.log(1 - p))
  return (
    -(
      ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
      c[5]
    ) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  )
}

// Abramowitz-Stegun 26.2.17 approximation of normal CDF via erf, max error 7.5e-8.
export function normalCdf(x) {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + p * ax)
  const y =
    1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax)

  return 0.5 * (1 + sign * y)
}

// ---- Brief input normalization -------------------------------------------

function normalizeBaseline(baseline, metricType) {
  if (baseline?.value == null) return null
  if (baseline.unit === 'percent') return baseline.value / 100
  // For proportion default to fraction interpretation.
  return baseline.value
}

function mdeAbsolute(mde, baselineNorm) {
  if (mde?.value == null) return null
  const v = mde.value
  if (mde.unit === 'relative_percent') {
    if (baselineNorm == null) return null
    return baselineNorm * (v / 100)
  }
  if (mde.unit === 'absolute_percentage_points') {
    return v / 100
  }
  return v // absolute_value
}

function selectMethod(brief) {
  const explicit = brief.advanced?.test_method
  if (explicit) return explicit
  switch (brief.metric_type) {
    case 'proportion':
      return 'z_test_proportions'
    case 'continuous':
      return 't_test'
    case 'ratio':
      return 'delta_method'
    case 'count':
      return 'mannwhitney'
    default:
      return 'z_test_proportions'
  }
}

// ---- Z helpers ------------------------------------------------------------

function zAlpha(alpha, twoSided) {
  return normalInv(1 - (twoSided ? alpha / 2 : alpha))
}

function zBeta(power) {
  return normalInv(power)
}

// ---- Method-specific calculations ----------------------------------------

function zTestProportions(brief, baselineNorm, delta, warnings) {
  const alpha = brief.advanced?.alpha ?? 0.05
  const power = brief.advanced?.power ?? 0.8
  const twoSided = brief.advanced?.two_sided !== false
  const p1 = baselineNorm
  const p2 = p1 + delta
  if (p2 <= 0 || p2 >= 1) {
    warnings.push(
      `Расчётное p₂=${p2.toFixed(4)} выходит за (0,1) — MDE слишком велик.`,
    )
    return null
  }
  const pBar = (p1 + p2) / 2
  const sd1 = Math.sqrt(2 * pBar * (1 - pBar))
  const sd2 = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
  const za = zAlpha(alpha, twoSided)
  const zb = zBeta(power)
  const n = Math.pow((za * sd1 + zb * sd2) / delta, 2)
  return Math.ceil(n)
}

function tTestSampleSize(brief, baselineNorm, delta, sigma, warnings) {
  const alpha = brief.advanced?.alpha ?? 0.05
  const power = brief.advanced?.power ?? 0.8
  const twoSided = brief.advanced?.two_sided !== false
  if (!sigma || sigma <= 0) {
    warnings.push('σ метрики не задана — расчёт невозможен.')
    return null
  }
  const za = zAlpha(alpha, twoSided)
  const zb = zBeta(power)
  const n = 2 * Math.pow(((za + zb) * sigma) / delta, 2)
  return Math.ceil(n)
}

function resolveSigma(brief, baselineNorm, warnings, approximateRef) {
  const fromPeek = brief.data_peek?.std_computed
  if (fromPeek != null && fromPeek > 0) return fromPeek
  warnings.push(
    'σ метрики неизвестна, использован fallback CV=1 (σ=baseline). Расчёт приближённый — загрузи csv в Data Peek для точного значения.',
  )
  approximateRef.value = true
  return baselineNorm
}

// ---- Facade ---------------------------------------------------------------

export function calculateSampleSize(brief) {
  const warnings = []
  const approximateRef = { value: false }
  const method = selectMethod(brief)
  const baselineNorm = normalizeBaseline(brief.baseline, brief.metric_type)
  const delta = mdeAbsolute(brief.mde, baselineNorm)
  const daily = brief.daily_traffic?.value ?? null

  const emptyResult = (extraWarnings = []) => ({
    sample_size_per_arm: null,
    duration_days: null,
    test_method: method,
    warnings: [...warnings, ...extraWarnings],
    approximate: approximateRef.value,
  })

  // Edge: proportion baseline at the boundary. Check before delta, since
  // baseline=0 with relative MDE makes delta=0 too.
  if (brief.metric_type === 'proportion' && baselineNorm != null) {
    if (baselineNorm <= 0) {
      return emptyResult(['Baseline 0 — тест бессмыслен. Проверь значение.'])
    }
    if (baselineNorm >= 1) {
      return emptyResult([
        'Baseline 100% — тест бессмыслен. Проверь значение.',
      ])
    }
  }

  // Required inputs missing or invalid.
  if (baselineNorm == null || delta == null || delta <= 0) {
    return emptyResult()
  }

  let n
  let actualMethod = method

  switch (method) {
    case 'z_test_proportions':
      n = zTestProportions(brief, baselineNorm, delta, warnings)
      break

    case 't_test':
    case 'welch_t_test': {
      const sigma = resolveSigma(brief, baselineNorm, warnings, approximateRef)
      n = tTestSampleSize(brief, baselineNorm, delta, sigma, warnings)
      break
    }

    case 'mannwhitney': {
      const sigma = resolveSigma(brief, baselineNorm, warnings, approximateRef)
      const base = tTestSampleSize(brief, baselineNorm, delta, sigma, warnings)
      if (base != null) n = Math.ceil(base * 1.157)
      approximateRef.value = true
      warnings.push(
        'MW — приближение через t-test (ARE 0.864). Фактический размер может отличаться ±15% в зависимости от формы распределения.',
      )
      break
    }

    case 'bootstrap': {
      const sigma = resolveSigma(brief, baselineNorm, warnings, approximateRef)
      n = tTestSampleSize(brief, baselineNorm, delta, sigma, warnings)
      approximateRef.value = true
      warnings.push(
        'Bootstrap — расчёт ориентировочный. Для точной оценки сделай pilot и проверь стабильность bootstrap-CI.',
      )
      break
    }

    case 'delta_method': {
      const peekVar = brief.data_peek?.ratio_variance
      if (peekVar != null && peekVar > 0) {
        const alpha = brief.advanced?.alpha ?? 0.05
        const power = brief.advanced?.power ?? 0.8
        const twoSided = brief.advanced?.two_sided !== false
        const za = zAlpha(alpha, twoSided)
        const zb = zBeta(power)
        n = Math.ceil(
          2 * Math.pow(((za + zb) * Math.sqrt(peekVar)) / delta, 2),
        )
      } else {
        // Fallback: treat as bootstrap on baseline scale.
        warnings.push(
          'Для ratio-метрик нужен data peek с числителем и знаменателем. Расчёт через bootstrap fallback — приближение.',
        )
        approximateRef.value = true
        const sigma = baselineNorm
        n = tTestSampleSize(brief, baselineNorm, delta, sigma, warnings)
        actualMethod = 'delta_method' // keep label, but mark approximate
      }
      break
    }

    default:
      warnings.push(`Unknown test method: ${method}`)
      return emptyResult()
  }

  if (n == null) return emptyResult()

  // Post-hoc validations.
  if (n > 10_000_000) {
    warnings.push(
      'Расчётная выборка > 10M, тест нереалистичен. Увеличь MDE или пересмотри метрику.',
    )
  }
  if (n < 30) {
    warnings.push(
      'Расчётная выборка < 30, маловато для асимптотических методов. Используй точные тесты или увеличь power.',
    )
  }

  const duration = calculateDuration(n, daily)
  if (duration != null && duration > 90) {
    warnings.push(
      `Тест займёт ~${duration} дней (>3 месяцев) — нереалистично. Пересмотри параметры.`,
    )
  }

  return {
    sample_size_per_arm: n,
    duration_days: duration,
    test_method: actualMethod,
    warnings,
    approximate: approximateRef.value,
  }
}

export function calculateDuration(samplePerArm, dailyTraffic) {
  if (!dailyTraffic || dailyTraffic <= 0) return null
  if (samplePerArm == null) return null
  return Math.ceil((samplePerArm * 2) / dailyTraffic)
}
