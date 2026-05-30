// Sprint 7 S7 — bundle the final artifacts into a single .zip for sharing.
// jszip is imported dynamically (~30 KB) — only paid for at click time, like
// papaparse in Sprint 6.
//
// Contents:
//   - test_plan.md      — re-rendered from brief/plan via plan/render.js
//   - analysis.ipynb    — the user's uploaded notebook (raw text), if any
//   - report.html       — self-contained one-pager
//   - readout.md        — wiki markdown with YAML frontmatter
//   - experiment_results.csv (optional) — copy of the peek helper CSV

import { buildReportHtml } from './report-html.js'
import { buildReadoutMd } from './readout-md.js'

async function loadJSZip() {
  const mod = await import('jszip')
  return mod.default || mod
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

export function buildZipFileName(state) {
  const testId = state?.test_id || 'stat-plan-test'
  return `${testId}_${todayStamp()}.zip`
}

// Pure helper extracted for testability: returns the file map (filename →
// content). Easy to assert against without touching jszip.
export function buildFileMap(state, { testPlanMd, ipynbRawText, csvText } = {}) {
  const files = {}
  if (typeof testPlanMd === 'string' && testPlanMd.length > 0) {
    files['test_plan.md'] = testPlanMd
  }
  if (typeof ipynbRawText === 'string' && ipynbRawText.length > 0) {
    files['analysis.ipynb'] = ipynbRawText
  }
  files['report.html'] = buildReportHtml(state)
  files['readout.md'] = buildReadoutMd(state)
  if (typeof csvText === 'string' && csvText.length > 0) {
    files['experiment_results.csv'] = csvText
  }
  return files
}

export async function buildZip(state, opts = {}) {
  const JSZip = await loadJSZip()
  const zip = new JSZip()
  const files = buildFileMap(state, opts)
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, filename: buildZipFileName(state), files }
}
