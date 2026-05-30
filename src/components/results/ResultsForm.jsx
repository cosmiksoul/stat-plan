import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import { effectiveResults } from '../../lib/results/effective.js'

// Sprint 7 S4 — controlled inputs for the 8 quantitative fields. Pre-fills
// from raw_results (ipynb) and falls back to user_overrides. Every change
// dispatches SET_RESULTS_FIELD so the override layer always wins.

const FIELDS = [
  { id: 'control_n', label: 'n control', type: 'int', placeholder: '5000' },
  { id: 'treatment_n', label: 'n treatment', type: 'int', placeholder: '5000' },
  { id: 'delta_rel', label: 'Δ rel (%)', type: 'float', placeholder: '2.3' },
  { id: 'p_value', label: 'p-value', type: 'float', placeholder: '0.012' },
  { id: 'ci_lower', label: 'CI lower', type: 'float', placeholder: '0.005' },
  { id: 'ci_upper', label: 'CI upper', type: 'float', placeholder: '0.041' },
  { id: 'srm_pvalue', label: 'SRM p-value', type: 'float', placeholder: '0.83', optional: true },
]

function NumInput({ field, value, onChange }) {
  return (
    <input
      type="number"
      step={field.type === 'int' ? 1 : 'any'}
      value={value ?? ''}
      placeholder={field.placeholder}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') {
          onChange(undefined)
          return
        }
        const num = field.type === 'int' ? parseInt(raw, 10) : parseFloat(raw)
        onChange(Number.isFinite(num) ? num : undefined)
      }}
      className="w-full bg-bg-elev-2 border border-border rounded px-2.5 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
    />
  )
}

export default function ResultsForm() {
  const { state, dispatch } = useAppState()
  const results = state.results
  const eff = effectiveResults(results)

  function set(field, value) {
    dispatch({ type: Actions.SET_RESULTS_FIELD, field, value })
  }

  function setNoveltyFlag(checked) {
    dispatch({
      type: Actions.SET_RESULTS_FIELD,
      field: 'novelty_flag',
      value: checked,
    })
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {FIELDS.map((f) => (
        <label key={f.id} className="block">
          <div className="mono-label text-fg-faint mb-1">{f.label.toUpperCase()}</div>
          <NumInput
            field={f}
            value={eff[f.id]}
            onChange={(v) => set(f.id, v)}
          />
        </label>
      ))}
      <label className="block col-span-2 md:col-span-1 self-end">
        <div className="mono-label text-fg-faint mb-1">NOVELTY?</div>
        <div className="flex items-center gap-2 h-[34px]">
          <input
            type="checkbox"
            checked={eff.novelty_flag === true}
            onChange={(e) => setNoveltyFlag(e.target.checked)}
            className="accent-accent"
          />
          <span className="text-xs text-fg-dim">эффект новизны замечен</span>
        </div>
      </label>
    </div>
  )
}
