import { parseHypothesis } from '../lib/brief/hypothesis-parser.js'

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
}

export const initialState = {
  started: false,
  currentStep: 1,
  tourEnabled: false,
  brief: initialBrief,
}

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
}

function setBrief(state, patch) {
  return { ...state, brief: { ...state.brief, ...patch } }
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
      return setBrief(state, {
        hypothesis: { text, slots: parseHypothesis(text) },
      })
    }

    case Actions.GOTO_QUESTION: {
      const num = action.num
      if (typeof num !== 'number' || num < 1 || num > 10) return state
      return setBrief(state, { currentQuestion: num })
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

    default:
      return state
  }
}
