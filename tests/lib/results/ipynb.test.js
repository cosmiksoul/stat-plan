import { describe, it, expect } from 'vitest'
import { parseIpynb, TAG_NAME } from '../../../src/lib/results/ipynb.js'

function makeNotebook(cells) {
  return JSON.stringify({
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {},
    cells,
  })
}

function streamCell(jsonText, tags = [TAG_NAME]) {
  return {
    cell_type: 'code',
    metadata: { tags },
    source: 'print(json.dumps(results))',
    execution_count: 1,
    outputs: [
      { output_type: 'stream', name: 'stdout', text: jsonText },
    ],
  }
}

function execResultCell(jsonText, tags = [TAG_NAME]) {
  return {
    cell_type: 'code',
    metadata: { tags },
    source: 'results',
    execution_count: 1,
    outputs: [
      {
        output_type: 'execute_result',
        data: { 'text/plain': jsonText },
        metadata: {},
        execution_count: 1,
      },
    ],
  }
}

function pngCell(b64) {
  return {
    cell_type: 'code',
    metadata: {},
    source: 'plt.show()',
    execution_count: 1,
    outputs: [
      {
        output_type: 'display_data',
        data: { 'image/png': b64 },
        metadata: {},
      },
    ],
  }
}

const FULL_RESULTS = {
  control_n: 5000,
  treatment_n: 5020,
  delta_rel: 2.3,
  p_value: 0.012,
  ci_lower: 0.005,
  ci_upper: 0.041,
  srm_pvalue: 0.83,
  novelty_flag: false,
  guardrails: [],
}

describe('parseIpynb — happy paths', () => {
  it('extracts tagged cell results (stream output) + images', () => {
    const text = makeNotebook([
      pngCell('AAA'),
      streamCell(JSON.stringify(FULL_RESULTS)),
      pngCell('BBB'),
    ])
    const res = parseIpynb(text)
    expect(res.ok).toBe(true)
    expect(res.error).toBeNull()
    expect(res.results).toMatchObject({ control_n: 5000, delta_rel: 2.3 })
    expect(res.images).toHaveLength(2)
    expect(res.images[0].base64_png).toBe('AAA')
    expect(res.warnings).toHaveLength(0)
  })

  it('extracts results from execute_result text/plain output', () => {
    const text = makeNotebook([execResultCell(JSON.stringify(FULL_RESULTS))])
    const res = parseIpynb(text)
    expect(res.ok).toBe(true)
    expect(res.results.control_n).toBe(5000)
  })

  it('passes through optional significant flag (FIX iter 1 — F-6)', () => {
    const text = makeNotebook([
      streamCell(JSON.stringify({ ...FULL_RESULTS, significant: true })),
    ])
    const res = parseIpynb(text)
    expect(res.ok).toBe(true)
    expect(res.results.significant).toBe(true)
    expect(res.warnings).toHaveLength(0) // significant is not a required field
  })

  it('extracts results from application/json output', () => {
    const cell = {
      cell_type: 'code',
      metadata: { tags: [TAG_NAME] },
      source: 'results',
      execution_count: 1,
      outputs: [
        {
          output_type: 'display_data',
          data: { 'application/json': FULL_RESULTS },
          metadata: {},
        },
      ],
    }
    const text = makeNotebook([cell])
    const res = parseIpynb(text)
    expect(res.ok).toBe(true)
    expect(res.results.delta_rel).toBe(2.3)
  })

  it('handles source/text as arrays (jupyter style)', () => {
    const cell = {
      cell_type: 'code',
      metadata: { tags: [TAG_NAME] },
      source: ['print(', 'json.dumps(results))'],
      outputs: [
        {
          output_type: 'stream',
          name: 'stdout',
          text: [JSON.stringify(FULL_RESULTS)],
        },
      ],
    }
    const res = parseIpynb(makeNotebook([cell]))
    expect(res.ok).toBe(true)
    expect(res.results.control_n).toBe(5000)
  })
})

describe('parseIpynb — fallback paths', () => {
  it('no tagged cell → results:null + warning + images still extracted', () => {
    const text = makeNotebook([pngCell('XYZ')])
    const res = parseIpynb(text)
    expect(res.ok).toBe(true)
    expect(res.results).toBeNull()
    expect(res.warnings.join(' ')).toMatch(TAG_NAME)
    expect(res.images).toHaveLength(1)
  })

  it('tagged cell with non-JSON output → results:null + warning', () => {
    const cell = streamCell('this is not JSON at all')
    const res = parseIpynb(makeNotebook([cell]))
    expect(res.ok).toBe(true)
    expect(res.results).toBeNull()
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  it('tagged cell with missing required fields → partial results + warning', () => {
    const partial = { control_n: 100, treatment_n: 100 }
    const res = parseIpynb(makeNotebook([streamCell(JSON.stringify(partial))]))
    expect(res.ok).toBe(true)
    expect(res.results).toEqual(partial)
    expect(res.warnings.some((w) => w.includes('delta_rel'))).toBe(true)
  })
})

describe('parseIpynb — errors', () => {
  it('invalid JSON file → ok:false', () => {
    const res = parseIpynb('not a notebook')
    expect(res.ok).toBe(false)
    expect(res.error).toBeTruthy()
  })

  it('empty file → ok:false', () => {
    const res = parseIpynb('')
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/Пустой/)
  })

  it('file over MAX_BYTES → ok:false', () => {
    const bigText = 'x'.repeat(51 * 1024 * 1024)
    const res = parseIpynb(bigText)
    expect(res.ok).toBe(false)
    expect(res.error.message).toMatch(/лимит/)
  })

  it('notebook without cells → ok:false', () => {
    const res = parseIpynb(JSON.stringify({ nbformat: 4, cells: [] }))
    expect(res.ok).toBe(false)
  })
})

describe('parseIpynb — image extraction edge cases', () => {
  it('image/jpeg is ignored — only image/png collected', () => {
    const jpegCell = {
      cell_type: 'code',
      metadata: {},
      source: '',
      outputs: [{ output_type: 'display_data', data: { 'image/jpeg': 'JJJ' } }],
    }
    const res = parseIpynb(makeNotebook([jpegCell, pngCell('PPP')]))
    expect(res.images).toHaveLength(1)
    expect(res.images[0].base64_png).toBe('PPP')
  })
})
