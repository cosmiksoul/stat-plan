// localStorage adapter for state persistence. No React.
// Versioned key — bump v1 → v2 when persisted shape changes structurally.
//
// What we persist:
//   - state.started
//   - state.test_id, state.title (set after LOAD_TEST_PLAN_MD)
//   - state.brief (all fields except currentQuestion + advancedExpanded — UI state)
//   - state.plan (status / approvedAt / editedExternally / briefSubmitted)
//   - state.notebook_config (cells_enabled + demo_csv_choice + schema_overrides)
//   - state.results (Sprint 7 — Step 4 form + uploaded ipynb + images)
//
// What we don't persist:
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
    notebook_config: state.notebook_config,
    results: state.results,
  }
}

// ---- merge on load -------------------------------------------------------

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

// Sprint 6 FIX iter 2 Phase F: iter 1 Phase B временно ставил
// baseline.unit='absolute' для continuous (dropdown с одной опцией). Iter 2
// убирает dropdown совсем и канонизирует unit=null для continuous. На load
// чистим legacy.
function migrateBaseline(brief) {
  if (
    brief?.metric_type === 'continuous' &&
    brief?.baseline?.unit === 'absolute'
  ) {
    return { ...brief, baseline: { ...brief.baseline, unit: null } }
  }
  return brief
}

function mergeRestored(persisted, initial) {
  if (!isPlainObject(persisted)) return initial
  return {
    ...initial,
    started: persisted.started ?? initial.started,
    test_id: persisted.test_id ?? initial.test_id,
    title: persisted.title ?? initial.title,
    brief: isPlainObject(persisted.brief)
      ? migrateBaseline({
          ...initial.brief,
          ...persisted.brief,
          // UI-only fields always come from initialState, not persisted state
          currentQuestion: initial.brief.currentQuestion,
          advancedExpanded: initial.brief.advancedExpanded,
        })
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
    notebook_config: isPlainObject(persisted.notebook_config)
      ? {
          ...initial.notebook_config,
          ...persisted.notebook_config,
          cells_enabled: Array.isArray(persisted.notebook_config.cells_enabled)
            ? persisted.notebook_config.cells_enabled
            : initial.notebook_config.cells_enabled,
          // Sprint 7 S11: schema_overrides absent in pre-Sprint-7 sessions →
          // default to {} from initial.
          schema_overrides: isPlainObject(persisted.notebook_config.schema_overrides)
            ? persisted.notebook_config.schema_overrides
            : initial.notebook_config.schema_overrides,
        }
      : initial.notebook_config,
    // Sprint 7: state.results — absent in pre-Sprint-7 sessions → default
    // to initial empty shape. We merge shallowly to tolerate partial restores.
    results: isPlainObject(persisted.results)
      ? { ...initial.results, ...persisted.results }
      : initial.results,
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
