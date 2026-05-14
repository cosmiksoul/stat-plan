import { describe, it, expect } from 'vitest'
import {
  parseHypothesis,
  extractMetricName,
} from '../../../src/lib/brief/hypothesis-parser.js'

describe('parseHypothesis', () => {
  it('detects all four slots in a complete hypothesis', () => {
    const slots = parseHypothesis(
      'Если показать новый блок, то CR вырастет на 8%, потому что больше офферов',
    )
    expect(slots).toEqual({
      change: true,
      metric: true,
      direction_magnitude: true,
      mechanism: true,
    })
  })

  it('detects only change when there is just "если X"', () => {
    const slots = parseHypothesis('Если изменить цвет кнопки')
    expect(slots.change).toBe(true)
    expect(slots.metric).toBe(false)
    expect(slots.direction_magnitude).toBe(false)
    expect(slots.mechanism).toBe(false)
  })

  it('detects change + metric when there is "если X, то Y" but no direction', () => {
    const slots = parseHypothesis('Если показать блок, то CR будет другим')
    expect(slots.change).toBe(true)
    expect(slots.metric).toBe(true)
    expect(slots.direction_magnitude).toBe(false)
    expect(slots.mechanism).toBe(false)
  })

  it('does NOT detect direction_magnitude when verb is present but number is missing', () => {
    const slots = parseHypothesis('Если показать блок, то CR вырастет')
    expect(slots.direction_magnitude).toBe(false)
  })

  it('detects direction_magnitude when there is a verb AND a percentage', () => {
    const slots = parseHypothesis('Если показать блок, то CR вырастет на 8%')
    expect(slots.direction_magnitude).toBe(true)
  })

  it('detects only mechanism when there is just "потому что Z"', () => {
    const slots = parseHypothesis('Потому что больше офферов выше fold')
    expect(slots.mechanism).toBe(true)
    expect(slots.change).toBe(false)
    expect(slots.metric).toBe(false)
    expect(slots.direction_magnitude).toBe(false)
  })

  it('returns all false on empty input', () => {
    expect(parseHypothesis('')).toEqual({
      change: false,
      metric: false,
      direction_magnitude: false,
      mechanism: false,
    })
    expect(parseHypothesis('   ')).toEqual({
      change: false,
      metric: false,
      direction_magnitude: false,
      mechanism: false,
    })
  })

  it('detects "упадёт" verb just like "вырастет"', () => {
    const slots = parseHypothesis(
      'Если убрать рекомендации, то выручка упадёт на 12%, потому что юзеры не видят товары',
    )
    expect(slots).toEqual({
      change: true,
      metric: true,
      direction_magnitude: true,
      mechanism: true,
    })
  })

  it('detects "снизится" / "повысится" verbs', () => {
    expect(
      parseHypothesis('Если X, то Y повысится на 5%').direction_magnitude,
    ).toBe(true)
    expect(
      parseHypothesis('Если X, то Y снизится на 5%').direction_magnitude,
    ).toBe(true)
  })

  it('detects direction_magnitude with non-percent unit (e.g. ₽)', () => {
    const slots = parseHypothesis(
      'Если показать апсейл, то ARPU вырастет на 50 ₽',
    )
    expect(slots.direction_magnitude).toBe(true)
  })

  it('is case-insensitive and tolerant to extra whitespace', () => {
    const slots = parseHypothesis(
      '  ЕСЛИ  показать блок,   ТО  CR  ВЫРАСТЕТ на 8%,  ПОТОМУ ЧТО  юзеры видят больше офферов  ',
    )
    expect(slots).toEqual({
      change: true,
      metric: true,
      direction_magnitude: true,
      mechanism: true,
    })
  })

  it('requires non-empty metric text between "то" and verb', () => {
    // "то вырастет" — no metric name between "то" and the verb
    const slots = parseHypothesis('Если показать блок, то вырастет на 8%')
    expect(slots.metric).toBe(false)
  })
})

describe('extractMetricName', () => {
  it('returns metric text between "то" and the direction verb', () => {
    expect(
      extractMetricName('Если показать блок, то CR вырастет на 8%'),
    ).toBe('CR')
  })

  it('handles multi-word metric names', () => {
    expect(
      extractMetricName(
        'Если показать апсейл, то средний чек вырастет на 50 ₽',
      ),
    ).toBe('средний чек')
  })

  it('returns null when metric slot is missing', () => {
    expect(extractMetricName('Если изменить цвет')).toBeNull()
    expect(extractMetricName('')).toBeNull()
    expect(extractMetricName('Потому что юзеры видят больше офферов')).toBeNull()
  })

  it('returns null when "то" is followed straight by the verb', () => {
    expect(
      extractMetricName('Если показать блок, то вырастет на 8%'),
    ).toBeNull()
  })
})
