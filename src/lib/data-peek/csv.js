// Sprint 6: parse a historical CSV into a data_peek payload.
// Pure function — UI layer reads File via FileReader and passes text in.
//
// Schema resolution per metric_type:
//   proportion → <brief.metric_column>     (0/1 or fraction)
//   continuous → <brief.metric_column>     (float)
//   count      → <brief.metric_column>     (integer ≥ 0)
//   ratio      → <ratio_components.numerator>, <ratio_components.denominator>
// All four can additionally carry an optional `day` column (used for stability CV).

import Papa from 'papaparse'
import {
  skewness,
  kurtosis,
  dailyCV,
  distributionLabel,
  deltaMethodVariance,
} from './stats.js'
import { baselineMatch as compareBaselines } from './baselineMatch.js'

const MAX_BYTES = 50 * 1024 * 1024 // 50MB hard cap, ADR-001 gentle agreement
const RAW_VALUES_LIMIT = 1000 // D3: random-sample down to this for histogram

function isFiniteNum(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Reservoir sampling — keeps a uniformly-random subset of length `k`.
function reservoirSample(values, k, seed = 1) {
  if (values.length <= k) return [...values]
  const out = values.slice(0, k)
  let s = seed >>> 0
  for (let i = k; i < values.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    if (j < k) out[j] = values[i]
  }
  return out
}

function meanOf(values) {
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += values[i]
  return sum / values.length
}

function varianceOf(values, m) {
  let s = 0
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - m
    s += d * d
  }
  return s / values.length
}

function covarianceOf(a, b, ma, mb) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb)
  return s / a.length
}

function stdOf(values, m) {
  return Math.sqrt(varianceOf(values, m))
}

function errResult(message) {
  return { ok: false, source: 'csv', error: { message } }
}

function expectedSchemaText(brief) {
  if (brief.metric_type === 'ratio') {
    const n = brief.ratio_components?.numerator || '<numerator>'
    const d = brief.ratio_components?.denominator || '<denominator>'
    return `Ожидаем колонки: ${n}, ${d} + опционально day.`
  }
  const col = brief.metric_column || '<metric_column>'
  return `Ожидаем колонку: ${col} + опционально day.`
}

export function parseDataPeekCsv(text, brief, options = {}) {
  const maxBytes = options.maxBytes ?? MAX_BYTES
  if (typeof text !== 'string') {
    return errResult('Не CSV-текст.')
  }
  if (text.length > maxBytes) {
    return errResult('CSV слишком большой (>50MB). Сэмплируй его локально.')
  }
  // BOM strip
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  if (clean.trim() === '') {
    return errResult('Пустой CSV.')
  }

  const metricType = brief?.metric_type
  if (!metricType) {
    return errResult('metric_type не задан — заполни Q03 перед загрузкой CSV.')
  }

  // Ratio early validation: need both ratio component column names.
  let numCol = null
  let denCol = null
  let valueCol = null
  if (metricType === 'ratio') {
    numCol = brief.ratio_components?.numerator
    denCol = brief.ratio_components?.denominator
    if (!numCol || !denCol) {
      return errResult(
        'Заполни числитель/знаменатель в Q03.1 перед загрузкой CSV для ratio.',
      )
    }
  } else {
    valueCol = brief.metric_column
    if (!valueCol) {
      return errResult(
        'metric_column пуст — заполни Q03.2 перед загрузкой CSV.',
      )
    }
  }

  const parsed = Papa.parse(clean, {
    header: true,
    skipEmptyLines: true,
  })

  // UndetectableDelimiter is benign for single-column CSVs — Papa still
  // parses the file as one column. Surface only real structural errors.
  const realErrors = (parsed.errors || []).filter(
    (e) => e.code !== 'UndetectableDelimiter',
  )
  if (realErrors.length > 0) {
    return errResult(`Не удалось распарсить CSV: ${realErrors[0].message}.`)
  }
  const rows = parsed.data || []
  if (rows.length === 0) {
    return errResult('CSV не содержит строк данных.')
  }

  const headers = parsed.meta?.fields || []
  function require(col) {
    return headers.includes(col)
  }

  if (metricType === 'ratio') {
    if (!require(numCol)) {
      return errResult(`В CSV нет колонки «${numCol}». ${expectedSchemaText(brief)}`)
    }
    if (!require(denCol)) {
      return errResult(`В CSV нет колонки «${denCol}». ${expectedSchemaText(brief)}`)
    }
  } else if (!require(valueCol)) {
    return errResult(`В CSV нет колонки «${valueCol}». ${expectedSchemaText(brief)}`)
  }

  const hasDay = headers.includes('day')
  const warnings = []

  // Branch: ratio vs single-column metric.
  if (metricType === 'ratio') {
    const nums = []
    const dens = []
    const ratios = []
    const dayRows = []
    for (const row of rows) {
      const n = toNumber(row[numCol])
      const d = toNumber(row[denCol])
      if (n == null || d == null) continue
      nums.push(n)
      dens.push(d)
      if (d !== 0) ratios.push(n / d)
      if (hasDay && row.day != null && d !== 0) {
        dayRows.push({ day: row.day, value: n / d })
      }
    }
    if (nums.length === 0) {
      return errResult(
        `Колонки «${numCol}»/«${denCol}» не содержат валидных чисел.`,
      )
    }
    if (ratios.length === 0) {
      return errResult(
        `Все строки имеют ${denCol}=0 — расчёт ratio невозможен.`,
      )
    }
    const meanN = meanOf(nums)
    const meanD = meanOf(dens)
    const varN = varianceOf(nums, meanN)
    const varD = varianceOf(dens, meanD)
    const covND = covarianceOf(nums, dens, meanN, meanD)
    const ratioVar = deltaMethodVariance({
      mean_n: meanN,
      mean_d: meanD,
      var_n: varN,
      var_d: varD,
      cov_nd: covND,
    })
    const baselineComputed = meanN / meanD
    const sk = skewness(ratios)
    const ku = kurtosis(ratios)
    const distribution = sk != null && ku != null ? distributionLabel({ skewness: sk, kurtosis: ku }) : null
    const { cv, n_days } = dailyCV(dayRows)
    const stability = cv == null ? null : cv < 0.3
    if (cv == null && hasDay && dayRows.length > 0) {
      warnings.push(
        'Недостаточно дней для расчёта CV — нужно ≥ 2 дней.',
      )
    } else if (!hasDay) {
      warnings.push(
        'В CSV нет колонки day — stability check недоступен (бонус не начислен).',
      )
    }
    const baselineMatch = compareBaselines(
      baselineComputed,
      brief?.baseline?.value,
    )
    return {
      ok: true,
      source: 'csv',
      uploaded: true,
      baseline_computed: baselineComputed,
      std_computed: null,
      ratio_variance: ratioVar,
      ratio_mean_numerator: meanN,
      ratio_mean_denominator: meanD,
      ratio_cov_nd: covND,
      baseline_match_user_input: baselineMatch,
      distribution_check: distribution,
      skewness: sk,
      kurtosis: ku,
      cv_value: cv,
      stability_cv_under_threshold: stability,
      raw_values: reservoirSample(ratios, RAW_VALUES_LIMIT),
      // C-2: same seed (default) across the three reservoirSample calls keeps
      // the i-th sampled point synchronized between numerator / denominator /
      // ratio — useful if we ever want a scatter plot N vs D.
      raw_values_numerator: reservoirSample(nums, RAW_VALUES_LIMIT),
      raw_values_denominator: reservoirSample(dens, RAW_VALUES_LIMIT),
      n_rows: ratios.length,
      n_days,
      warnings,
      error: null,
    }
  }

  // Non-ratio: single value column.
  const values = []
  const dayRows = []
  for (const row of rows) {
    const v = toNumber(row[valueCol])
    if (v == null) continue
    values.push(v)
    if (hasDay && row.day != null) {
      dayRows.push({ day: row.day, value: v })
    }
  }
  if (values.length === 0) {
    return errResult(`Колонка «${valueCol}» не содержит валидных чисел.`)
  }
  // proportion sanity: typical inputs are 0/1 or fractions 0..1. We don't
  // reject other ranges, but flag if mean > 1 (likely percent vs fraction).
  if (metricType === 'proportion') {
    const m = meanOf(values)
    if (m > 1) {
      warnings.push(
        `Среднее значение колонки = ${m.toFixed(3)} > 1. Похоже на проценты, а не fraction — проверь данные.`,
      )
    }
  }
  const m = meanOf(values)
  const std = stdOf(values, m)
  const sk = values.length >= 3 ? skewness(values) : null
  const ku = values.length >= 4 ? kurtosis(values) : null
  const distribution = sk != null && ku != null ? distributionLabel({ skewness: sk, kurtosis: ku }) : null
  const { cv, n_days } = dailyCV(dayRows)
  const stability = cv == null ? null : cv < 0.3
  if (cv == null && hasDay && dayRows.length > 0) {
    warnings.push('Недостаточно дней для расчёта CV — нужно ≥ 2 дней.')
  } else if (!hasDay) {
    warnings.push(
      'В CSV нет колонки day — stability check недоступен (бонус не начислен).',
    )
  }
  const baselineMatch = compareBaselines(m, brief?.baseline?.value)
  const stdSafe = isFiniteNum(std) && std > 0 ? std : null
  return {
    ok: true,
    source: 'csv',
    uploaded: true,
    baseline_computed: m,
    std_computed: stdSafe,
    ratio_variance: null,
    ratio_mean_numerator: null,
    ratio_mean_denominator: null,
    ratio_cov_nd: null,
    baseline_match_user_input: baselineMatch,
    distribution_check: distribution,
    skewness: sk,
    kurtosis: ku,
    cv_value: cv,
    stability_cv_under_threshold: stability,
    raw_values: reservoirSample(values, RAW_VALUES_LIMIT),
    // C-2: ratio-specific raw_values_numerator/denominator are explicitly null
    // for single-column metric types so round-trip remains symmetrical.
    raw_values_numerator: null,
    raw_values_denominator: null,
    n_rows: values.length,
    n_days,
    warnings,
    error: null,
  }
}

