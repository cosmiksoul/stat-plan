// Soft validators for brief answers.
// Each validator returns { ok: true, message: null } on success
// or { ok: false, message: <human text> } on failure.
// Per FLOW.md step 1 these are warnings, not blockers — the UI does
// not prevent navigation, it just surfaces the message.

const OK = Object.freeze({ ok: true, message: null })

function fail(message) {
  return { ok: false, message }
}

function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

export function validateBaseline(baseline, metricType) {
  const value = baseline?.value
  const unit = baseline?.unit
  if (isEmpty(value)) return OK

  if (metricType === 'proportion') {
    if (unit === 'fraction') {
      if (value <= 0 || value >= 1) {
        return fail('Для доли значение должно быть 0 < x < 1.')
      }
      return OK
    }
    // default percent
    if (value <= 0 || value >= 100) {
      return fail('Значение должно быть 0 < x < 100%.')
    }
    return OK
  }

  if (value <= 0) {
    return fail('Значение должно быть больше нуля.')
  }
  return OK
}

export function validateMde(mde, baseline) {
  const value = mde?.value
  const unit = mde?.unit
  if (isEmpty(value)) return OK

  if (unit === 'relative_percent' && value > 50) {
    return fail('Очень крупный относительный эффект (>50%). Проверь baseline.')
  }

  if (unit === 'absolute_percentage_points' && !isEmpty(baseline?.value)) {
    const baselineInPp =
      baseline.unit === 'fraction' ? baseline.value * 100 : baseline.value
    if (value > baselineInPp) {
      return fail('MDE в абсолютных п.п. больше baseline — это странно.')
    }
  }

  if (value <= 0) {
    return fail('MDE должен быть положительным.')
  }

  return OK
}

export function validateDailyTraffic(traffic, randomizationUnit) {
  const value = traffic?.value
  const unit = traffic?.unit
  if (isEmpty(value)) return OK

  if (value <= 0) {
    return fail('Дневной трафик должен быть положительным.')
  }

  if (
    randomizationUnit &&
    randomizationUnit !== 'unknown' &&
    randomizationUnit !== 'cluster' &&
    unit &&
    unit !== randomizationUnit
  ) {
    return fail(
      `Единица трафика (${unit}) не совпадает с единицей рандомизации (${randomizationUnit}).`,
    )
  }

  return OK
}

export function validateGuardrails(guardrails) {
  if (!Array.isArray(guardrails) || guardrails.length === 0) {
    return fail('Не заданы guardrails — рекомендуется хотя бы один.')
  }
  return OK
}

export function validateHypothesisText(text) {
  if (!text || !text.toString().trim()) {
    return fail('Гипотеза не может быть пустой.')
  }
  return OK
}
