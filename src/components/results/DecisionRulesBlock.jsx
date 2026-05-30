import { useMemo } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import {
  evaluateAllRules,
  recommendNextStep,
} from '../../lib/results/decision-rules.js'
import { effectiveResults } from '../../lib/results/effective.js'

function fired(rule, userVal) {
  return userVal == null ? rule.auto_eval : userVal
}

export default function DecisionRulesBlock() {
  const { state, dispatch } = useAppState()
  const eff = effectiveResults(state.results)
  const userChecks = state.results.user_checks || {}
  const userDecision = state.results.user_decision

  const rules = useMemo(
    () => evaluateAllRules(state.brief.decision_rules, eff),
    [state.brief.decision_rules, eff],
  )
  const recommendation = useMemo(
    () => recommendNextStep(rules, userChecks),
    [rules, userChecks],
  )

  function toggle(field, checked) {
    dispatch({ type: Actions.TOGGLE_RULE_CHECK, field, value: checked })
  }

  function setDecision(e) {
    dispatch({ type: Actions.SET_USER_DECISION, decision: e.target.value || null })
  }

  const nonEmpty = rules.filter((r) => !r.empty)

  return (
    <div className="space-y-3">
      {nonEmpty.length === 0 ? (
        <p className="text-sm text-fg-faint">
          Decision rules не заполнены в брифе (Q10). Recommended next step
          сформировать не получится — заполни решение вручную ниже.
        </p>
      ) : (
        <ul className="space-y-2 m-0 p-0 list-none">
          {nonEmpty.map((r) => {
            const userVal = userChecks[r.field]
            const eff = fired(r, userVal)
            return (
              <li
                key={r.field}
                className="flex items-start gap-3 border border-border rounded px-3 py-2 bg-bg-elev"
              >
                <input
                  type="checkbox"
                  checked={eff === true}
                  onChange={(e) => toggle(r.field, e.target.checked)}
                  className="accent-accent mt-1"
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    <span className="mono-label text-accent">{r.action}</span>
                    <span className="ml-2 text-fg-dim">{r.raw}</span>
                  </div>
                  <div className="text-xs text-fg-faint mt-0.5">
                    {r.parsed ? (
                      <>
                        auto:{' '}
                        {r.auto_eval === true ? (
                          <span className="text-ok">сработало ✓</span>
                        ) : r.auto_eval === false ? (
                          <span className="text-fg-dim">не сработало</span>
                        ) : (
                          <span className="text-fg-faint">не оценено (нет данных)</span>
                        )}
                      </>
                    ) : (
                      <span className="text-fg-faint">
                        не распознано как условие — отметь вручную
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="text-sm bg-bg-elev-2 border border-border rounded px-3 py-2">
        <span className="mono-label text-fg-faint mr-2">RECOMMENDED:</span>
        <span className="text-fg">{recommendation}</span>
      </div>

      <label className="block">
        <div className="mono-label text-fg-faint mb-1">ПРИНЯТОЕ РЕШЕНИЕ (вручную)</div>
        <select
          value={userDecision || ''}
          onChange={setDecision}
          className="bg-bg-elev-2 border border-border rounded px-2.5 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
        >
          <option value="">— не выбрано —</option>
          <option value="SHIP">SHIP</option>
          <option value="ITERATE">ITERATE</option>
          <option value="KILL">KILL</option>
        </select>
      </label>
    </div>
  )
}
