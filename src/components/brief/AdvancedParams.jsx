import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

const VARIANCE_OPTIONS = [
  { value: '', label: 'нет' },
  { value: 'cuped', label: 'CUPED' },
]

export default function AdvancedParams() {
  const { state, dispatch } = useAppState()
  const adv = state.brief.advanced
  const expanded = state.brief.advancedExpanded

  function set(field, value) {
    dispatch({ type: Actions.SET_ADVANCED, field, value })
  }

  const summary = `α=${adv.alpha} · power=${adv.power} · ${adv.two_sided ? 'two-sided' : 'one-sided'}${
    adv.variance_reduction ? ` · ${adv.variance_reduction}` : ''
  }${adv.stratification_by ? ` · strat: ${adv.stratification_by}` : ''}${
    adv.holdback_percent != null ? ` · holdback ${adv.holdback_percent}%` : ''
  }`

  return (
    <section className="border border-border rounded-lg bg-bg-elev">
      <button
        type="button"
        onClick={() => dispatch({ type: Actions.TOGGLE_ADVANCED })}
        aria-expanded={expanded}
        className="w-full flex items-baseline justify-between px-4 py-3 text-left cursor-pointer hover:bg-bg-elev-2 transition-colors rounded-lg"
      >
        <span className="mono-label text-fg-dim flex items-center gap-2">
          <span className="text-accent">{expanded ? '▼' : '▶'}</span>
          ПРОДВИНУТЫЕ ПАРАМЕТРЫ
        </span>
        {!expanded && (
          <span className="text-xs text-fg-faint font-mono">{summary}</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border-soft px-4 py-4 grid sm:grid-cols-2 gap-4">
          <NumField
            label="α (уровень значимости)"
            value={adv.alpha}
            onChange={(v) => set('alpha', v)}
            step="0.01"
          />
          <NumField
            label="POWER (мощность)"
            value={adv.power}
            onChange={(v) => set('power', v)}
            step="0.01"
          />
          <label className="flex items-center gap-2.5 text-sm text-fg-dim cursor-pointer select-none">
            <input
              type="checkbox"
              checked={adv.two_sided}
              onChange={(e) => set('two_sided', e.target.checked)}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
            <span>двусторонний тест (two-sided)</span>
          </label>
          <SelectField
            label="VARIANCE REDUCTION"
            value={adv.variance_reduction ?? ''}
            options={VARIANCE_OPTIONS}
            onChange={(v) => set('variance_reduction', v || null)}
          />
          <TextField
            label="СТРАТИФИКАЦИЯ ПО"
            value={adv.stratification_by ?? ''}
            onChange={(v) => set('stratification_by', v || null)}
            placeholder="напр. geo"
          />
          <NumField
            label="HOLDBACK %"
            value={adv.holdback_percent ?? ''}
            onChange={(v) => set('holdback_percent', v)}
            step="1"
            placeholder="—"
          />
        </div>
      )}
    </section>
  )
}

function NumField({ label, value, onChange, step, placeholder }) {
  return (
    <label className="block">
      <span className="mono-label text-fg-faint block mb-1.5">{label}</span>
      <input
        type="number"
        step={step ?? 'any'}
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? null : Number(e.target.value))
        }
        placeholder={placeholder}
        className="w-full bg-bg-elev-2 border border-border rounded px-2.5 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
      />
    </label>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mono-label text-fg-faint block mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-elev-2 border border-border rounded px-2.5 py-2 text-sm text-fg focus:outline-none focus:border-accent cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mono-label text-fg-faint block mb-1.5">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-elev-2 border border-border rounded px-2.5 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
      />
    </label>
  )
}
