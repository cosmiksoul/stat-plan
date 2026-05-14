import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'

export default function Header() {
  const { state, dispatch } = useAppState()
  const tour = state.tourEnabled

  return (
    <header className="w-full max-w-[1240px] mx-auto px-6 md:px-8 pt-7 pb-6 flex items-baseline justify-between border-b border-border-soft mb-6">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-[26px] font-semibold tracking-tight">
          stat<span className="text-accent">·</span>plan
        </span>
        <span className="mono-label text-fg-faint hidden sm:inline">
          A/B planner
        </span>
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: Actions.TOGGLE_TOUR })}
        className={`mono-label font-semibold border rounded-md px-3.5 py-1.5 inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
          tour
            ? 'bg-tour text-bg border-tour'
            : 'bg-tour-soft text-tour border-tour hover:bg-tour-hover'
        }`}
        aria-pressed={tour}
      >
        {tour ? '✕ Закрыть тур' : '? Включить тур'}
      </button>
    </header>
  )
}
