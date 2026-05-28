import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'

export default function ParseWarningsBanner() {
  const { state, dispatch } = useAppState()
  const warnings = state.plan?.parse_warnings ?? []
  if (warnings.length === 0) return null

  return (
    <div
      role="status"
      className="mb-4 bg-warn-soft border border-warn-border rounded-md px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="mono-label font-semibold text-warn">
          ⚠ ЗАМЕЧАНИЯ ПРИ ЗАГРУЗКЕ ({warnings.length})
        </span>
        <button
          type="button"
          onClick={() => dispatch({ type: Actions.DISMISS_PARSE_WARNINGS })}
          className="mono-label text-fg-faint hover:text-fg cursor-pointer"
        >
          СКРЫТЬ
        </button>
      </div>
      <ul className="m-0 pl-4 space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="text-xs text-warn leading-relaxed">
            {w}
          </li>
        ))}
      </ul>
    </div>
  )
}
