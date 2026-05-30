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
  test_id: null,
  title: null,
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
    parse_warnings: [],
  },
  notebook_config: {
    cells_enabled: ['load', 'srm', 'balance', 'novelty', 'main_test', 'guardrails'],
    demo_csv_choice: null,
    schema_overrides: {},
  },
  results: {
    source: null,
    raw_results: null,
    user_overrides: {},
    images: [],
    ipynb_raw_text: null,
    ipynb_filename: null,
    user_checks: {},
    user_decision: null,
    warnings: [],
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

  it('persists test_id and title (set after LOAD_TEST_PLAN_MD)', () => {
    const state = {
      ...initialState,
      test_id: 'foo-v1',
      title: 'Foo title',
    }
    saveState(state)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.test_id).toBe('foo-v1')
    expect(stored.title).toBe('Foo title')
    const restored = loadState(initialState)
    expect(restored.test_id).toBe('foo-v1')
    expect(restored.title).toBe('Foo title')
  })

  it('does NOT persist plan.parse_warnings (transient runtime field)', () => {
    const state = {
      ...initialState,
      plan: {
        ...initialState.plan,
        parse_warnings: ['warn 1', 'warn 2'],
      },
    }
    saveState(state)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.plan.parse_warnings).toBeUndefined()
    const restored = loadState(initialState)
    // parse_warnings is reset to [] on load, regardless of saved state
    expect(restored.plan.parse_warnings).toEqual([])
  })

  it('persists notebook_config cells_enabled and demo_csv_choice', () => {
    const state = {
      ...initialState,
      notebook_config: {
        cells_enabled: ['load', 'srm', 'balance', 'novelty', 'main_test', 'guardrails', 'segments'],
        demo_csv_choice: 'demo_continuous',
      },
    }
    saveState(state)
    const restored = loadState(initialState)
    expect(restored.notebook_config.cells_enabled).toContain('segments')
    expect(restored.notebook_config.demo_csv_choice).toBe('demo_continuous')
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

describe('loadState — Phase F session migration (Sprint 6 FIX iter 2)', () => {
  // Iter 1 Phase B временно ставил baseline.unit='absolute' для continuous.
  // Iter 2 канонизирует unit=null. На load чистим legacy.
  it("normalizes legacy baseline.unit='absolute' to null for continuous", () => {
    const persisted = {
      started: true,
      brief: {
        metric_type: 'continuous',
        baseline: { value: 100, unit: 'absolute' },
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    const restored = loadState(initialState)
    expect(restored.brief.metric_type).toBe('continuous')
    expect(restored.brief.baseline).toEqual({ value: 100, unit: null })
  })

  it("does not touch baseline.unit for non-continuous metric_type", () => {
    const persisted = {
      started: true,
      brief: {
        metric_type: 'proportion',
        baseline: { value: 0.1, unit: 'fraction' },
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    const restored = loadState(initialState)
    expect(restored.brief.baseline).toEqual({ value: 0.1, unit: 'fraction' })
  })

  it("preserves already-null unit for continuous", () => {
    const persisted = {
      started: true,
      brief: {
        metric_type: 'continuous',
        baseline: { value: 100, unit: null },
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    const restored = loadState(initialState)
    expect(restored.brief.baseline).toEqual({ value: 100, unit: null })
  })
})

describe('Sprint 7 — results + schema_overrides persistence', () => {
  it('persists state.results round-trip', () => {
    const state = {
      ...initialState,
      started: true,
      results: {
        ...initialState.results,
        source: 'ipynb',
        raw_results: { control_n: 5000, treatment_n: 5020, delta_rel: 2.3 },
        user_decision: 'SHIP',
        ipynb_filename: 'analysis.ipynb',
      },
    }
    saveState(state)
    const restored = loadState(initialState)
    expect(restored.results.source).toBe('ipynb')
    expect(restored.results.raw_results.delta_rel).toBe(2.3)
    expect(restored.results.user_decision).toBe('SHIP')
    expect(restored.results.ipynb_filename).toBe('analysis.ipynb')
  })

  it('persists schema_overrides round-trip', () => {
    const state = {
      ...initialState,
      notebook_config: {
        ...initialState.notebook_config,
        schema_overrides: { arpu: { rename: 'arpu_value', type: 'float' } },
      },
    }
    saveState(state)
    const restored = loadState(initialState)
    expect(restored.notebook_config.schema_overrides.arpu).toEqual({
      rename: 'arpu_value',
      type: 'float',
    })
  })

  it('legacy session without results field → default initialResults applied', () => {
    const legacy = {
      started: true,
      brief: { goal_type: 'product_change' },
      plan: { status: 'draft' },
      notebook_config: { cells_enabled: ['load'] },
      // no results, no schema_overrides
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const restored = loadState(initialState)
    expect(restored.results).toEqual(initialState.results)
    expect(restored.notebook_config.schema_overrides).toEqual({})
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
