import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reducer, initialState, Actions } from '../../src/state/reducer.js'

describe('initialState — plan shape', () => {
  it('has plan with all expected fields including parse_warnings', () => {
    expect(initialState.plan).toEqual({
      status: 'draft',
      approvedAt: null,
      derived: {},
      score: {},
      editedExternally: false,
      briefSubmitted: false,
      parse_warnings: [],
    })
  })

  it('has root-level test_id and title (null until LOAD_TEST_PLAN_MD)', () => {
    expect(initialState.test_id).toBeNull()
    expect(initialState.title).toBeNull()
  })
})

describe('UPDATE_HYPOTHESIS — direction autoderive', () => {
  it('sets mde.direction=increase for "вырастет"', () => {
    const next = reducer(initialState, {
      type: Actions.UPDATE_HYPOTHESIS,
      text: 'Если X, то CR вырастет на 8%',
    })
    expect(next.brief.mde.direction).toBe('increase')
  })

  it('sets mde.direction=decrease for "упадёт"', () => {
    const next = reducer(initialState, {
      type: Actions.UPDATE_HYPOTHESIS,
      text: 'Если X, то Y упадёт на 5%',
    })
    expect(next.brief.mde.direction).toBe('decrease')
  })

  it('sets mde.direction=any when no direction verb', () => {
    const next = reducer(initialState, {
      type: Actions.UPDATE_HYPOTHESIS,
      text: 'Если X, то Y изменится',
    })
    expect(next.brief.mde.direction).toBe('any')
  })

  it('preserves other mde fields when updating direction', () => {
    const state = {
      ...initialState,
      brief: {
        ...initialState.brief,
        mde: { value: 8, unit: 'relative_percent', direction: 'any' },
      },
    }
    const next = reducer(state, {
      type: Actions.UPDATE_HYPOTHESIS,
      text: 'Если X, то Y вырастет на 8%',
    })
    expect(next.brief.mde.value).toBe(8)
    expect(next.brief.mde.unit).toBe('relative_percent')
    expect(next.brief.mde.direction).toBe('increase')
  })
})

describe('MARK_BRIEF_SUBMITTED', () => {
  it('sets plan.briefSubmitted=true', () => {
    const next = reducer(initialState, { type: Actions.MARK_BRIEF_SUBMITTED })
    expect(next.plan.briefSubmitted).toBe(true)
  })

  it('does not change other plan fields', () => {
    const next = reducer(initialState, { type: Actions.MARK_BRIEF_SUBMITTED })
    expect(next.plan.status).toBe('draft')
    expect(next.plan.approvedAt).toBeNull()
  })
})

describe('RECOMPUTE_PLAN', () => {
  it('populates derived and score from current brief', () => {
    const state = {
      ...initialState,
      started: true,
      brief: {
        ...initialState.brief,
        metric_type: 'proportion',
        baseline: { value: 0.031, unit: 'fraction' },
        mde: { value: 8, unit: 'relative_percent', direction: 'increase' },
        daily_traffic: { value: 50000, unit: 'user' },
      },
    }
    const next = reducer(state, { type: Actions.RECOMPUTE_PLAN })
    expect(next.plan.derived.sample_size_per_arm).toBeGreaterThan(0)
    expect(next.plan.derived.test_method).toBe('z_test_proportions')
    expect(next.plan.score.total).toBeGreaterThan(0)
    expect(next.plan.score.breakdown).toBeDefined()
  })

  it('keeps status and other plan fields unchanged', () => {
    const state = {
      ...initialState,
      plan: { ...initialState.plan, status: 'approved', briefSubmitted: true },
    }
    const next = reducer(state, { type: Actions.RECOMPUTE_PLAN })
    expect(next.plan.status).toBe('approved')
    expect(next.plan.briefSubmitted).toBe(true)
  })
})

describe('APPROVE_PLAN', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-16T12:00:00Z'))
  })

  it('sets status=approved and approvedAt to current ISO time', () => {
    const next = reducer(initialState, { type: Actions.APPROVE_PLAN })
    expect(next.plan.status).toBe('approved')
    expect(next.plan.approvedAt).toBe('2026-05-16T12:00:00.000Z')
  })
})

describe('RETURN_PLAN_TO_DRAFT', () => {
  it('sets status=draft and clears approvedAt', () => {
    const state = {
      ...initialState,
      plan: {
        ...initialState.plan,
        status: 'approved',
        approvedAt: '2026-05-16T10:00:00Z',
      },
    }
    const next = reducer(state, { type: Actions.RETURN_PLAN_TO_DRAFT })
    expect(next.plan.status).toBe('draft')
    expect(next.plan.approvedAt).toBeNull()
  })

  it('clears editedExternally — plan is no longer externally-sourced', () => {
    const state = {
      ...initialState,
      plan: {
        ...initialState.plan,
        status: 'approved',
        editedExternally: true,
      },
    }
    const next = reducer(state, { type: Actions.RETURN_PLAN_TO_DRAFT })
    expect(next.plan.editedExternally).toBe(false)
  })
})

describe('LOAD_TEST_PLAN_MD', () => {
  const payload = {
    test_id: 'foo-v1',
    title: 'Foo title',
    warnings: ['minor: alpha defaulted'],
    brief: {
      metric_type: 'proportion',
      metric_name: 'cr_to_click',
      baseline: { value: 0.031, unit: 'fraction' },
      randomization_unit: 'user',
      mde: { value: 8, unit: 'relative_percent', direction: 'increase' },
      daily_traffic: { value: 50000, unit: 'user' },
      guardrails: [],
      hypothesis: { text: 'CR вырастет на 8%', slots: {} },
      advanced: {
        alpha: 0.05,
        power: 0.8,
        two_sided: true,
        variance_reduction: null,
        stratification_by: null,
        holdback_percent: null,
      },
    },
    plan: {
      status: 'draft',
      approvedAt: null,
      editedExternally: true,
      briefSubmitted: true,
    },
  }

  it('replaces brief and merges plan from payload, sets started=true', () => {
    const next = reducer(initialState, {
      type: Actions.LOAD_TEST_PLAN_MD,
      payload,
    })
    expect(next.started).toBe(true)
    expect(next.test_id).toBe('foo-v1')
    expect(next.title).toBe('Foo title')
    expect(next.brief.metric_name).toBe('cr_to_click')
    expect(next.plan.status).toBe('draft')
    expect(next.plan.editedExternally).toBe(true)
    expect(next.plan.briefSubmitted).toBe(true)
    expect(next.plan.parse_warnings).toEqual(['minor: alpha defaulted'])
  })

  it('triggers RECOMPUTE_PLAN — derived and score are populated', () => {
    const next = reducer(initialState, {
      type: Actions.LOAD_TEST_PLAN_MD,
      payload,
    })
    expect(next.plan.derived.test_method).toBe('z_test_proportions')
    expect(next.plan.derived.sample_size_per_arm).toBeGreaterThan(0)
    expect(next.plan.score.total).toBeGreaterThan(0)
  })

  it('lands brief at Q01 — currentQuestion is forced to 1', () => {
    const state = {
      ...initialState,
      brief: { ...initialState.brief, currentQuestion: 7 },
    }
    const next = reducer(state, {
      type: Actions.LOAD_TEST_PLAN_MD,
      payload,
    })
    expect(next.brief.currentQuestion).toBe(1)
  })

  it('returns state unchanged when payload is missing brief or plan', () => {
    const next = reducer(initialState, {
      type: Actions.LOAD_TEST_PLAN_MD,
      payload: { brief: null, plan: null },
    })
    expect(next).toBe(initialState)
  })
})

describe('DISMISS_PARSE_WARNINGS', () => {
  it('clears plan.parse_warnings', () => {
    const state = {
      ...initialState,
      plan: { ...initialState.plan, parse_warnings: ['w1', 'w2'] },
    }
    const next = reducer(state, { type: Actions.DISMISS_PARSE_WARNINGS })
    expect(next.plan.parse_warnings).toEqual([])
  })
})

describe('notebook_config — initial shape', () => {
  it('has the 6 mandatory cells enabled by default', () => {
    expect(initialState.notebook_config.cells_enabled).toEqual([
      'load',
      'srm',
      'balance',
      'novelty',
      'main_test',
      'guardrails',
    ])
    expect(initialState.notebook_config.demo_csv_choice).toBeNull()
  })
})

describe('TOGGLE_NOTEBOOK_CELL', () => {
  it('adds an optional cell to cells_enabled', () => {
    const next = reducer(initialState, {
      type: Actions.TOGGLE_NOTEBOOK_CELL,
      id: 'segments',
    })
    expect(next.notebook_config.cells_enabled).toContain('segments')
  })

  it('removes an optional cell on second toggle', () => {
    const once = reducer(initialState, {
      type: Actions.TOGGLE_NOTEBOOK_CELL,
      id: 'bootstrap_ci',
    })
    const twice = reducer(once, {
      type: Actions.TOGGLE_NOTEBOOK_CELL,
      id: 'bootstrap_ci',
    })
    expect(twice.notebook_config.cells_enabled).not.toContain('bootstrap_ci')
  })

  it('ignores attempts to toggle off a mandatory cell', () => {
    const next = reducer(initialState, {
      type: Actions.TOGGLE_NOTEBOOK_CELL,
      id: 'load',
    })
    expect(next.notebook_config.cells_enabled).toContain('load')
  })
})

describe('RESET_NOTEBOOK_CONFIG', () => {
  it('restores cells_enabled to the mandatory defaults', () => {
    const state = {
      ...initialState,
      notebook_config: {
        cells_enabled: ['load', 'segments'],
        demo_csv_choice: 'demo_continuous',
      },
    }
    const next = reducer(state, { type: Actions.RESET_NOTEBOOK_CONFIG })
    expect(next.notebook_config.cells_enabled).toEqual([
      'load',
      'srm',
      'balance',
      'novelty',
      'main_test',
      'guardrails',
    ])
    expect(next.notebook_config.demo_csv_choice).toBeNull()
  })
})

describe('RETURN_PLAN_TO_DRAFT — notebook_config side effect', () => {
  it('resets notebook_config to defaults (ADR-006)', () => {
    const state = {
      ...initialState,
      plan: { ...initialState.plan, status: 'approved' },
      notebook_config: {
        cells_enabled: ['load', 'segments', 'bootstrap_ci'],
        demo_csv_choice: 'demo_proportion',
      },
    }
    const next = reducer(state, { type: Actions.RETURN_PLAN_TO_DRAFT })
    expect(next.notebook_config.cells_enabled).toEqual(
      initialState.notebook_config.cells_enabled,
    )
    expect(next.notebook_config.demo_csv_choice).toBeNull()
  })
})

describe('SET_DEMO_CSV_CHOICE', () => {
  it('writes the choice into notebook_config', () => {
    const next = reducer(initialState, {
      type: Actions.SET_DEMO_CSV_CHOICE,
      choice: 'demo_continuous',
    })
    expect(next.notebook_config.demo_csv_choice).toBe('demo_continuous')
  })
})

describe('RESET_STATE — covers notebook_config too', () => {
  it('returns notebook_config to initial defaults', () => {
    const state = {
      ...initialState,
      notebook_config: {
        cells_enabled: ['load'],
        demo_csv_choice: 'demo_proportion',
      },
    }
    const next = reducer(state, { type: Actions.RESET_STATE })
    expect(next.notebook_config).toEqual(initialState.notebook_config)
  })
})

describe('RESET_STATE', () => {
  it('returns to initialState regardless of current state', () => {
    const state = {
      ...initialState,
      started: true,
      brief: { ...initialState.brief, metric_name: 'foo' },
      plan: { ...initialState.plan, status: 'approved' },
    }
    const next = reducer(state, { type: Actions.RESET_STATE })
    expect(next).toEqual(initialState)
  })
})

describe('initialBrief — Phase C shape additions', () => {
  it('has goal_description as empty string', () => {
    expect(initialState.brief.goal_description).toBe('')
  })

  it('has defaultsApplied with goal_type and randomization_unit flags', () => {
    expect(initialState.brief.defaultsApplied).toMatchObject({
      metric_name: false,
      decision_rules: false,
      goal_type: false,
      randomization_unit: false,
    })
  })
})

describe('ANSWER_QUESTION — goal_type side effect', () => {
  it('clears goal_description when goal_type changes away from "other"', () => {
    const state = {
      ...initialState,
      brief: {
        ...initialState.brief,
        goal_type: 'other',
        goal_description: 'тестируем баннер',
      },
    }
    const next = reducer(state, {
      type: Actions.ANSWER_QUESTION,
      field: 'goal_type',
      value: 'product_change',
    })
    expect(next.brief.goal_type).toBe('product_change')
    expect(next.brief.goal_description).toBe('')
  })

  it('preserves goal_description when goal_type=other is reapplied', () => {
    const state = {
      ...initialState,
      brief: {
        ...initialState.brief,
        goal_type: 'other',
        goal_description: 'тестируем баннер',
      },
    }
    const next = reducer(state, {
      type: Actions.ANSWER_QUESTION,
      field: 'goal_type',
      value: 'other',
    })
    expect(next.brief.goal_description).toBe('тестируем баннер')
  })
})

describe('GOTO_QUESTION — preselect defaults via applyEnterDefaults', () => {
  it('writes goal_type=product_change + flag on first visit to Q01', () => {
    const next = reducer(initialState, {
      type: Actions.GOTO_QUESTION,
      num: 1,
    })
    expect(next.brief.goal_type).toBe('product_change')
    expect(next.brief.defaultsApplied.goal_type).toBe(true)
  })

  it('does not overwrite goal_type on re-entry to Q01', () => {
    const once = reducer(initialState, {
      type: Actions.GOTO_QUESTION,
      num: 1,
    })
    const userTouched = reducer(once, {
      type: Actions.ANSWER_QUESTION,
      field: 'goal_type',
      value: 'algorithm',
    })
    const twice = reducer(userTouched, {
      type: Actions.GOTO_QUESTION,
      num: 1,
    })
    expect(twice.brief.goal_type).toBe('algorithm')
  })

  it('writes randomization_unit=user + flag on first visit to Q06', () => {
    const next = reducer(initialState, {
      type: Actions.GOTO_QUESTION,
      num: 6,
    })
    expect(next.brief.randomization_unit).toBe('user')
    expect(next.brief.defaultsApplied.randomization_unit).toBe(true)
  })
})
