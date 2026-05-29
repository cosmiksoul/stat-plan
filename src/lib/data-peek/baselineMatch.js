// Sprint 6 FIX iter 1 (C-1): shared utility for comparing a computed baseline
// (from Data Peek) with the user-entered baseline in Q05.
//
// Returns true  — within 10% relative tolerance (or both ≈ 0)
// Returns false — outside tolerance
// Returns null  — one of the inputs is missing / not a finite number
//
// Used both:
//   - by csv.js / calculator.js to freeze a snapshot into data_peek.baseline_match_user_input
//     (scoring reads that snapshot for +5 pts);
//   - by DataPeekStats.jsx to render a LIVE comparison so the «↳ ПОДСТАВИТЬ В Q05»
//     button disappears immediately after the user applies the suggestion
//     (state.brief.baseline.value updates → liveMatch flips to true → UI refreshes).

const REL_TOLERANCE = 0.1

export function baselineMatch(computed, userInput) {
  if (
    typeof computed !== 'number' ||
    !Number.isFinite(computed) ||
    typeof userInput !== 'number' ||
    !Number.isFinite(userInput)
  ) {
    return null
  }
  if (userInput === 0) return Math.abs(computed) < 1e-9
  return Math.abs(computed - userInput) / Math.abs(userInput) < REL_TOLERANCE
}
