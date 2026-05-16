import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'
import { clearState } from '../lib/storage.js'
import ConfirmDialog from './plan/ConfirmDialog.jsx'

export default function Header() {
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()
  const [showRestart, setShowRestart] = useState(false)
  const tour = state.tourEnabled

  function handleRestart() {
    clearState()
    dispatch({ type: Actions.RESET_STATE })
    setShowRestart(false)
    navigate('/')
  }

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

      <div className="flex items-center gap-3">
        {state.started && (
          <button
            type="button"
            onClick={() => setShowRestart(true)}
            className="mono-label text-fg-faint border border-border-soft rounded-md px-3.5 py-1.5 hover:text-fg hover:border-border transition-colors cursor-pointer"
            title="Сбросить все ответы и начать заново"
          >
            ↺ НАЧАТЬ СНАЧАЛА
          </button>
        )}

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
      </div>

      <ConfirmDialog
        open={showRestart}
        title="Начать сначала?"
        message="Все ответы и план будут сброшены. Сохранённое состояние очистится. Это действие нельзя отменить."
        confirmLabel="НАЧАТЬ СНАЧАЛА"
        cancelLabel="ОТМЕНА"
        destructive
        onConfirm={handleRestart}
        onCancel={() => setShowRestart(false)}
      />
    </header>
  )
}
