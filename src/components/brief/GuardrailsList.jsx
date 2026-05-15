import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

const DIRECTION_OPTIONS = [
  { value: 'max', label: 'не должна расти (max)' },
  { value: 'min', label: 'не должна падать (min)' },
]

const THRESHOLD_UNIT_OPTIONS = [
  { value: 'relative_percent', label: '% rel.' },
  { value: 'absolute', label: 'абс.' },
]

function emptyGuardrail() {
  return {
    name: '',
    column: '',
    direction: 'max',
    threshold: { value: null, unit: 'relative_percent' },
  }
}

export default function GuardrailsList({ question }) {
  const { state, dispatch } = useAppState()
  const list = state.brief.guardrails
  const suggestions = question.suggestions ?? []

  function add(g) {
    dispatch({ type: Actions.ADD_GUARDRAIL, guardrail: g })
  }

  function remove(index) {
    dispatch({ type: Actions.REMOVE_GUARDRAIL, index })
  }

  function patch(index, p) {
    dispatch({ type: Actions.UPDATE_GUARDRAIL, index, patch: p })
  }

  const usedNames = new Set(list.map((g) => g.name))

  return (
    <div className="space-y-5">
      {suggestions.length > 0 && (
        <div>
          <div className="mono-label text-fg-faint mb-2">ПРЕДЛОЖЕНИЯ</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {suggestions.map((s) => {
              const already = usedNames.has(s.name)
              return (
                <button
                  key={s.name}
                  type="button"
                  disabled={already}
                  onClick={() =>
                    add({
                      name: s.name,
                      column: s.column,
                      direction: s.direction,
                      threshold: { ...s.threshold },
                    })
                  }
                  className={[
                    'text-left rounded-md border px-3.5 py-2.5 transition-colors text-sm',
                    already
                      ? 'border-border-soft bg-bg-elev opacity-50 cursor-not-allowed'
                      : 'border-border bg-bg-elev hover:border-accent hover:bg-bg-elev-2 cursor-pointer',
                  ].join(' ')}
                >
                  <span className="text-fg-dim">+ {s.label}</span>
                  {already && (
                    <span className="ml-2 mono-label text-fg-faint">УЖЕ ДОБАВЛЕНО</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="mono-label text-fg-faint">МЕТРИКИ-СТРАЖИ</div>
          {list.length === 0 && (
            <div className="text-xs text-fg-faint">Список пуст</div>
          )}
        </div>

        <div className="space-y-2.5">
          {list.map((g, i) => (
            <div
              key={i}
              className="border border-border rounded-md bg-bg-elev p-3 grid sm:grid-cols-[1.2fr_1fr_1.1fr_0.7fr_0.6fr_auto] gap-2 items-start"
            >
              <input
                type="text"
                value={g.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="название"
                className="min-w-0 bg-bg-elev-2 border border-border rounded px-2.5 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                value={g.column}
                onChange={(e) => patch(i, { column: e.target.value })}
                placeholder="column"
                className="min-w-0 bg-bg-elev-2 border border-border rounded px-2.5 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent font-mono"
              />
              <select
                value={g.direction}
                onChange={(e) => patch(i, { direction: e.target.value })}
                className="min-w-0 bg-bg-elev-2 border border-border rounded px-2.5 py-2 text-sm text-fg focus:outline-none focus:border-accent cursor-pointer"
              >
                {DIRECTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                value={g.threshold?.value ?? ''}
                onChange={(e) =>
                  patch(i, {
                    threshold: {
                      ...g.threshold,
                      value:
                        e.target.value === ''
                          ? null
                          : Number(e.target.value),
                    },
                  })
                }
                placeholder="порог"
                className="min-w-0 bg-bg-elev-2 border border-border rounded px-2.5 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
              />
              <select
                value={g.threshold?.unit ?? 'relative_percent'}
                onChange={(e) =>
                  patch(i, {
                    threshold: { ...g.threshold, unit: e.target.value },
                  })
                }
                className="min-w-0 bg-bg-elev-2 border border-border rounded px-1.5 py-2 text-sm text-fg focus:outline-none focus:border-accent cursor-pointer"
              >
                {THRESHOLD_UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Удалить guardrail"
                className="px-2.5 py-2 text-fg-faint hover:text-danger transition-colors cursor-pointer"
                title="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => add(emptyGuardrail())}
          className="mt-3 mono-label text-fg-dim border border-dashed border-border rounded-md px-3 py-2 hover:border-accent hover:text-accent transition-colors cursor-pointer"
        >
          + ДОБАВИТЬ GUARDRAIL
        </button>
      </div>
    </div>
  )
}
