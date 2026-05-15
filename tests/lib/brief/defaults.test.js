import { describe, it, expect } from 'vitest'
import { applyEnterDefaults } from '../../../src/lib/brief/defaults.js'

function makeBrief(overrides = {}) {
  return {
    hypothesis: { text: '' },
    metric_name: '',
    metric_column: '',
    mde: { value: null, unit: 'relative_percent' },
    decision_rules: { ship: '', iterate: '', kill: '' },
    defaultsApplied: { metric_name: false, decision_rules: false },
    ...overrides,
  }
}

describe('applyEnterDefaults — metric_name (Q04)', () => {
  it('prefills metric_name from hypothesis when empty and extractable', () => {
    const brief = makeBrief({
      hypothesis: {
        text: 'Если показать баннер, то CR вырастет на 8%, потому что внимание',
      },
    })
    const result = applyEnterDefaults(brief, 'metric_name')
    expect(result.metric_name).toBe('CR')
    expect(result.defaultsApplied.metric_name).toBe(true)
  })

  it('leaves metric_name empty when hypothesis has no extractable metric', () => {
    const brief = makeBrief({
      hypothesis: { text: 'просто текст без структуры' },
    })
    const result = applyEnterDefaults(brief, 'metric_name')
    expect(result.metric_name).toBe('')
    expect(result.defaultsApplied.metric_name).toBe(false)
    expect(result).toBe(brief)
  })

  it('does not overwrite when user has already typed a name', () => {
    const brief = makeBrief({
      hypothesis: { text: 'Если ..., то CR вырастет на 8%' },
      metric_name: 'my custom metric',
    })
    const result = applyEnterDefaults(brief, 'metric_name')
    expect(result.metric_name).toBe('my custom metric')
    expect(result).toBe(brief)
  })

  it('does not re-apply once defaultsApplied.metric_name is true (touched state)', () => {
    const brief = makeBrief({
      hypothesis: { text: 'Если ..., то CR вырастет на 8%' },
      metric_name: '',
      defaultsApplied: { metric_name: true, decision_rules: false },
    })
    const result = applyEnterDefaults(brief, 'metric_name')
    expect(result.metric_name).toBe('')
    expect(result).toBe(brief)
  })
})

describe('applyEnterDefaults — decision_rules (Q10)', () => {
  it('prefills ship/iterate/kill with MDE/2 when all three empty', () => {
    const brief = makeBrief({ mde: { value: 8, unit: 'relative_percent' } })
    const result = applyEnterDefaults(brief, 'stop_and_decisions')
    expect(result.decision_rules.ship).toContain('4% rel.')
    expect(result.decision_rules.kill).toContain('4% rel.')
    expect(result.decision_rules.iterate.length).toBeGreaterThan(0)
    expect(result.defaultsApplied.decision_rules).toBe(true)
  })

  it('does not overwrite when at least one of ship/iterate/kill is set', () => {
    const brief = makeBrief({
      mde: { value: 8, unit: 'relative_percent' },
      decision_rules: { ship: 'мой ship', iterate: '', kill: '' },
    })
    const result = applyEnterDefaults(brief, 'stop_and_decisions')
    expect(result.decision_rules.ship).toBe('мой ship')
    expect(result).toBe(brief)
  })

  it('does not re-apply once defaultsApplied.decision_rules is true', () => {
    const brief = makeBrief({
      mde: { value: 8, unit: 'relative_percent' },
      decision_rules: { ship: '', iterate: '', kill: '' },
      defaultsApplied: { metric_name: false, decision_rules: true },
    })
    const result = applyEnterDefaults(brief, 'stop_and_decisions')
    expect(result.decision_rules.ship).toBe('')
    expect(result).toBe(brief)
  })
})

describe('applyEnterDefaults — other ids', () => {
  it('returns brief unchanged for question ids that have no defaults', () => {
    const brief = makeBrief()
    expect(applyEnterDefaults(brief, 'goal_type')).toBe(brief)
    expect(applyEnterDefaults(brief, 'baseline')).toBe(brief)
    expect(applyEnterDefaults(brief, 'mde')).toBe(brief)
  })
})
