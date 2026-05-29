import { useState } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import { QUESTIONS } from '../../lib/brief/questions.js'
import {
  isQuestionAnswered,
  shortAnswerPreview,
} from '../../lib/brief/progress.js'

const SHORT_LABELS = {
  goal_type: 'Цель теста',
  hypothesis: 'Гипотеза',
  metric_type: 'Тип метрики',
  metric_name: 'Имя метрики',
  baseline: 'Baseline',
  randomization_unit: 'Единица рандомизации',
  mde: 'MDE',
  daily_traffic: 'Доступный трафик',
  guardrails: 'Guardrails',
  stop_and_decisions: 'Stop & Decision rules',
}

export default function QuestionMap() {
  const { state, dispatch } = useAppState()
  const { brief } = state
  const [expanded, setExpanded] = useState(() => new Set())

  function toggle(num) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  function goto(num) {
    dispatch({ type: Actions.GOTO_QUESTION, num })
  }

  return (
    <aside className="bg-bg-elev border border-border rounded-lg p-5 self-start">
      <div className="mono-label text-fg-faint mb-3">КАРТА ВОПРОСОВ</div>
      <ol className="m-0 p-0 list-none space-y-1">
        {QUESTIONS.map((q) => {
          const isCurrent = brief.currentQuestion === q.num
          const isAnswered = isQuestionAnswered(brief, q.num)
          const preview = shortAnswerPreview(brief, q.num)
          const isExpanded = expanded.has(q.num)
          const statusIcon = isCurrent ? '→' : isAnswered ? '✓' : '·'
          const statusClass = isCurrent
            ? 'text-accent'
            : isAnswered
              ? 'text-ok'
              : 'text-fg-faint'

          return (
            <li key={q.num}>
              <div className="flex items-baseline gap-2 group">
                <button
                  type="button"
                  onClick={() => goto(q.num)}
                  className={[
                    'flex-1 text-left flex items-baseline gap-2 py-1.5 px-1.5 rounded transition-colors cursor-pointer',
                    isCurrent ? 'bg-bg-elev-2' : 'hover:bg-bg-elev-2',
                  ].join(' ')}
                >
                  <span className={`font-mono text-xs w-4 text-center ${statusClass}`}>
                    {statusIcon}
                  </span>
                  <span className="font-mono text-xs text-fg-faint">
                    {String(q.num).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-sm ${isCurrent ? 'text-fg' : 'text-fg-dim'}`}
                  >
                    {SHORT_LABELS[q.id]}
                  </span>
                </button>
                {preview && (
                  <button
                    type="button"
                    onClick={() => toggle(q.num)}
                    aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                    aria-expanded={isExpanded}
                    className="text-xs text-fg-faint hover:text-accent transition-colors cursor-pointer w-5 text-center"
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                )}
              </div>
              {isExpanded && preview && (
                <div className="pl-9 pr-2 pb-2 text-xs text-fg-faint font-mono break-words">
                  {preview}
                </div>
              )}
            </li>
          )
        })}

        <DataPeekRow
          brief={brief}
          expanded={expanded.has('peek')}
          onToggle={() => toggle('peek')}
        />
      </ol>
    </aside>
  )
}

function dataPeekPreview(dp) {
  if (!dp?.uploaded) return null
  const parts = [`источник: ${dp.source === 'manual' ? 'manual' : 'csv'}`]
  if (dp.baseline_computed != null) {
    parts.push(`baseline: ${Number(dp.baseline_computed).toLocaleString('ru-RU', { maximumFractionDigits: 6 })}`)
  }
  if (dp.baseline_match_user_input != null) {
    parts.push(`match: ${dp.baseline_match_user_input ? '✓' : '⚠'}`)
  }
  if (dp.std_computed != null) {
    parts.push(`σ=${Number(dp.std_computed).toLocaleString('ru-RU', { maximumFractionDigits: 4 })}`)
  }
  if (dp.ratio_variance != null) {
    parts.push(`Var(N/D)=${Number(dp.ratio_variance).toLocaleString('ru-RU', { maximumFractionDigits: 6 })}`)
  }
  return parts.join(', ')
}

function DataPeekRow({ brief, expanded, onToggle }) {
  const dp = brief.data_peek
  const isApplied = !!dp?.uploaded
  const preview = dataPeekPreview(dp)
  const statusIcon = isApplied ? '✓' : '·'
  const statusClass = isApplied ? 'text-ok' : 'text-fg-faint'

  return (
    <li className="pt-3 mt-3 border-t border-border-soft">
      <div className="flex items-baseline gap-2">
        <div className="flex-1 flex items-baseline gap-2 py-1.5 px-1.5">
          <span className={`font-mono text-xs w-4 text-center ${statusClass}`}>
            {statusIcon}
          </span>
          <span className="font-mono text-xs text-fg-faint">DP</span>
          <span className={`text-sm flex-1 ${isApplied ? 'text-fg' : 'text-fg-dim'}`}>
            Data peek (опционально)
          </span>
        </div>
        {preview && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? 'Свернуть' : 'Развернуть'}
            aria-expanded={expanded}
            className="text-xs text-fg-faint hover:text-accent transition-colors cursor-pointer w-5 text-center"
          >
            {expanded ? '▾' : '▸'}
          </button>
        )}
      </div>
      {expanded && preview && (
        <div className="pl-9 pr-2 pb-2 text-xs text-fg-faint font-mono break-words">
          {preview}
        </div>
      )}
    </li>
  )
}
