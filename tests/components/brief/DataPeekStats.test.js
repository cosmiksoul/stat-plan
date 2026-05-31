import { describe, it, expect } from 'vitest'
import { fmtNum } from '../../../src/components/brief/DataPeekStats.jsx'

// Sprint 8 P-8 — adaptive precision (2 dp for |n|>=1, 4 dp below).
describe('DataPeekStats fmtNum', () => {
  it('uses 2 decimals for |n| >= 1', () => {
    expect(fmtNum(100.431813)).toBe('100.43')
    expect(fmtNum(-3.5)).toBe('-3.50')
  })

  it('uses 4 decimals for |n| < 1', () => {
    expect(fmtNum(0.0312)).toBe('0.0312')
    expect(fmtNum(0.5)).toBe('0.5000')
  })

  it('formats 0 as 0.00', () => {
    expect(fmtNum(0)).toBe('0.00')
  })

  it('returns — for null / undefined / Infinity', () => {
    expect(fmtNum(null)).toBe('—')
    expect(fmtNum(undefined)).toBe('—')
    expect(fmtNum(Infinity)).toBe('—')
  })

  it('honors explicit digits override', () => {
    expect(fmtNum(0.123456, 6)).toBe('0.123456')
    expect(fmtNum(1.5, 3)).toBe('1.500')
  })
})
