// Select default test_method from metric_type per SCORING.md matrix.
// If multiple methods are listed as "✓" in the matrix, take the first one.
// Without data peek some choices fall back (e.g. ratio → bootstrap instead
// of delta_method) — that fallback is handled inside sample-size.js.

export function selectTestMethod(metricType) {
  switch (metricType) {
    case 'proportion':
      return 'z_test_proportions'
    case 'continuous':
      return 't_test'
    case 'ratio':
      return 'delta_method'
    case 'count':
      return 'mannwhitney'
    default:
      return null
  }
}
