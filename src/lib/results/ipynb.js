// Sprint 7 S1 — parse a Jupyter `.ipynb` file (nbformat 4 JSON) and extract:
//   1. The `stat-plan-results` tagged cell's JSON output → results object.
//   2. All `image/png` outputs across all cells → base64 strings.
//
// ADR-015 contract: results cell uses metadata.tags=['stat-plan-results'] and
// its output is a JSON dict with control_n/treatment_n/delta_rel/p_value/
// ci_lower/ci_upper/srm_pvalue/novelty_flag/guardrails[].
//
// Backward-compat: ipynb without a tagged cell parses fine; results=null +
// warning, UI falls back to manual form. PNGs still extracted.

export const TAG_NAME = 'stat-plan-results'
export const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

const REQUIRED_FIELDS = [
  'control_n',
  'treatment_n',
  'delta_rel',
  'p_value',
  'ci_lower',
  'ci_upper',
]

function flatten(srcOrText) {
  if (Array.isArray(srcOrText)) return srcOrText.join('')
  if (typeof srcOrText === 'string') return srcOrText
  return ''
}

function tryParseResultsJson(output, warnings) {
  // Order of preference: application/json (already an object), then text/plain
  // (raw stdout from print(json.dumps(...)) or repr of dict).
  const data = output?.data || {}
  if (output.output_type === 'stream') {
    const text = flatten(output.text)
    try {
      return JSON.parse(text)
    } catch {
      warnings.push(
        `Не удалось разобрать stdout ячейки ${TAG_NAME} как JSON.`,
      )
      return null
    }
  }
  if (data['application/json']) {
    const v = data['application/json']
    if (v && typeof v === 'object') return v
    if (typeof v === 'string') {
      try {
        return JSON.parse(v)
      } catch {
        // fall through
      }
    }
  }
  if (data['text/plain']) {
    const text = flatten(data['text/plain'])
    try {
      return JSON.parse(text)
    } catch {
      warnings.push(
        `Не удалось разобрать вывод ячейки ${TAG_NAME} как JSON.`,
      )
      return null
    }
  }
  return null
}

function extractResultsFromCell(cell, warnings) {
  const outputs = Array.isArray(cell.outputs) ? cell.outputs : []
  for (const out of outputs) {
    const parsed = tryParseResultsJson(out, warnings)
    if (parsed && typeof parsed === 'object') return parsed
  }
  return null
}

function validateResultsShape(results, warnings) {
  if (!results || typeof results !== 'object') return null
  const missing = REQUIRED_FIELDS.filter((f) => results[f] == null)
  if (missing.length > 0) {
    warnings.push(
      `В выводе ${TAG_NAME} отсутствуют поля: ${missing.join(', ')}.`,
    )
  }
  return results
}

function extractImagesFromCells(cells) {
  const images = []
  cells.forEach((cell, idx) => {
    const outputs = Array.isArray(cell.outputs) ? cell.outputs : []
    for (const out of outputs) {
      const png = out?.data?.['image/png']
      if (typeof png === 'string' && png.length > 0) {
        images.push({ source_cell_index: idx, base64_png: png })
      }
    }
  })
  return images
}

export function parseIpynb(text) {
  const warnings = []
  if (typeof text !== 'string' || text.length === 0) {
    return {
      ok: false,
      results: null,
      images: [],
      warnings,
      error: { message: 'Пустой файл.' },
    }
  }
  if (text.length > MAX_BYTES) {
    return {
      ok: false,
      results: null,
      images: [],
      warnings,
      error: {
        message: `Файл превышает лимит ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`,
      },
    }
  }

  let notebook
  try {
    notebook = JSON.parse(text)
  } catch (err) {
    return {
      ok: false,
      results: null,
      images: [],
      warnings,
      error: { message: `Файл не является валидным JSON (${err.message}).` },
    }
  }

  if (!notebook || typeof notebook !== 'object') {
    return {
      ok: false,
      results: null,
      images: [],
      warnings,
      error: { message: 'Корневой объект .ipynb отсутствует.' },
    }
  }

  const cells = Array.isArray(notebook.cells) ? notebook.cells : []
  if (cells.length === 0) {
    return {
      ok: false,
      results: null,
      images: [],
      warnings,
      error: { message: 'В ноутбуке нет ячеек.' },
    }
  }

  const taggedCell = cells.find((c) => {
    const tags = c?.metadata?.tags
    return Array.isArray(tags) && tags.includes(TAG_NAME)
  })

  let results = null
  if (taggedCell) {
    const extracted = extractResultsFromCell(taggedCell, warnings)
    if (extracted) {
      results = validateResultsShape(extracted, warnings)
    } else if (warnings.length === 0) {
      warnings.push(
        `Ячейка с тегом ${TAG_NAME} найдена, но её вывод пуст. Заполни числа вручную.`,
      )
    }
  } else {
    warnings.push(
      `Не найдена ячейка с тегом ${TAG_NAME}. Заполни числа вручную ниже.`,
    )
  }

  const images = extractImagesFromCells(cells)

  return { ok: true, results, images, warnings, error: null }
}
