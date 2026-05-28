// localStorage adapter for state persistence. No React.
// Versioned key — bump v1 → v2 when persisted shape changes structurally.
//
// What we persist:
//   - state.started
//   - state.test_id, state.title (set after LOAD_TEST_PLAN_MD)
//   - state.brief (all fields except currentQuestion + advancedExpanded — UI state)
//   - state.plan (status / approvedAt / editedExternally / briefSubmitted)
//
// What we don't persist:
//   - state.tourEnabled (per-session preference)
//   - state.brief.currentQuestion / advancedExpanded (UI state, restart from Q01)
//   - state.plan.derived / score (cheap to recompute, avoids stale data)
//   - state.plan.parse_warnings (transient, dismissed by the user)

export const STORAGE_KEY = 'stat-plan:v1:state'

// ---- whitelist on save ---------------------------------------------------

function pickBrief(brief) {
  if (!brief) return undefined
  const { currentQuestion, advancedExpanded, ...rest } = brief
  return rest
}

function pickPlan(plan) {
  if (!plan) return undefined
  const { derived, score, parse_warnings, ...rest } = plan
  return rest
}

function pickForStorage(state) {
  return {
    started: state.started,
    test_id: state.test_id ?? null,
    title: state.title ?? null,
    brief: pickBrief(state.brief),
    plan: pickPlan(state.plan),
  }
}

// ---- merge on load -------------------------------------------------------

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

function mergeRestored(persisted, initial) {
  if (!isPlainObject(persisted)) return initial
  return {
    ...initial,
    started: persisted.started ?? initial.started,
    test_id: persisted.test_id ?? initial.test_id,
    title: persisted.title ?? initial.title,
    brief: isPlainObject(persisted.brief)
      ? {
          ...initial.brief,
          ...persisted.brief,
          // UI-only fields always come from initialState, not persisted state
          currentQuestion: initial.brief.currentQuestion,
          advancedExpanded: initial.brief.advancedExpanded,
        }
      : initial.brief,
    plan: isPlainObject(persisted.plan)
      ? {
          ...initial.plan,
          ...persisted.plan,
          // Derived/score never persisted — always start empty, recomputed via dispatch
          derived: initial.plan.derived,
          score: initial.plan.score,
          // parse_warnings is transient too — never restore
          parse_warnings: initial.plan.parse_warnings,
        }
      : initial.plan,
  }
}

// ---- public API ----------------------------------------------------------

export function loadState(initialState) {
  if (typeof localStorage === 'undefined') return initialState
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return initialState
  try {
    const parsed = JSON.parse(raw)
    return mergeRestored(parsed, initialState)
  } catch {
    return initialState
  }
}

export function saveState(state) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pickForStorage(state)))
  } catch {
    // Quota exceeded or localStorage disabled — silently no-op.
  }
}

export function clearState() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
