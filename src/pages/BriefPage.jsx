import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Stepper from '../components/Stepper.jsx'
import ProgressBar from '../components/brief/ProgressBar.jsx'
import QuestionRenderer from '../components/brief/QuestionRenderer.jsx'
import QuestionNav from '../components/brief/QuestionNav.jsx'
import QuestionMap from '../components/brief/QuestionMap.jsx'
import AdvancedParams from '../components/brief/AdvancedParams.jsx'
import DataPeekBlock from '../components/brief/DataPeekBlock.jsx'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'
import { getQuestion } from '../lib/brief/questions.js'
import { calculateSampleSize } from '../lib/plan/sample-size.js'
import {
  validateBaseline,
  validateMde,
  validateDailyTraffic,
  validateGuardrails,
  validateHypothesisText,
} from '../lib/brief/validators.js'

function activeValidation(brief, questionId) {
  switch (questionId) {
    case 'hypothesis':
      return validateHypothesisText(brief.hypothesis.text)
    case 'baseline':
      return validateBaseline(brief.baseline, brief.metric_type)
    case 'mde':
      return validateMde(brief.mde, brief.baseline)
    case 'daily_traffic':
      return validateDailyTraffic(brief.daily_traffic, brief.randomization_unit)
    case 'guardrails':
      return validateGuardrails(brief.guardrails)
    default:
      return { ok: true, message: null }
  }
}

function SampleSizeDisplay({ brief }) {
  // Memoize per the inputs that affect the calculation. If any of these
  // changes, recompute reactively.
  const result = useMemo(
    () => calculateSampleSize(brief),
    [
      brief.metric_type,
      brief.baseline?.value,
      brief.baseline?.unit,
      brief.mde?.value,
      brief.mde?.unit,
      brief.daily_traffic?.value,
      brief.randomization_unit,
      brief.advanced?.alpha,
      brief.advanced?.power,
      brief.advanced?.two_sided,
      brief.advanced?.test_method,
      brief.data_peek,
    ],
  )

  const { sample_size_per_arm, duration_days, test_method, warnings } = result

  if (sample_size_per_arm == null) {
    return (
      <div className="mt-4 text-xs text-fg-faint bg-bg-elev-2 border border-border-soft rounded-md px-3 py-2">
        Sample size будет рассчитан, как только заполнены baseline (Q05), MDE
        (Q07) и трафик (Q08).
        {warnings.length > 0 && (
          <ul className="mt-2 m-0 pl-4 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-warn">
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 bg-bg-elev-2 border border-border rounded-md px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="mono-label text-fg-faint mr-2">SAMPLE / ARM</span>
          <span className="font-serif text-xl font-medium text-accent">
            ~{sample_size_per_arm.toLocaleString('ru-RU')}
          </span>
        </div>
        <div>
          <span className="mono-label text-fg-faint mr-2">ДЛИТЕЛЬНОСТЬ</span>
          <span className="text-fg">
            {duration_days != null ? `~${duration_days} дн.` : '—'}
          </span>
        </div>
        <div>
          <span className="mono-label text-fg-faint mr-2">МЕТОД</span>
          <span className="text-fg font-mono text-xs">{test_method}</span>
        </div>
      </div>
      {warnings.length > 0 && (
        <ul className="mt-3 m-0 pl-0 list-none space-y-1">
          {warnings.map((w, i) => (
            <li
              key={i}
              className="text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-2.5 py-1.5"
            >
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function BriefPage() {
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()
  const { brief } = state
  const question = getQuestion(brief.currentQuestion)
  const validation = activeValidation(brief, question.id)
  const isApproved = state.plan.status === 'approved'

  function handleFinish() {
    dispatch({ type: Actions.MARK_BRIEF_SUBMITTED })
    dispatch({ type: Actions.RECOMPUTE_PLAN })
    navigate('/step2')
  }

  return (
    <div>
      <Stepper
        currentStep={1}
        planStatus={state.plan.status}
        briefSubmitted={state.plan.briefSubmitted}
      />

      {isApproved && (
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap text-sm bg-accent-soft border border-accent rounded-md px-4 py-3 text-accent">
          <span>
            <span className="mono-label font-semibold mr-2">
              ПЛАН УТВЕРЖДЁН
            </span>
            Бриф в режиме только-чтения. Чтобы внести правки — верни план в
            черновик.
          </span>
          <button
            type="button"
            onClick={() => navigate('/step2')}
            className="mono-label text-accent underline-offset-2 hover:underline cursor-pointer"
          >
            ↗ К ТЕСТ-ПЛАНУ
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6 min-w-0">
          <section className="bg-bg-elev border border-border rounded-lg p-6">
            <ProgressBar brief={brief} />
          </section>

          <section className="bg-bg-elev border border-border rounded-lg p-6">
            <div className="mb-5">
              <div className="mono-label text-fg-faint mb-2">
                ВОПРОС {String(question.num).padStart(2, '0')} / 10
              </div>
              <h2 className="font-serif text-2xl font-medium tracking-tight leading-tight m-0 mb-2 text-fg">
                {question.title}
              </h2>
              {question.hint && (
                <p className="text-sm text-fg-dim m-0 leading-relaxed">
                  {question.hint}
                </p>
              )}
            </div>

            <fieldset disabled={isApproved} className="border-0 p-0 m-0 min-w-0">
              <QuestionRenderer question={question} />
            </fieldset>

            {!validation.ok && (
              <div
                role="alert"
                className="mt-4 text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2"
              >
                {validation.message}
              </div>
            )}

            {question.id === 'daily_traffic' && (
              <>
                <SampleSizeDisplay brief={brief} />
                <DataPeekBlock />
              </>
            )}

            <div className="mt-6">
              <AdvancedParams disabled={isApproved} />
            </div>
          </section>
        </div>

        <QuestionMap />
      </div>

      <QuestionNav onFinish={handleFinish} />
    </div>
  )
}
