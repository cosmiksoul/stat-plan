import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import { TOTAL_QUESTIONS } from '../../lib/brief/questions.js'
import StepFooter from '../layout/StepFooter.jsx'

export default function QuestionNav({ onFinish }) {
  const { state, dispatch } = useAppState()
  const current = state.brief.currentQuestion
  const isFirst = current === 1
  const isLast = current === TOTAL_QUESTIONS

  function goto(num) {
    dispatch({ type: Actions.GOTO_QUESTION, num })
  }

  const back = !isFirst ? (
    <button
      type="button"
      onClick={() => goto(current - 1)}
      className="mono-label text-fg-dim border border-border rounded-md px-4 py-2 hover:border-accent hover:text-accent transition-colors cursor-pointer"
    >
      ← НАЗАД
    </button>
  ) : null

  const primary = isLast ? (
    <button
      type="button"
      onClick={onFinish}
      className="mono-label font-semibold bg-accent text-bg rounded-md px-5 py-2 hover:opacity-90 transition-opacity cursor-pointer"
    >
      ЗАВЕРШИТЬ
    </button>
  ) : (
    <button
      type="button"
      onClick={() => goto(current + 1)}
      className="mono-label font-semibold bg-accent text-bg rounded-md px-5 py-2 hover:opacity-90 transition-opacity cursor-pointer"
    >
      ДАЛЬШЕ →
    </button>
  )

  return <StepFooter back={back} primary={primary} />
}
