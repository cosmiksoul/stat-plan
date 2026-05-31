import { useState } from 'react'
import { useNavigate, NavLink, Link } from 'react-router-dom'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'
import { clearState } from '../lib/storage.js'
import ConfirmDialog from './plan/ConfirmDialog.jsx'

const NAV_LINK = 'mono-label text-fg-faint hover:text-fg border border-border-soft rounded-md px-3 py-1.5 transition-colors'

export default function Header() {
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()
  const [showRestart, setShowRestart] = useState(false)

  function handleRestart() {
    clearState()
    dispatch({ type: Actions.RESET_STATE })
    setShowRestart(false)
    navigate('/')
  }

  return (
    <header className="w-full max-w-[1240px] mx-auto px-6 md:px-8 pt-7 pb-6 flex items-baseline justify-between border-b border-border-soft mb-6">
      <Link
        to="/"
        className="flex items-baseline gap-3 hover:opacity-80 transition-opacity"
      >
        <span className="font-serif text-[26px] font-semibold tracking-tight">
          stat<span className="text-accent">·</span>plan
        </span>
        <span className="mono-label text-fg-faint hidden sm:inline">
          A/B planner
        </span>
      </Link>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <nav className="flex items-center gap-1.5">
          <NavLink to="/docs" className={NAV_LINK}>
            📖 Документация
          </NavLink>
          <a
            href="https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8"
            target="_blank"
            rel="noopener noreferrer"
            title="AI-компаньон по A/B методологии (внешний NotebookLM)"
            className="mono-label text-tour border border-tour rounded-md px-3 py-1.5 hover:bg-tour-soft transition-colors"
          >
            ↗ AI-компаньон
          </a>
        </nav>

        {state.started && (
          <button
            type="button"
            onClick={() => setShowRestart(true)}
            className="mono-label text-warn border border-warn rounded-md px-3.5 py-1.5 hover:bg-warn-soft transition-colors cursor-pointer"
            title="Сбросить все ответы и начать заново"
          >
            ↺ НАЧАТЬ СНАЧАЛА
          </button>
        )}
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
