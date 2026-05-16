import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadState,
  saveState,
  clearState,
  STORAGE_KEY,
} from '../../src/lib/storage.js'

const initialState = {
  started: false,
  currentStep: 1,
  tourEnabled: false,
  brief: {
    currentQuestion: 1,
    goal_type: null,
    metric_name: '',
    advancedExpanded: false,
    advanced: { alpha: 0.05, power: 0.8 },
    hypothesis: { text: '', slots: {} },
    mde: { value: null, unit: 'relative_percent', direction: 'increase' },
  },
  plan: {
    status: 'draft',
    approvedAt: null,
    derived: {},
    score: {},
    editedExternally: false,
    briefSubmitted: false,
  },
}

beforeEach(() => {
  localStorage.clear()
})

describe('STORAGE_KEY', () => {
  it('is versioned with v1 prefix', () => {
    expect(STORAGE_KEY).toBe('stat-plan:v1:state')
  })
})

describe('loadState', () => {
  it('returns initialState when localStorage is empty', () => {
    expect(loadState(initialState)).toEqual(initialState)
  })

  it('restores persisted fields and merges with initialState defaults', () => {
    const persisted = {
      started: true,
      brief: {
        goal_type: 'product_change',
        metric_name: 'cr',
        advanced: { alpha: 0.01, power: 0.9 },
        hypothesis: { text: 'foo', slots: { change: true } },
        mde: { value: 8, unit: 'relative_percent', direction: 'increase' },
      },
      plan: {
        status: 'approved',
        approvedAt: '2026-05-16T10:00:00Z',
        editedExternally: false,
        briefSubmitted: true,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    const restored = loadState(initialState)
    expect(restored.started).toBe(true)
    expect(restored.brief.goal_type).toBe('product_change')
    expect(restored.brief.metric_name).toBe('cr')
    expect(restored.plan.status).toBe('approved')
    expect(restored.plan.briefSubmitted).toBe(true)
    // UI-only field falls back to initial value
    expect(restored.brief.currentQuestion).toBe(1)
    expect(restored.brief.advancedExpanded).toBe(false)
    // derived/score not persisted → empty
    expect(restored.plan.derived).toEqual({})
    expect(restored.plan.score).toEqual({})
    // tour is not persisted
    expect(restored.tourEnabled).toBe(false)
  })

  it('returns initialState when stored JSON is broken', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState(initialState)).toEqual(initialState)
  })

  it('returns initialState when stored value is not an object', () => {
    localStorage.setItem(STORAGE_KEY, '"string"')
    expect(loadState(initialState)).toEqual(initialState)
  })
})

describe('saveState', () => {
  it('persists started/brief/plan fields', () => {
    const state = {
      ...initialState,
      started: true,
      brief: { ...initialState.brief, goal_type: 'marketing' },
    }
    saveState(state)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.started).toBe(true)
    expect(stored.brief.goal_type).toBe('marketing')
  })

  it('does NOT persist currentQuestion, advancedExpanded, tourEnabled', () => {
    const state = {
      ...initialState,
      tourEnabled: true,
      brief: {
        ...initialState.brief,
        currentQuestion: 7,
        advancedExpanded: true,
      },
    }
    saveState(state)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.tourEnabled).toBeUndefined()
    expect(stored.brief.currentQuestion).toBeUndefined()
    expect(stored.brief.advancedExpanded).toBeUndefined()
  })

  it('does NOT persist plan.derived or plan.score (recomputed on load)', () => {
    const state = {
      ...initialState,
      plan: {
        ...initialState.plan,
        derived: { sample_size_per_arm: 80000 },
        score: { total: 90 },
      },
    }
    saveState(state)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.plan.derived).toBeUndefined()
    expect(stored.plan.score).toBeUndefined()
    // but status and others persist
    expect(stored.plan.status).toBe('draft')
  })

  it('round-trips through saveState → loadState preserving non-UI fields', () => {
    const state = {
      ...initialState,
      started: true,
      brief: {
        ...initialState.brief,
        metric_name: 'cr_to_partner_click',
        baseline: { value: 0.031, unit: 'fraction' },
        currentQuestion: 5, // UI field, will reset
      },
      plan: {
        ...initialState.plan,
        status: 'approved',
        approvedAt: '2026-05-16T10:00:00Z',
        briefSubmitted: true,
        derived: { sample_size_per_arm: 80000 }, // not persisted
      },
    }
    saveState(state)
    const restored = loadState(initialState)
    expect(restored.started).toBe(true)
    expect(restored.brief.metric_name).toBe('cr_to_partner_click')
    expect(restored.brief.baseline).toEqual({ value: 0.031, unit: 'fraction' })
    expect(restored.plan.status).toBe('approved')
    expect(restored.plan.briefSubmitted).toBe(true)
    // currentQuestion comes from initialState, not persisted state
    expect(restored.brief.currentQuestion).toBe(1)
    // derived not persisted → empty from initialState
    expect(restored.plan.derived).toEqual({})
  })

  it('does not throw when localStorage is unavailable (quota/disabled)', () => {
    // Mock localStorage.setItem to throw
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(() => saveState(initialState)).not.toThrow()
    Storage.prototype.setItem = original
  })
})

describe('clearState', () => {
  it('removes the stored state', () => {
    localStorage.setItem(STORAGE_KEY, '{"started":true}')
    clearState()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('is a no-op when state was not saved', () => {
    expect(() => clearState()).not.toThrow()
  })
})
