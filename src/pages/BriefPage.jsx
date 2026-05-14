import { useState } from 'react'
import Stepper from '../components/Stepper.jsx'
import ProgressBar from '../components/brief/ProgressBar.jsx'
import QuestionRenderer from '../components/brief/QuestionRenderer.jsx'
import QuestionNav from '../components/brief/QuestionNav.jsx'
import QuestionMap from '../components/brief/QuestionMap.jsx'
import AdvancedParams from '../components/brief/AdvancedParams.jsx'
import { useAppState } from '../state/AppStateContext.jsx'
import { getQuestion } from '../lib/brief/questions.js'
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

export default function BriefPage() {
  const { state } = useAppState()
  const { brief } = state
  const question = getQuestion(brief.currentQuestion)
  const [finished, setFinished] = useState(false)
  const validation = activeValidation(brief, question.id)

  return (
    <div>
      <Stepper currentStep={1} />

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

            <QuestionRenderer question={question} />

            {!validation.ok && (
              <div
                role="alert"
                className="mt-4 text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2"
              >
                {validation.message}
              </div>
            )}

            {question.id === 'daily_traffic' && (
              <div className="mt-4 text-xs text-fg-faint bg-bg-elev-2 border border-border-soft rounded-md px-3 py-2">
                Sample size и длительность будут рассчитаны на шаге{' '}
                <span className="text-fg-dim">«Тест-план»</span> (Sprint 3).
              </div>
            )}

            <div className="mt-6">
              <QuestionNav onFinish={() => setFinished(true)} />
            </div>

            {finished && question.num === 10 && (
              <div className="mt-5 text-sm bg-tour-soft border border-tour rounded-md px-4 py-3 text-tour">
                Бриф заполнен. Шаг «Тест-план» будет разблокирован в следующем
                спринте.
              </div>
            )}
          </section>

          <AdvancedParams />
        </div>

        <QuestionMap />
      </div>
    </div>
  )
}
