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

  // F-7/D-4 — significant is computed-only (no state). Prefer the notebook's
  // own verdict; fall back to p < alpha for the manual flow.
  const alpha = state.brief?.advanced?.alpha ?? 0.05
  const sig =
    typeof eff.significant === 'boolean'
      ? eff.significant
      : eff.p_value != null && Number.isFinite(Number(eff.p_value))
        ? Number(eff.p_value) < alpha
        : null
  const novelty = eff.novelty_flag

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
    <div className="space-y-4">
      {sig !== null && (
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium ${
            sig
              ? 'bg-green-900/30 text-green-400'
              : 'bg-yellow-900/30 text-yellow-400'
          }`}
        >
          {sig ? '✅ Statistically significant' : '⚠ Not significant'}
          {eff.p_value != null && (
            <span className="opacity-80">(p = {Number(eff.p_value).toFixed(4)})</span>
          )}
        </div>
      )}

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
      </div>

      <div>
        <div className="mono-label text-fg-faint mb-1">NOVELTY</div>
        <div
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
            novelty === true
              ? 'bg-yellow-900/30 text-yellow-400'
              : novelty === false
                ? 'bg-green-900/30 text-green-400'
                : 'bg-bg-elev-2 text-fg-dim'
          }`}
        >
          {novelty === true
            ? '⚠ Novelty: suspected'
            : novelty === false
              ? '✓ Novelty: not detected'
              : 'N/A — нет данных'}
        </div>
        <details className="mt-1">
          <summary className="text-xs text-fg-dim cursor-pointer">override</summary>
          <label className="flex items-center gap-2 mt-1 text-xs text-fg-dim">
            <input
              type="checkbox"
              checked={novelty === true}
              onChange={(e) => setNoveltyFlag(e.target.checked)}
              className="accent-accent"
            />
            эффект новизны замечен
          </label>
        </details>
      </div>
    </div>
  )
}
