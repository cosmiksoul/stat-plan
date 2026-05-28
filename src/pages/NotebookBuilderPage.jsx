import { useMemo } from 'react'
import Stepper from '../components/Stepper.jsx'
import ParseWarningsBanner from '../components/ParseWarningsBanner.jsx'
import PlanInfoCard from '../components/notebook/PlanInfoCard.jsx'
import CellsList from '../components/notebook/CellsList.jsx'
import DemoCsvCard from '../components/notebook/DemoCsvCard.jsx'
import ExpectedSchemaCard from '../components/notebook/ExpectedSchemaCard.jsx'
import { useAppState } from '../state/AppStateContext.jsx'
import { buildNotebook } from '../lib/plan/notebook-builder.js'

function downloadJson(filename, json) {
  const blob = new Blob([JSON.stringify(json, null, 1)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function NotebookBuilderPage() {
  const { state } = useAppState()
  // Reactively prepare the notebook plus its warnings so that the UI can
  // show what will be skipped before the user clicks download.
  const built = useMemo(
    () => buildNotebook(state),
    [
      state.brief,
      state.plan.derived,
      state.notebook_config,
      state.test_id,
      state.title,
    ],
  )

  function handleDownload() {
    downloadJson(built.filename, built.json)
  }

  return (
    <div>
      <Stepper
        currentStep={3}
        planStatus={state.plan.status}
        briefSubmitted={state.plan.briefSubmitted}
      />
      <ParseWarningsBanner />
      <PlanInfoCard state={state} />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-6">
        <CellsList />
        <DemoCsvCard />
      </div>

      <div className="mb-6">
        <ExpectedSchemaCard />
      </div>

      {built.warnings.length > 0 && (
        <div className="bg-bg-elev-2 border border-border-soft rounded-md px-4 py-3 mb-6">
          <div className="mono-label text-fg-faint mb-2">ПРИ СБОРКЕ</div>
          <ul className="m-0 p-0 list-none space-y-1">
            {built.warnings.map((w, i) => (
              <li key={i} className="text-xs text-fg-dim leading-relaxed">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleDownload}
          className="mono-label font-semibold bg-accent text-bg rounded-md px-6 py-3 hover:opacity-90 transition-opacity cursor-pointer text-base"
        >
          ↓ СКАЧАТЬ {built.filename.toUpperCase()}
        </button>
      </div>
    </div>
  )
}
