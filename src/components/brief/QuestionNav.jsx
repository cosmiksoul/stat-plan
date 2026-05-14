import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import { TOTAL_QUESTIONS } from '../../lib/brief/questions.js'

export default function QuestionNav({ onFinish }) {
  const { state, dispatch } = useAppState()
  const current = state.brief.currentQuestion
  const isFirst = current === 1
  const isLast = current === TOTAL_QUESTIONS

  function goto(num) {
    dispatch({ type: Actions.GOTO_QUESTION, num })
  }

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {!isFirst ? (
        <button
          type="button"
          onClick={() => goto(current - 1)}
          className="mono-label text-fg-dim border border-border rounded-md px-4 py-2 hover:border-accent hover:text-accent transition-colors cursor-pointer"
        >
          ← НАЗАД
        </button>
      ) : (
        <span />
      )}

      {isLast ? (
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
      )}
    </div>
  )
}
