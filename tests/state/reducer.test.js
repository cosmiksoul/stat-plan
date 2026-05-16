import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reducer, initialState, Actions } from '../../src/state/reducer.js'

describe('initialState — plan shape', () => {
  it('has plan with all expected fields including editedExternally', () => {
    expect(initialState.plan).toEqual({
      status: 'draft',
      approvedAt: null,
      derived: {},
      score: {},
      editedExternally: false,
      briefSubmitted: false,
    })
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
