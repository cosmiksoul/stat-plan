import { describe, it, expect } from 'vitest'
import { deriveDirection } from '../../../src/lib/plan/direction.js'

describe('deriveDirection', () => {
  it('returns "increase" for "вырастет"', () => {
    expect(deriveDirection('Если показать блок, то CR вырастет на 8%')).toBe(
      'increase',
    )
  })

  it('returns "increase" for "повысится"', () => {
    expect(deriveDirection('Если X, то Y повысится на 5%')).toBe('increase')
  })

  it('returns "increase" for "увеличится"', () => {
    expect(deriveDirection('Если X, то Y увеличится на 5%')).toBe('increase')
  })

  it('returns "decrease" for "упадёт"', () => {
    expect(deriveDirection('Если убрать X, то Y упадёт на 12%')).toBe(
      'decrease',
    )
  })

  it('returns "decrease" for "снизится"', () => {
    expect(deriveDirection('Если X, то Y снизится на 5%')).toBe('decrease')
  })

  it('returns "decrease" for "уменьшится"', () => {
    expect(deriveDirection('Если X, то Y уменьшится на 5%')).toBe('decrease')
  })

  it('returns "any" for "изменится"', () => {
    expect(deriveDirection('Если X, то Y изменится')).toBe('any')
  })

  it('returns "any" when no direction verb is present', () => {
    expect(deriveDirection('Если показать блок, то CR будет другим')).toBe(
      'any',
    )
  })

  it('returns "any" for empty input', () => {
    expect(deriveDirection('')).toBe('any')
    expect(deriveDirection('   ')).toBe('any')
    expect(deriveDirection(null)).toBe('any')
    expect(deriveDirection(undefined)).toBe('any')
  })

  it('is case-insensitive', () => {
    expect(deriveDirection('ЕСЛИ X, ТО Y ВЫРАСТЕТ на 8%')).toBe('increase')
    expect(deriveDirection('Если X, то Y УПАДЁТ на 8%')).toBe('decrease')
  })

  it('does not match verb fragments inside other words', () => {
    // "вырастешь" is not in our verb list but is a similar word — must not
    // match as "вырастет". Use a word-boundary-tolerant test.
    expect(deriveDirection('Если показать вырастешь')).toBe('any')
  })

  it('uses the first verb when multiple are present', () => {
    expect(deriveDirection('Y вырастет, а потом упадёт')).toBe('increase')
    expect(deriveDirection('Y упадёт, а потом вырастет')).toBe('decrease')
  })
})
