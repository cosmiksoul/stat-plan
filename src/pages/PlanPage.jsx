import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Stepper from '../components/Stepper.jsx'
import MdPreview from '../components/plan/MdPreview.jsx'
import ScoringCard from '../components/plan/ScoringCard.jsx'
import PlanActions from '../components/plan/PlanActions.jsx'
import StatusBadge from '../components/plan/StatusBadge.jsx'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'
import { renderTestPlanMd } from '../lib/plan/render.js'

function downloadMd(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function PlanPage() {
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()

  const md = useMemo(() => renderTestPlanMd(state), [state])
  const score = state.plan.score
  const status = state.plan.status

  function handleApprove() {
    dispatch({ type: Actions.APPROVE_PLAN })
  }

  function handleReturnToDraft() {
    dispatch({ type: Actions.RETURN_PLAN_TO_DRAFT })
  }

  function handleDownload() {
    downloadMd('test_plan.md', md)
  }

  return (
    <div>
      <Stepper
        currentStep={2}
        planStatus={status}
        briefSubmitted={state.plan.briefSubmitted}
      />

      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight m-0 text-fg">
            Тест-план
          </h1>
          <p className="text-sm text-fg-dim m-0 mt-1">
            Сгенерирован из брифа. Проверь, скачай, утверди — это разблокирует
            следующий шаг.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === 'approved' && (
        <div className="mb-6 text-sm text-accent bg-accent-soft border border-accent rounded-md px-4 py-3">
          План утверждён. Бриф переключён в режим «только-чтение». Чтобы внести
          правки — верни план в черновик.
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-6">
        <MdPreview content={md} />
        <ScoringCard score={score} />
      </div>

      <section className="bg-bg-elev border border-border rounded-lg p-5">
        <PlanActions
          status={status}
          onDownload={handleDownload}
          onApprove={handleApprove}
          onReturnToDraft={handleReturnToDraft}
        />
      </section>

      <div className="mt-4 text-xs text-fg-faint">
        <button
          type="button"
          onClick={() => navigate('/step1')}
          className="underline-offset-2 hover:underline cursor-pointer"
        >
          ← Вернуться к брифу
        </button>
      </div>
    </div>
  )
}
