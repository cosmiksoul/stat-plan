import Stepper from '../components/Stepper.jsx'
import ParseWarningsBanner from '../components/ParseWarningsBanner.jsx'
import { useAppState } from '../state/AppStateContext.jsx'

export default function NotebookBuilderPage() {
  const { state } = useAppState()
  return (
    <div>
      <Stepper
        currentStep={3}
        planStatus={state.plan.status}
        briefSubmitted={state.plan.briefSubmitted}
      />
      <ParseWarningsBanner />
      <div className="bg-bg-elev border border-border rounded-lg p-10 text-center">
        <div className="mono-label text-fg-faint mb-3">ШАГ 03</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight m-0 text-fg mb-3">
          Конструктор ноутбука
        </h1>
        <p className="text-sm text-fg-dim max-w-xl mx-auto m-0">
          Полная реализация шага 3 — Phase B этого спринта.
        </p>
      </div>
    </div>
  )
}
