import { useMemo, useState } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { buildReportHtml } from '../../lib/results/report-html.js'
import { buildReadoutMd } from '../../lib/results/readout-md.js'
import { renderTestPlanMd } from '../../lib/plan/render.js'

function download(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function ExportButtons() {
  const { state } = useAppState()
  const [zipBusy, setZipBusy] = useState(false)
  const [zipError, setZipError] = useState(null)

  const testPlanMd = useMemo(() => renderTestPlanMd(state), [state])
  const testId = state.test_id || 'stat-plan-test'

  function handleHtml() {
    download(`${testId}_report.html`, buildReportHtml(state), 'text/html')
  }

  function handleMd() {
    download(`${testId}_readout.md`, buildReadoutMd(state), 'text/markdown')
  }

  async function handleZip() {
    setZipBusy(true)
    setZipError(null)
    try {
      const mod = await import('../../lib/results/zip.js')
      const { blob, filename } = await mod.buildZip(state, {
        testPlanMd,
        ipynbRawText: state.results.ipynb_raw_text,
      })
      downloadBlob(filename, blob)
    } catch (err) {
      setZipError(err?.message || 'Не удалось собрать архив.')
    } finally {
      setZipBusy(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleHtml}
          className="text-sm bg-bg-elev border border-border rounded px-3 py-2 text-fg hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          ↓ Скачать report.html
        </button>
        <button
          type="button"
          onClick={handleMd}
          className="text-sm bg-bg-elev border border-border rounded px-3 py-2 text-fg hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          ↓ Скачать readout.md
        </button>
        <button
          type="button"
          onClick={handleZip}
          disabled={zipBusy}
          className="text-sm bg-accent border border-accent rounded px-3 py-2 text-bg font-medium hover:opacity-90 cursor-pointer transition-opacity disabled:opacity-50"
        >
          {zipBusy ? '…' : '↓ Скачать всё (.zip)'}
        </button>
      </div>
      {zipError && (
        <div
          role="alert"
          className="mt-2 text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2"
        >
          {zipError}
        </div>
      )}
    </div>
  )
}
