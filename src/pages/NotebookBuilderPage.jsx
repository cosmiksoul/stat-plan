import Stepper from '../components/Stepper.jsx'
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
      <div className="bg-bg-elev border border-border rounded-lg p-10 text-center">
        <div className="mono-label text-fg-faint mb-3">ШАГ 03</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight m-0 text-fg mb-3">
          Конструктор ноутбука
        </h1>
        <p className="text-sm text-fg-dim max-w-xl mx-auto m-0">
          Этот шаг будет реализован в Sprint 4. План уже утверждён —
          конструктор ноутбука соберёт скелет анализа на его основе.
        </p>
      </div>
    </div>
  )
}
