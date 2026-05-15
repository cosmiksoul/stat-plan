import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

export default function StopAndDecisionRules() {
  const { state, dispatch } = useAppState()
  const { stop_conditions: stop, decision_rules: rules } = state.brief

  function patchStop(p) {
    dispatch({
      type: Actions.ANSWER_QUESTION,
      field: 'stop_conditions',
      value: { ...stop, ...p },
    })
  }

  function patchRules(p) {
    dispatch({
      type: Actions.ANSWER_QUESTION,
      field: 'decision_rules',
      value: { ...rules, ...p },
    })
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mono-label text-fg-faint mb-3">STOP CONDITIONS</div>
        <div className="space-y-2.5">
          <Checkbox
            label="SRM detected (chi² p < 0.001)"
            checked={stop.srm_detected}
            onChange={(v) => patchStop({ srm_detected: v })}
          />
          <Checkbox
            label="Guardrail breach > 24h"
            checked={stop.guardrail_breach_24h}
            onChange={(v) => patchStop({ guardrail_breach_24h: v })}
          />
          <div className="flex items-center gap-3">
            <Checkbox
              label="Length cap:"
              checked={stop.length_cap_days != null}
              onChange={(v) =>
                patchStop({ length_cap_days: v ? 10 : null })
              }
            />
            <input
              type="number"
              min="1"
              step="1"
              value={stop.length_cap_days ?? ''}
              onChange={(e) =>
                patchStop({
                  length_cap_days:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="10"
              disabled={stop.length_cap_days == null}
              className="w-20 bg-bg-elev border border-border rounded px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent disabled:opacity-40"
            />
            <span className="text-xs text-fg-faint">дней</span>
          </div>
          <Checkbox
            label="Manual stop (опционально)"
            checked={stop.manual_stop}
            onChange={(v) => patchStop({ manual_stop: v })}
          />
        </div>
      </section>

      <section>
        <div className="mono-label text-fg-faint mb-3">DECISION RULES</div>
        <div className="space-y-3">
          <RuleField
            label="SHIP"
            value={rules.ship}
            onChange={(v) => patchRules({ ship: v })}
            accent="text-ok"
          />
          <RuleField
            label="ITERATE"
            value={rules.iterate}
            onChange={(v) => patchRules({ iterate: v })}
            accent="text-warn"
          />
          <RuleField
            label="KILL"
            value={rules.kill}
            onChange={(v) => patchRules({ kill: v })}
            accent="text-danger"
          />
        </div>
      </section>
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-fg-dim cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-accent cursor-pointer"
      />
      <span>{label}</span>
    </label>
  )
}

function RuleField({ label, value, onChange, accent }) {
  return (
    <div>
      <div className={`mono-label ${accent} mb-1.5`}>{label}</div>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full bg-bg-elev border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors resize-y leading-relaxed"
      />
    </div>
  )
}
