// Sprint 7 S2 — SRM (sample ratio mismatch) and sanity checks.
//
// SRM: chi² test against a fair 50/50 split. Returns p-value; pass if p≥0.001
// (industry convention — Microsoft, Booking publications).
//
// Sanity vs plan: are total counts close to 2× sample_size_per_arm? Does the
// observed delta sign match the brief's MDE direction expectation?

const SRM_THRESHOLD = 0.001
const TOTAL_TOLERANCE = 0.1 // 10 % relative
const COUNT_BAR = 0.5

// Lower incomplete gamma via series expansion (Numerical Recipes 6.2 — good
// for s>0, x small). Sufficient precision for our SRM df=1 use case.
function lowerIncompleteGamma(s, x) {
  if (x <= 0) return 0
  let sum = 1 / s
  let term = 1 / s
  for (let n = 1; n < 200; n++) {
    term *= x / (s + n)
    sum += term
    if (Math.abs(term) < Math.abs(sum) * 1e-12) break
  }
  return Math.pow(x, s) * Math.exp(-x) * sum
}

function gammaLn(z) {
  // Stirling/Lanczos approximation; accurate to ~10 digits for z>0.5.
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    return (
      Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z)
    )
  }
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function chi2SfDf1(x) {
  // Survival function (1 - CDF) for chi² with df=1.
  // P(X²>x) = 1 - P(1/2, x/2) where P is regularized lower incomplete gamma.
  if (x <= 0) return 1
  const s = 0.5
  const halfX = x / 2
  const num = lowerIncompleteGamma(s, halfX)
  const denom = Math.exp(gammaLn(s))
  const regularized = num / denom
  return Math.max(0, Math.min(1, 1 - regularized))
}

export function srmCheck({ control_n, treatment_n } = {}) {
  const c = Number(control_n)
  const t = Number(treatment_n)
  if (!Number.isFinite(c) || !Number.isFinite(t) || c < COUNT_BAR || t < COUNT_BAR) {
    return { pvalue: null, pass: null, total: null }
  }
  const total = c + t
  const expected = total / 2
  const chi2 = Math.pow(c - expected, 2) / expected + Math.pow(t - expected, 2) / expected
  const pvalue = chi2SfDf1(chi2)
  return {
    pvalue,
    pass: pvalue >= SRM_THRESHOLD,
    total,
  }
}

export function sanityCheck({ results, plan } = {}) {
  const warnings = []
  const out = {
    total_n_match: null,
    direction_match: null,
    warnings,
  }
  if (!results || !plan) return out

  const c = Number(results.control_n)
  const t = Number(results.treatment_n)
  const totalObserved = (Number.isFinite(c) ? c : 0) + (Number.isFinite(t) ? t : 0)
  const perArm = Number(plan?.derived?.sample_size_per_arm)
  if (Number.isFinite(perArm) && perArm > 0 && totalObserved > 0) {
    const planned = perArm * 2
    const ratio = totalObserved / planned
    out.total_n_match = ratio >= 1 - TOTAL_TOLERANCE && ratio <= 1 + TOTAL_TOLERANCE
    if (!out.total_n_match) {
      warnings.push(
        `Суммарный размер выборки (${totalObserved}) отличается от плана (${planned}) более чем на ${Math.round(TOTAL_TOLERANCE * 100)}%.`,
      )
    }
  }

  const delta = Number(results.delta_rel)
  const direction = plan?.brief?.mde?.direction || plan?.mde?.direction
  if (Number.isFinite(delta) && direction && direction !== 'any') {
    if (direction === 'increase') out.direction_match = delta > 0
    else if (direction === 'decrease') out.direction_match = delta < 0
    if (out.direction_match === false) {
      warnings.push(
        `Знак эффекта (Δ=${delta}) не совпадает с направлением MDE (${direction}).`,
      )
    }
  }

  return out
}
