// Plan scoring per docs/context/SCORING.md.
//
// Structural and consistency checks only — no judgement about "is this a good
// hypothesis" per ADR-003. Each remark is concrete (mentions the actual value
// that triggered it) so the user knows what to fix.
//
// Group weights: hypothesis 20, design 30, consistency 30, dataPeek 20 = 100.

const METHOD_MATRIX = {
  proportion: {
    z_test_proportions: 'ok',
    t_test: 'warn',
    welch_t_test: 'warn',
    mannwhitney: 'bad',
    bootstrap: 'ok',
    delta_method: 'bad',
  },
  continuous: {
    z_test_proportions: 'bad',
    t_test: 'ok',
    welch_t_test: 'ok',
    mannwhitney: 'ok',
    bootstrap: 'ok',
    delta_method: 'bad',
  },
  ratio: {
    z_test_proportions: 'bad',
    t_test: 'warn',
    welch_t_test: 'warn',
    mannwhitney: 'warn',
    bootstrap: 'ok',
    delta_method: 'ok',
  },
  count: {
    z_test_proportions: 'warn',
    t_test: 'warn',
    welch_t_test: 'warn',
    mannwhitney: 'ok',
    bootstrap: 'ok',
    delta_method: 'bad',
  },
}

// ---- Group 1: hypothesis (max 20) ----------------------------------------

const HYP_SLOT_LABELS = {
  change: 'изменение',
  metric: 'метрика',
  direction_magnitude: 'направление и величина',
  mechanism: 'механизм (потому что …)',
}

function scoreHypothesis(brief, remarks) {
  const slots = brief.hypothesis?.slots ?? {}
  let pts = 0
  for (const key of ['change', 'metric', 'direction_magnitude', 'mechanism']) {
    if (slots[key]) {
      pts += 5
    } else {
      remarks.push({
        id: `hypothesis.missing.${key}`,
        group: 'hypothesis',
        severity: 'warn',
        message: `Слот «${HYP_SLOT_LABELS[key]}» не распознан в формулировке гипотезы.`,
      })
    }
  }
  return pts
}

// ---- Group 2: design completeness (max 30) -------------------------------

function isFilled(v) {
  return v !== null && v !== undefined && v !== ''
}

function scoreDesign(brief, derived, remarks) {
  let pts = 0
  const advanced = brief.advanced ?? {}

  if (isFilled(brief.metric_type)) pts += 3
  else
    remarks.push({
      id: 'design.metric_type',
      group: 'design',
      severity: 'warn',
      message: 'Не указан тип метрики (metric_type).',
    })

  if (isFilled(derived?.test_method)) pts += 3

  if (isFilled(brief.randomization_unit)) pts += 3
  else
    remarks.push({
      id: 'design.randomization_unit',
      group: 'design',
      severity: 'warn',
      message: 'Не указана единица рандомизации.',
    })

  if (brief.mde?.value != null && brief.mde.value > 0) pts += 3
  else
    remarks.push({
      id: 'design.mde',
      group: 'design',
      severity: 'warn',
      message: 'Не указан MDE.',
    })

  const alphaOk =
    typeof advanced.alpha === 'number' &&
    advanced.alpha >= 0.01 &&
    advanced.alpha <= 0.1
  const powerOk =
    typeof advanced.power === 'number' &&
    advanced.power >= 0.7 &&
    advanced.power <= 0.95
  if (alphaOk && powerOk) pts += 3
  else
    remarks.push({
      id: 'design.alpha_power',
      group: 'design',
      severity: 'warn',
      message: `α=${advanced.alpha} или power=${advanced.power} вне разумного диапазона (α 0.01–0.1, power 0.7–0.95).`,
    })

  if (derived?.sample_size_per_arm != null && derived.sample_size_per_arm > 0)
    pts += 3
  else
    remarks.push({
      id: 'design.sample_size',
      group: 'design',
      severity: 'warn',
      message: 'Sample size не рассчитан — проверь baseline/MDE/traffic.',
    })

  if (derived?.duration_days != null && derived.duration_days > 0) pts += 3
  else
    remarks.push({
      id: 'design.duration',
      group: 'design',
      severity: 'info',
      message: 'Длительность не рассчитана — проверь daily_traffic.',
    })

  if (Array.isArray(brief.guardrails) && brief.guardrails.length >= 1) pts += 3
  else
    remarks.push({
      id: 'design.guardrails',
      group: 'design',
      severity: 'warn',
      message: 'Не заданы guardrail-метрики.',
    })

  const stops = brief.stop_conditions ?? {}
  const stopCount =
    (stops.srm_detected ? 1 : 0) +
    (stops.guardrail_breach_24h ? 1 : 0) +
    (stops.length_cap_days ? 1 : 0) +
    (stops.manual_stop ? 1 : 0)
  if (stopCount >= 1) pts += 3
  else
    remarks.push({
      id: 'design.stop_conditions',
      group: 'design',
      severity: 'warn',
      message: 'Не заданы условия остановки.',
    })

  const dr = brief.decision_rules ?? {}
  const drCount = (dr.ship ? 1 : 0) + (dr.iterate ? 1 : 0) + (dr.kill ? 1 : 0)
  if (drCount >= 2) pts += 3
  else
    remarks.push({
      id: 'design.decision_rules',
      group: 'design',
      severity: 'warn',
      message: `Decision rules неполные — заполнено ${drCount}/3, нужно ≥2.`,
    })

  return pts
}

// ---- Group 3: methodological consistency (max 30) ------------------------

function scoreConsistency(brief, derived, remarks) {
  let pts = 0
  const metricType = brief.metric_type
  const method = derived?.test_method

  // 1. Method ↔ metric_type matrix (6)
  const cell = METHOD_MATRIX[metricType]?.[method]
  if (cell === 'ok') pts += 6
  else if (cell === 'warn') {
    pts += 3
    remarks.push({
      id: 'consistency.method_warn',
      group: 'consistency',
      severity: 'warn',
      message: `${method} для метрики типа ${metricType} — лучше использовать рекомендованный метод (см. матрицу).`,
    })
  } else {
    // 'bad' or undefined
    remarks.push({
      id: 'consistency.method_critical',
      group: 'consistency',
      severity: 'critical',
      message: `Метод ${method} не подходит для metric_type=${metricType} — выбери другой.`,
    })
  }

  // 2. MDE realistic (6)
  const mde = brief.mde
  let mdeOk = true
  if (mde?.unit === 'relative_percent') {
    if (mde.value >= 50) {
      mdeOk = false
      remarks.push({
        id: 'consistency.mde_huge',
        group: 'consistency',
        severity: 'warn',
        message: `MDE ${mde.value}% rel. — очень крупный эффект. Проверь baseline и формулировку.`,
      })
    }
  } else if (mde?.unit === 'absolute_percentage_points') {
    const baseFraction = normalizeBaseline(brief.baseline)
    if (baseFraction != null && mde.value / 100 > baseFraction * 2) {
      mdeOk = false
      remarks.push({
        id: 'consistency.mde_huge',
        group: 'consistency',
        severity: 'warn',
        message: `MDE +${mde.value} п.п. больше чем 2× baseline (${(baseFraction * 100).toFixed(2)}%). Проверь единицы.`,
      })
    }
  }
  if (mdeOk) pts += 6

  // 3. Sample size reachable (≤14 days) (6)
  const duration = derived?.duration_days
  if (duration != null) {
    if (duration <= 14) pts += 6
    else
      remarks.push({
        id: 'consistency.sample_unreachable',
        group: 'consistency',
        severity: 'warn',
        message: `Расчётная длительность ${duration} дней (>14). Рассмотри увеличение MDE, стратификацию или CUPED.`,
      })
  } else {
    // No duration — can't check. Don't award points but no remark (design group covers it).
  }

  // 4. Baseline reasonable (4)
  const baseFraction = normalizeBaseline(brief.baseline)
  if (brief.metric_type === 'proportion') {
    if (baseFraction != null && baseFraction > 0.001 && baseFraction < 0.999)
      pts += 4
    else if (baseFraction != null) {
      remarks.push({
        id: 'consistency.baseline_edge',
        group: 'consistency',
        severity: 'warn',
        message: `Baseline ${(baseFraction * 100).toFixed(3)}% близок к 0 или 100% — статистика ломается.`,
      })
    }
  } else {
    if (brief.baseline?.value != null && brief.baseline.value !== 0) pts += 4
  }

  // 5. Guardrails non-conflict with main metric (4)
  const conflictingGuardrail = (brief.guardrails ?? []).find(
    (g) => g.name && brief.metric_name && g.name === brief.metric_name,
  )
  if (!conflictingGuardrail) pts += 4
  else
    remarks.push({
      id: 'consistency.guardrail_conflict',
      group: 'consistency',
      severity: 'warn',
      message: `Guardrail "${conflictingGuardrail.name}" совпадает с main metric — это не guardrail, а главная метрика.`,
    })

  // 6. Variance reduction (4)
  // Sprint 3 doesn't have covariate input, so treat null VR as "ok" (4 pts).
  // If VR is set without supporting field (cuped without covariate), warn.
  // Currently no covariate field exists → if VR is set we warn but still award 4
  // (we can't validate what doesn't exist). Tightened in future sprints.
  const vr = brief.advanced?.variance_reduction
  if (vr == null) {
    pts += 4
  } else {
    pts += 4 // accept for now
    remarks.push({
      id: 'consistency.vr_unverified',
      group: 'consistency',
      severity: 'info',
      message: `Указан variance_reduction=${vr}. Валидация ковариаты появится в следующем спринте.`,
    })
  }

  return pts
}

// ---- Group 4: data peek (max 20) -----------------------------------------

function scoreDataPeek(brief, remarks) {
  const dp = brief.data_peek
  if (!dp || !dp.uploaded) {
    remarks.push({
      id: 'dataPeek.absent',
      group: 'dataPeek',
      severity: 'info',
      message:
        'Data peek не выполнен — без него общий скор ограничен 80. Загрузи csv для точного baseline и проверки распределения.',
    })
    return 0
  }
  let pts = 5 // uploaded
  if (dp.baseline_match_user_input === true) pts += 5
  if (dp.distribution_check === 'ok') pts += 5
  if (dp.stability_cv_under_threshold === true) pts += 5
  return pts
}

// ---- Shared helpers ------------------------------------------------------

function normalizeBaseline(baseline) {
  if (baseline?.value == null) return null
  // baseline.unit is 'fraction' or null after parse — value is already in
  // the right shape (no 'percent' path is reachable).
  return baseline.value
}

// ---- Facade --------------------------------------------------------------

export function scorePlan(brief, derived) {
  const remarks = []
  const hypothesis = scoreHypothesis(brief, remarks)
  const design = scoreDesign(brief, derived, remarks)
  const consistency = scoreConsistency(brief, derived, remarks)
  const dataPeek = scoreDataPeek(brief, remarks)

  return {
    total: hypothesis + design + consistency + dataPeek,
    breakdown: { hypothesis, design, consistency, dataPeek },
    remarks,
  }
}
