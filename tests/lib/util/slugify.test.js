import { describe, it, expect } from 'vitest'
import { slugify } from '../../../src/lib/util/slugify.js'

describe('slugify', () => {
  it('returns "test" for null / undefined / empty input', () => {
    expect(slugify(null)).toBe('test')
    expect(slugify(undefined)).toBe('test')
    expect(slugify('')).toBe('test')
  })

  it('returns "test" for whitespace-only input', () => {
    expect(slugify('   ')).toBe('test')
    expect(slugify('\t\n\r')).toBe('test')
  })

  it('lowercases plain ASCII', () => {
    expect(slugify('FooBar')).toBe('foobar')
    expect(slugify('CR_to_click')).toBe('cr_to_click')
  })

  it('replaces internal whitespace with single hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
    expect(slugify('a   b   c')).toBe('a-b-c')
    expect(slugify('  trim me  ')).toBe('trim-me')
  })

  it('keeps Cyrillic characters including ё (NB-BUG-3)', () => {
    expect(slugify('продлёнка')).toBe('продлёнка')
    expect(slugify('Продлёнка Подписки')).toBe('продлёнка-подписки')
    expect(slugify('размер ё')).toBe('размер-ё')
  })

  it('handles mixed ASCII + Cyrillic + digits + underscore', () => {
    expect(slugify('CR_to_клик_2')).toBe('cr_to_клик_2')
  })

  it('strips punctuation and other non-alphanumeric characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
    expect(slugify('CR%/click?')).toBe('crclick')
    expect(slugify('a@b.c+d')).toBe('abcd')
  })

  it('falls back to "test" when stripping leaves nothing', () => {
    expect(slugify('!!!')).toBe('test')
    expect(slugify('@@@ ###')).toBe('test')
  })

  it('truncates at 40 characters', () => {
    const long = 'a'.repeat(50)
    expect(slugify(long)).toHaveLength(40)
    expect(slugify(long)).toBe('a'.repeat(40))
  })

  it('preserves leading digits', () => {
    expect(slugify('2024_metric')).toBe('2024_metric')
  })
})
