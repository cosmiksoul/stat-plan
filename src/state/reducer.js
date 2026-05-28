import { parseHypothesis } from '../lib/brief/hypothesis-parser.js'
import { applyEnterDefaults } from '../lib/brief/defaults.js'
import { getQuestion } from '../lib/brief/questions.js'
import { deriveDirection } from '../lib/plan/direction.js'
import { calculateSampleSize } from '../lib/plan/sample-size.js'
import { scorePlan } from '../lib/plan/scoring.js'

const initialBrief = {
  currentQuestion: 1,
  goal_type: null,
  hypothesis: {
    text: '',
    slots: {
      change: false,
      metric: false,
      direction_magnitude: false,
      mechanism: false,
    },
  },
  metric_type: null,
  ratio_components: { numerator: null, denominator: null },
  metric_name: '',
  metric_column: '',
  baseline: { value: null, unit: null },
  randomization_unit: null,
  cluster_field: null,
  mde: { value: null, unit: 'relative_percent', direction: 'increase' },
  daily_traffic: { value: null, unit: 'user' },
  guardrails: [],
  stop_conditions: {
    srm_detected: true,
    guardrail_breach_24h: true,
    length_cap_days: null,
    manual_stop: false,
  },
  decision_rules: { ship: '', iterate: '', kill: '' },
  advanced: {
    alpha: 0.05,
    power: 0.8,
    two_sided: true,
    variance_reduction: null,
    stratification_by: null,
    holdback_percent: null,
  },
  advancedExpanded: false,
  defaultsApplied: {
    metric_name: false,
    decision_rules: false,
  },
}

// Default cells that should be enabled when the user lands on step 3.
// Mandatory cells (load/srm/balance/novelty/main_test/guardrails) live in
// cells_enabled. Optional ones (segments, bootstrap_ci) start disabled and
// can be toggled by the user; cuped and delta_method are reserved as
// disabled placeholders in the UI (next mini-sprint).
const MANDATORY_NOTEBOOK_CELLS = [
  'load',
  'srm',
  'balance',
  'novelty',
  'main_test',
  'guardrails',
]

const initialNotebookConfig = {
  cells_enabled: [...MANDATORY_NOTEBOOK_CELLS],
  // demo_csv_choice tracks which demo file the user picked; null means
  // "default per metric_type" — the UI derives the actual file from brief.
  demo_csv_choice: null,
}

const initialPlan = {
  status: 'draft',
  approvedAt: null,
  derived: {},
  score: {},
  // True after LOAD_TEST_PLAN_MD; reset by RETURN_PLAN_TO_DRAFT or RESET_STATE.
  // Informational marker — "this plan came from a file, not generated in-place".
  editedExternally: false,
  briefSubmitted: false,
  // Set by LOAD_TEST_PLAN_MD with any warnings from the parser; cleared by
  // DISMISS_PARSE_WARNINGS. Runtime-only, not persisted.
  parse_warnings: [],
}

export const initialState = {
  started: false,
  currentStep: 1,
  tourEnabled: false,
  // Set on successful LOAD_TEST_PLAN_MD; otherwise derived on the fly from
  // brief.metric_name (see render.js / notebook-builder).
  test_id: null,
  title: null,
  brief: initialBrief,
  plan: initialPlan,
  notebook_config: initialNotebookConfig,
}

export { MANDATORY_NOTEBOOK_CELLS }

export const Actions = {
  START_BRIEF: 'START_BRIEF',
  TOGGLE_TOUR: 'TOGGLE_TOUR',
  ANSWER_QUESTION: 'ANSWER_QUESTION',
  UPDATE_HYPOTHESIS: 'UPDATE_HYPOTHESIS',
  GOTO_QUESTION: 'GOTO_QUESTION',
  TOGGLE_ADVANCED: 'TOGGLE_ADVANCED',
  SET_ADVANCED: 'SET_ADVANCED',
  ADD_GUARDRAIL: 'ADD_GUARDRAIL',
  REMOVE_GUARDRAIL: 'REMOVE_GUARDRAIL',
  UPDATE_GUARDRAIL: 'UPDATE_GUARDRAIL',
  MARK_BRIEF_SUBMITTED: 'MARK_BRIEF_SUBMITTED',
  APPROVE_PLAN: 'APPROVE_PLAN',
  RETURN_PLAN_TO_DRAFT: 'RETURN_PLAN_TO_DRAFT',
  RECOMPUTE_PLAN: 'RECOMPUTE_PLAN',
  RESET_STATE: 'RESET_STATE',
  LOAD_TEST_PLAN_MD: 'LOAD_TEST_PLAN_MD',
  DISMISS_PARSE_WARNINGS: 'DISMISS_PARSE_WARNINGS',
  TOGGLE_NOTEBOOK_CELL: 'TOGGLE_NOTEBOOK_CELL',
  RESET_NOTEBOOK_CONFIG: 'RESET_NOTEBOOK_CONFIG',
  SET_DEMO_CSV_CHOICE: 'SET_DEMO_CSV_CHOICE',
}

function setBrief(state, patch) {
  return { ...state, brief: { ...state.brief, ...patch } }
}

function setPlan(state, patch) {
  return { ...state, plan: { ...state.plan, ...patch } }
}

function answerQuestion(state, field, value) {
  let patch = { [field]: value }

  // Side effects: clear sub-questions when their parent changes away.
  if (field === 'metric_type' && value !== 'ratio') {
    patch.ratio_components = { numerator: null, denominator: null }
  }
  if (field === 'randomization_unit' && value !== 'cluster') {
    patch.cluster_field = null
  }

  return setBrief(state, patch)
}

function recomputePlan(state) {
  const derived = calculateSampleSize(state.brief)
  const score = scorePlan(state.brief, derived)
  return setPlan(state, { derived, score })
}

export function reducer(state, action) {
  switch (action.type) {
    case Actions.START_BRIEF:
      return { ...state, started: true, currentStep: 1 }

    case Actions.TOGGLE_TOUR:
      return { ...state, tourEnabled: !state.tourEnabled }

    case Actions.ANSWER_QUESTION:
      return answerQuestion(state, action.field, action.value)

    case Actions.UPDATE_HYPOTHESIS: {
      const text = action.text ?? ''
      const direction = deriveDirection(text)
      return setBrief(state, {
        hypothesis: { text, slots: parseHypothesis(text) },
        mde: { ...state.brief.mde, direction },
      })
    }

    case Actions.GOTO_QUESTION: {
      const num = action.num
      if (typeof num !== 'number' || num < 1 || num > 10) return state
      const target = getQuestion(num)
      const briefWithDefaults = target
        ? applyEnterDefaults(state.brief, target.id)
        : state.brief
      return {
        ...state,
        brief: { ...briefWithDefaults, currentQuestion: num },
      }
    }

    case Actions.TOGGLE_ADVANCED:
      return setBrief(state, { advancedExpanded: !state.brief.advancedExpanded })

    case Actions.SET_ADVANCED:
      return setBrief(state, {
        advanced: { ...state.brief.advanced, [action.field]: action.value },
      })

    case Actions.ADD_GUARDRAIL:
      return setBrief(state, {
        guardrails: [...state.brief.guardrails, action.guardrail],
      })

    case Actions.REMOVE_GUARDRAIL:
      return setBrief(state, {
        guardrails: state.brief.guardrails.filter((_, i) => i !== action.index),
      })

    case Actions.UPDATE_GUARDRAIL: {
      const next = state.brief.guardrails.map((g, i) =>
        i === action.index ? { ...g, ...action.patch } : g,
      )
      return setBrief(state, { guardrails: next })
    }

    case Actions.MARK_BRIEF_SUBMITTED:
      return setPlan(state, { briefSubmitted: true })

    case Actions.APPROVE_PLAN:
      return setPlan(state, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      })

    case Actions.RETURN_PLAN_TO_DRAFT:
      return {
        ...state,
        plan: {
          ...state.plan,
          status: 'draft',
          approvedAt: null,
          editedExternally: false,
        },
        // ADR-006: returning to draft resets the current notebook
        // configuration so it doesn't drift from the new plan shape.
        notebook_config: initialNotebookConfig,
      }

    case Actions.RECOMPUTE_PLAN:
      return recomputePlan(state)

    case Actions.RESET_STATE:
      return initialState

    case Actions.LOAD_TEST_PLAN_MD: {
      const payload = action.payload || {}
      const incomingBrief = payload.brief
      const incomingPlan = payload.plan
      if (!incomingBrief || !incomingPlan) return state
      const mergedBrief = {
        ...initialBrief,
        ...incomingBrief,
        // UI-only fields always come from initial: the user is landing on
        // step 3, not Q01 of the brief.
        currentQuestion: 1,
        advancedExpanded: false,
      }
      const mergedPlan = {
        ...state.plan,
        ...incomingPlan,
        parse_warnings: Array.isArray(payload.warnings)
          ? payload.warnings
          : [],
      }
      const next = {
        ...state,
        started: true,
        test_id: payload.test_id || null,
        title: payload.title || null,
        brief: mergedBrief,
        plan: mergedPlan,
      }
      // Recompute derived/score from the freshly loaded brief.
      return recomputePlan(next)
    }

    case Actions.DISMISS_PARSE_WARNINGS:
      return setPlan(state, { parse_warnings: [] })

    case Actions.TOGGLE_NOTEBOOK_CELL: {
      const id = action.id
      if (typeof id !== 'string') return state
      // Mandatory cells cannot be toggled off.
      if (MANDATORY_NOTEBOOK_CELLS.includes(id)) return state
      const current = state.notebook_config.cells_enabled
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
      return {
        ...state,
        notebook_config: { ...state.notebook_config, cells_enabled: next },
      }
    }

    case Actions.RESET_NOTEBOOK_CONFIG:
      return { ...state, notebook_config: initialNotebookConfig }

    case Actions.SET_DEMO_CSV_CHOICE:
      return {
        ...state,
        notebook_config: {
          ...state.notebook_config,
          demo_csv_choice: action.choice || null,
        },
      }

    default:
      return state
  }
}
